import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    // Check authorization
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Check if the user is an admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true }
    });
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "Only admins can access analytics" },
        { status: 403 }
      );
    }

    // Get the first day of the current month and 30 days ago date
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    // Fetch all the stats in a single transaction for better performance
    const [
      totalUsers,
      newUsersThisMonth,
      activeUsers,
      totalRoadmaps,
      totalCompletedRoadmaps,
      completedRoadmapsThisMonth,
      totalTopics,
      totalUserTopics,
      inProgressTopics,
      completedTopics,
      completedTopicsThisMonth,
      totalContent,
      newContentThisMonth
    ] = await prisma.$transaction([
      // Total users
      prisma.user.count(),
      
      // New users this month
      prisma.user.count({
        where: {
          createdAt: {
            gte: firstDayOfMonth
          }
        }
      }),
      
      // Active users (users who synced in the last 30 days)
      prisma.user.count({
        where: {
          lastSyncedAt: {
            gte: thirtyDaysAgo
          }
        }
      }),
      
      // Total roadmaps
      prisma.roadmap.count(),
      
      // Total completed roadmaps (all time)
      prisma.userRoadmap.count({
        where: {
          completed: true
        }
      }),
      
      // Completed roadmaps this month
      prisma.userRoadmap.count({
        where: {
          completed: true,
          completedAt: {
            gte: firstDayOfMonth
          }
        }
      }),
      
      // Total topics
      prisma.topic.count(),
      
      // Total user topics (all UserTopicCompletion records)
      prisma.userTopicCompletion.count(),
      
      // In progress topics
      prisma.userTopicCompletion.count({
        where: {
          status: 'in_progress'
        }
      }),
      
      // Completed topics (all time)
      prisma.userTopicCompletion.count({
        where: {
          status: 'completed'
        }
      }),
      
      // Completed topics this month
      prisma.userTopicCompletion.count({
        where: {
          status: 'completed',
          lastUpdated: {
            gte: firstDayOfMonth
          }
        }
      }),
      
      // Total content
      prisma.content.count(),
      
      // New content this month
      prisma.content.count({
        where: {
          createdAt: {
            gte: firstDayOfMonth
          }
        }
      })
    ]);

    // Calculate percentages
    // Calculate percentage of new users this month
    const newUsersPercentage = totalUsers > 0 
      ? Math.round((newUsersThisMonth / totalUsers) * 100) 
      : 0;
      
    // Calculate percentage of active users
    const activeUsersPercentage = totalUsers > 0
      ? Math.round((activeUsers / totalUsers) * 100)
      : 0;

    // Calculate percentage of completed roadmaps this month relative to total
    const completedRoadmapsPercentage = totalRoadmaps > 0 
      ? Math.round((completedRoadmapsThisMonth / totalRoadmaps) * 100) 
      : 0;
      
    // Calculate total completion percentage for roadmaps
    const totalCompletionRoadmapsPercentage = totalRoadmaps > 0
      ? Math.round((totalCompletedRoadmaps / totalRoadmaps) * 100)
      : 0;

    // Calculate completion percentage for topics
    const completionPercentage = totalUserTopics > 0
      ? Math.round((completedTopics / totalUserTopics) * 100)
      : 0;
      
    // Calculate completion percentage for topics this month
    const completedTopicsThisMonthPercentage = totalUserTopics > 0
      ? Math.round((completedTopicsThisMonth / totalUserTopics) * 100)
      : 0;

    // Calculate percentage of new content this month
    const newContentPercentage = totalContent > 0
      ? Math.round((newContentThisMonth / totalContent) * 100)
      : 0;

    // Return all data
    return NextResponse.json({
      users: {
        total: totalUsers,
        newThisMonth: newUsersThisMonth,
        newPercentage: newUsersPercentage,
        activeUsers: activeUsers,
        activePercentage: activeUsersPercentage
      },
      roadmaps: {
        total: totalRoadmaps,
        completedThisMonth: completedRoadmapsThisMonth,
        completedPercentage: completedRoadmapsPercentage,
        totalCompleted: totalCompletedRoadmaps,
        totalCompletionPercentage: totalCompletionRoadmapsPercentage
      },
      topics: {
        total: totalTopics,
        totalUserTopics: totalUserTopics,
        inProgress: inProgressTopics,
        completed: completedTopics,
        completionPercentage: completionPercentage,
        completedThisMonth: completedTopicsThisMonth,
        completedThisMonthPercentage: completedTopicsThisMonthPercentage
      },
      content: {
        total: totalContent,
        newThisMonth: newContentThisMonth,
        newPercentage: newContentPercentage
      }
    });
  } catch (error) {
    console.error("Error fetching admin analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
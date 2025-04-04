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
        { error: "Only admins can access roadmap analytics" },
        { status: 403 }
      );
    }

    // Get current date and calculate dates for the last 12 months
    const now = new Date();
    const monthsToShow = 12;
    const months = [];
    
    // Generate array of month start dates for the last 12 months
    for (let i = 0; i < monthsToShow; i++) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.unshift(month); // Add to beginning of array to get chronological order
    }
    
    // Calculate next month date to get ranges
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    months.push(nextMonth);
    
    // Prepare data structure for monthly roadmap completion
    const monthlyCompletionData = [];
    
    // For each month, get the roadmap completion data
    for (let i = 0; i < months.length - 1; i++) {
      const startDate = months[i];
      const endDate = months[i + 1];
      
      const completedInMonth = await prisma.userRoadmap.count({
        where: {
          completed: true,
          completedAt: {
            gte: startDate,
            lt: endDate
          }
        }
      });
      
      // Format the date as YYYY-MM
      const monthLabel = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
      
      monthlyCompletionData.push({
        month: monthLabel,
        completedRoadmaps: completedInMonth
      });
    }
    
    // Get overall roadmap statistics
    const [
      totalRoadmaps,
      totalUserRoadmaps,
      totalCompletedUserRoadmaps
    ] = await prisma.$transaction([
      // Total roadmaps
      prisma.roadmap.count(),
      
      // Total user roadmaps
      prisma.userRoadmap.count(),
      
      // Total completed user roadmaps
      prisma.userRoadmap.count({
        where: {
          completed: true
        }
      })
    ]);
    
    // Since we don't have updatedAt field, we'll estimate in-progress vs abandoned
    // by looking at completedAt (null means not completed yet)
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    // Calculate in-progress and abandoned based on completion date or start date
    const [inProgressUserRoadmaps, abandonedUserRoadmaps] = await prisma.$transaction([
      // "In progress" - started in the last 30 days and not completed
      prisma.userRoadmap.count({
        where: {
          completed: false,
          startedAt: {
            gte: thirtyDaysAgo
          }
        }
      }),
      
      // "Abandoned" - started more than 30 days ago and not completed
      prisma.userRoadmap.count({
        where: {
          completed: false,
          startedAt: {
            lt: thirtyDaysAgo
          }
        }
      })
    ]);
    
    // Calculate the most popular roadmaps
    const popularRoadmaps = await prisma.roadmap.findMany({
      select: {
        id: true,
        title: true,
        _count: {
          select: {
            userRoadmaps: true
          }
        }
      },
      orderBy: {
        userRoadmaps: {
          _count: 'desc'
        }
      },
      take: 5
    });
    
    // Calculate completion rate by roadmap
    const roadmapCompletionRates = await prisma.roadmap.findMany({
      select: {
        id: true,
        title: true,
        userRoadmaps: {
          select: {
            completed: true
          }
        },
        _count: {
          select: {
            userRoadmaps: true
          }
        }
      },
      where: {
        userRoadmaps: {
          some: {}
        }
      },
      orderBy: {
        userRoadmaps: {
          _count: 'desc'
        }
      },
      take: 10
    });
    
    // Calculate completion percentage for each roadmap
    const completionRates = roadmapCompletionRates.map(roadmap => {
      const totalEnrollments = roadmap._count.userRoadmaps;
      const completedCount = roadmap.userRoadmaps.filter(ur => ur.completed).length;
      const completionRate = totalEnrollments > 0 
        ? (completedCount / totalEnrollments) * 100 
        : 0;
        
      return {
        id: roadmap.id,
        title: roadmap.title,
        totalEnrollments,
        completedCount,
        completionRate: Math.round(completionRate)
      };
    });
    
    // Sort by completion rate descending
    completionRates.sort((a, b) => b.completionRate - a.completionRate);
    
    // Return all data
    return NextResponse.json({
      monthlyCompletionData,
      overall: {
        totalRoadmaps,
        totalUserRoadmaps,
        totalCompletedUserRoadmaps,
        abandonedUserRoadmaps,
        inProgressUserRoadmaps,
        completionRate: totalUserRoadmaps > 0 
          ? Math.round((totalCompletedUserRoadmaps / totalUserRoadmaps) * 100) 
          : 0
      },
      popularRoadmaps: popularRoadmaps.map(roadmap => ({
        id: roadmap.id,
        title: roadmap.title,
        enrollments: roadmap._count.userRoadmaps
      })),
      completionRates
    });
  } catch (error) {
    console.error("Error fetching roadmap analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch roadmap analytics" },
      { status: 500 }
    );
  }
}
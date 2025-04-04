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
        { error: "Only admins can access topic analytics" },
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
    
    // Prepare data structure for monthly topic completion
    const monthlyCompletionData = [];
    
    // For each month, get the topic completion data
    for (let i = 0; i < months.length - 1; i++) {
      const startDate = months[i];
      const endDate = months[i + 1];
      
      const completedInMonth = await prisma.userTopicCompletion.count({
        where: {
          status: 'completed',
          lastUpdated: {
            gte: startDate,
            lt: endDate
          }
        }
      });
      
      const startedInMonth = await prisma.userTopicCompletion.count({
        where: {
          lastUpdated: {
            gte: startDate,
            lt: endDate
          }
        }
      });
      
      // Format the date as YYYY-MM
      const monthLabel = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
      
      monthlyCompletionData.push({
        month: monthLabel,
        completedTopics: completedInMonth,
        startedTopics: startedInMonth - completedInMonth // Only those started but not completed
      });
    }
    
    // Get overall topic statistics
    const [
      totalTopics,
      totalAssignedTopics,
      topicsInProgress,
      topicsCompleted,
      skippedTopics
    ] = await prisma.$transaction([
      // Total topics
      prisma.topic.count(),
      
      // Total assigned topics (all UserTopicCompletion records)
      prisma.userTopicCompletion.count(),
      
      // Topics in progress
      prisma.userTopicCompletion.count({
        where: {
          status: 'in_progress'
        }
      }),
      
      // Topics completed
      prisma.userTopicCompletion.count({
        where: {
          status: 'completed'
        }
      }),
      
      // Topics skipped
      prisma.userRoadmapTopic.count({
        where: {
          isSkipped: true
        }
      })
    ]);
    
    // Get topics by popularity (most assigned)
    const popularTopics = await prisma.topic.findMany({
      select: {
        id: true,
        title: true,
        _count: {
          select: {
            UserTopicCompletion: true
          }
        }
      },
      orderBy: {
        UserTopicCompletion: {
          _count: 'desc'
        }
      },
      take: 5
    });
    
    // Get topics by completion rate
    const topicCompletionRates = await prisma.topic.findMany({
      select: {
        id: true,
        title: true,
        UserTopicCompletion: {
          select: {
            status: true
          },
          where: {
            status: {
              in: ['completed', 'in_progress']
            }
          }
        },
        _count: {
          select: {
            UserTopicCompletion: true
          }
        }
      },
      where: {
        UserTopicCompletion: {
          some: {}
        }
      },
      orderBy: {
        UserTopicCompletion: {
          _count: 'desc'
        }
      },
      take: 10
    });
    
    // Calculate completion percentage for each topic
    const completionRates = topicCompletionRates.map(topic => {
      const totalAssignments = topic._count.UserTopicCompletion;
      const completedCount = topic.UserTopicCompletion.filter(ut => ut.status === 'completed').length;
      const completionRate = totalAssignments > 0 
        ? (completedCount / totalAssignments) * 100 
        : 0;
        
      return {
        id: topic.id,
        title: topic.title,
        totalAssignments,
        completedCount,
        completionRate: Math.round(completionRate)
      };
    });
    
    // Sort by completion rate descending
    completionRates.sort((a, b) => b.completionRate - a.completionRate);
    
    // Get topic difficulty data
    const difficultTopics = await prisma.topic.findMany({
      select: {
        id: true,
        title: true,
        averageCompletionTime: true,
        UserTopicCompletion: {
          select: {
            difficultyRating: true,
            timeSpent: true
          },
          where: {
            difficultyRating: {
              not: null
            }
          }
        }
      },
      where: {
        UserTopicCompletion: {
          some: {
            difficultyRating: {
              not: null
            }
          }
        }
      },
      take: 10
    });
    
    // Calculate average difficulty for each topic
    const difficultyRatings = difficultTopics.map(topic => {
      const ratings = topic.UserTopicCompletion
        .filter(utc => utc.difficultyRating !== null)
        .map(utc => utc.difficultyRating || 0);
      
      const avgDifficulty = ratings.length > 0
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        : 0;
        
      const times = topic.UserTopicCompletion
        .filter(utc => utc.timeSpent !== null)
        .map(utc => utc.timeSpent || 0);
      
      const avgTime = times.length > 0
        ? times.reduce((sum, time) => sum + time, 0) / times.length
        : 0;
      
      return {
        id: topic.id,
        title: topic.title,
        averageDifficulty: Math.round(avgDifficulty * 10) / 10,
        averageTimeSpent: Math.round(avgTime),
        averageCompletionTime: topic.averageCompletionTime
      };
    });
    
    // Sort by average difficulty descending
    difficultyRatings.sort((a, b) => b.averageDifficulty - a.averageDifficulty);
    
    // Return all data
    return NextResponse.json({
      monthlyCompletionData,
      overall: {
        totalTopics,
        totalAssignedTopics,
        topicsInProgress,
        topicsCompleted,
        skippedTopics,
        completionRate: totalAssignedTopics > 0 
          ? Math.round((topicsCompleted / totalAssignedTopics) * 100) 
          : 0
      },
      popularTopics: popularTopics.map(topic => ({
        id: topic.id,
        title: topic.title,
        assignments: topic._count.UserTopicCompletion
      })),
      completionRates,
      difficultyRatings
    });
  } catch (error) {
    console.error("Error fetching topic analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch topic analytics" },
      { status: 500 }
    );
  }
}
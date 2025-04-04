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
        { error: "Only admins can access content analytics" },
        { status: 403 }
      );
    }

    // Get the first day of the current month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get overall content statistics
    const [
      totalContent,
      newContentThisMonth,
      pendingSuggestions
    ] = await prisma.$transaction([
      // Total content
      prisma.content.count(),
      
      // New content this month
      prisma.content.count({
        where: {
          createdAt: {
            gte: firstDayOfMonth
          }
        }
      }),
      
      // Pending content suggestions
      prisma.userContentSuggestion.count()
    ]);
    
    // Get content by type (video, article, etc.)
    const contentByType = await prisma.content.groupBy({
      by: ['type'],
      _count: {
        id: true
      }
    });
    
    // Format content by type for chart
    const typeDistribution = contentByType.map(item => ({
      type: item.type,
      count: item._count.id
    }));
    
    // Get topics with least amount of content
    const topicsWithContentCounts = await prisma.topic.findMany({
      select: {
        id: true,
        title: true,
        createdAt: true,
        _count: {
          select: {
            contents: true,
            UserContentSuggestion: true
          }
        }
      },
      orderBy: [
        {
          contents: {
            _count: 'asc'
          }
        }
      ],
      take: 10
    });
    
    // Get the top 5 topics with least content, sorted by creation date (oldest first)
    const topicsNeedingContent = topicsWithContentCounts
      .sort((a, b) => {
        // First sort by content count (ascending)
        if (a._count.contents !== b._count.contents) {
          return a._count.contents - b._count.contents;
        }
        // Then by creation date (oldest first)
        return a.createdAt.getTime() - b.createdAt.getTime();
      })
      .slice(0, 5)
      .map(topic => ({
        id: topic.id,
        title: topic.title,
        contentCount: topic._count.contents,
        suggestionCount: topic._count.UserContentSuggestion,
        createdAt: topic.createdAt,
        // Add "urgent" flag for topics older than 30 days with less than 3 content items
        urgent: topic.createdAt < new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) && 
                topic._count.contents < 3
      }));
    
    // Get monthly content addition trends
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
    
    // Prepare data structure for monthly content addition
    const monthlyContentData = [];
    
    // For each month, get the content addition data
    for (let i = 0; i < months.length - 1; i++) {
      const startDate = months[i];
      const endDate = months[i + 1];
      
      const contentAddedInMonth = await prisma.content.count({
        where: {
          createdAt: {
            gte: startDate,
            lt: endDate
          }
        }
      });
      
      const suggestionsAddedInMonth = await prisma.userContentSuggestion.count({
        where: {
          url: {
            not: {
              in: (await prisma.content.findMany({
                select: { url: true }
              })).map(c => c.url)
            }
          }
        }
      });
      
      // Format the date as YYYY-MM
      const monthLabel = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
      
      monthlyContentData.push({
        month: monthLabel,
        newContent: contentAddedInMonth,
        pendingSuggestions: suggestionsAddedInMonth
      });
    }
    
    // Get top content suggestions by vote count
    const topSuggestions = await prisma.userContentSuggestion.findMany({
      select: {
        id: true,
        title: true,
        type: true,
        url: true,
        amount: true,
        topic: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        amount: 'desc'
      },
      take: 10
    });
    
    // Return all data
    return NextResponse.json({
      overall: {
        totalContent,
        newContentThisMonth,
        pendingSuggestions
      },
      typeDistribution,
      topicsNeedingContent,
      monthlyContentData,
      topSuggestions
    });
  } catch (error) {
    console.error("Error fetching content analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch content analytics" },
      { status: 500 }
    );
  }
}
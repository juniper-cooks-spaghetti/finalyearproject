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
        { error: "Only admins can access user analytics" },
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
    
    // Prepare data structure for monthly user growth
    const growthData = [];
    
    // For each month, get the cumulative user count and active users
    for (let i = 0; i < months.length - 1; i++) {
      const startDate = months[i];
      const endDate = months[i + 1];
      
      const [totalUsers, activeUsers] = await prisma.$transaction([
        // Total registered users up to the end of this month
        prisma.user.count({
          where: {
            createdAt: {
              lt: endDate
            }
          }
        }),
        
        // Active users during this month (based on lastSyncedAt)
        prisma.user.count({
          where: {
            lastSyncedAt: {
              gte: startDate,
              lt: endDate
            }
          }
        })
      ]);
      
      // Format the date as YYYY-MM
      const monthLabel = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
      
      growthData.push({
        month: monthLabel,
        totalUsers,
        activeUsers
      });
    }
    
    // Get most recent 30-day active users
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    const thirtyDayActiveUsers = await prisma.user.count({
      where: {
        lastSyncedAt: {
          gte: thirtyDaysAgo
        }
      }
    });
    
    // Get most recent 7-day active users
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    
    const sevenDayActiveUsers = await prisma.user.count({
      where: {
        lastSyncedAt: {
          gte: sevenDaysAgo
        }
      }
    });
    
    // Return all data
    return NextResponse.json({
      growthData,
      activeUsers: {
        last7Days: sevenDayActiveUsers,
        last30Days: thirtyDayActiveUsers
      }
    });
  } catch (error) {
    console.error("Error fetching user analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch user analytics" },
      { status: 500 }
    );
  }
}
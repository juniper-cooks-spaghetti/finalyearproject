"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function searchTopics(
  query: string,
  roadmapId: string, 
  limit: number = 5
) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Get database user ID
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true }
    });
    
    if (!dbUser) throw new Error("User not found");
    
    // Get the user's roadmap for this specific roadmap
    const userRoadmap = await prisma.userRoadmap.findFirst({
      where: {
        userId: dbUser.id,
        roadmapId: roadmapId
      },
      select: {
        id: true
      }
    });
    
    if (!userRoadmap) {
      return {
        success: false,
        error: "User roadmap not found"
      };
    }
    
    // Get topics already in the user's roadmap
    const existingTopics = await prisma.userRoadmapTopic.findMany({
      where: {
        userRoadmapId: userRoadmap.id
      },
      select: {
        topicId: true
      }
    });

    const existingTopicIds = existingTopics.map(t => t.topicId);

    // Search for ALL topics that:
    // 1. Are not already in the user's roadmap (existingTopicIds)
    // 2. Match the search query
    const topics = await prisma.topic.findMany({
      where: {
        AND: [
          // Must not already be in the user's roadmap
          {
            id: {
              notIn: existingTopicIds
            }
          },
          // Must match the search query
          {
            OR: [
              {
                title: {
                  contains: query,
                  mode: 'insensitive'
                }
              },
              {
                description: {
                  contains: query,
                  mode: 'insensitive'
                }
              }
            ]
          }
        ]
      },
      include: {
        contents: {
          include: {
            content: {
              select: {
                id: true,
                title: true,
                description: true,
                type: true,
                url: true
              }
            }
          }
        }
      },
      orderBy: {
        title: 'asc'
      },
      take: limit
    });

    // Add debugging logs
    console.log(`Search results for "${query}" in roadmap ${roadmapId}:`, {
      userRoadmapId: userRoadmap.id,
      existingTopicsCount: existingTopicIds.length,
      matchingTopicsCount: topics.length,
    });

    return {
      success: true,
      topics
    };
  } catch (error) {
    console.error("Error searching topics:", error);
    return {
      success: false,
      error: "Failed to search topics"
    };
  }
}

export async function searchRoadmaps(
  query: string,
  limit: number = 5
) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    if (!dbUser) throw new Error("User not found");

    // Get existing roadmaps assigned to user
    const existingRoadmaps = await prisma.userRoadmap.findMany({
      where: {
        userId: dbUser.id
      },
      select: {
        roadmapId: true
      }
    });

    const existingRoadmapIds = existingRoadmaps.map(r => r.roadmapId);

    // Search roadmaps with case-insensitive matching on title and category
    const roadmaps = await prisma.roadmap.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                title: {
                  contains: query,
                  mode: 'insensitive'
                }
              },
              {
                category: {
                  contains: query,
                  mode: 'insensitive'
                }
              }
            ]
          },
          {
            id: {
              notIn: existingRoadmapIds
            }
          }
        ]
      },
      include: {
        topics: true
      },
      orderBy: [
        { category: 'asc' },
        { title: 'asc' }
      ],
      take: limit
    });

    return {
      success: true,
      roadmaps: roadmaps.map(roadmap => ({
        id: roadmap.id,
        title: roadmap.title,
        description: roadmap.description,
        category: roadmap.category,
        topicCount: roadmap.topics.length,
        createdAt: roadmap.createdAt.toISOString() // Convert Date to string
      }))
    };
  } catch (error) {
    console.error("Error searching roadmaps:", error);
    return {
      success: false,
      error: "Failed to search roadmaps"
    };
  }
}
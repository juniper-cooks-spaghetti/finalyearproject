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

    // Get existing topics in the user's roadmap
    const existingTopics = await prisma.userRoadmapTopic.findMany({
      where: {
        userRoadmap: {
          roadmapId
        }
      },
      select: {
        topicId: true
      }
    });

    const existingTopicIds = existingTopics.map(t => t.topicId);

    // Search topics with case-insensitive matching
    const topics = await prisma.topic.findMany({
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
                description: {
                  contains: query,
                  mode: 'insensitive'
                }
              }
            ]
          },
          {
            id: {
              notIn: existingTopicIds
            }
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
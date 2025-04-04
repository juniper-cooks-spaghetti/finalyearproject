"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function getTopicRecommendations(currentTopicId: string | null, roadmapId: string) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    
    // Get the database user ID from clerk ID
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true }
    });
    
    if (!dbUser) {
      throw new Error("User not found");
    }

    // Get topics that exist in the base roadmap
    const roadmapTopics = await prisma.roadmapTopic.findMany({
      where: { roadmapId },
      select: { topicId: true }
    });
    const roadmapTopicIds = roadmapTopics.map(t => t.topicId);

    // Get user's roadmap ID
    const userRoadmap = await prisma.userRoadmap.findFirst({
      where: {
        userId: dbUser.id,
        roadmapId
      },
      select: { id: true }
    });
    
    if (!userRoadmap) {
      return [];
    }
    
    // Get topics already in user's roadmap - WITH USER FILTER
    const existingTopics = await prisma.userRoadmapTopic.findMany({
      where: {
        userRoadmapId: userRoadmap.id
      },
      select: {
        topicId: true
      }
    });
    const existingTopicIds = existingTopics.map(t => t.topicId);

    // If no currentTopicId (empty roadmap), get initial recommendations
    if (!currentTopicId) {
      const initialRecommendations = await prisma.topicRecommendation.findMany({
        where: {
          beforeTopicId: null,
          roadmapId,
          afterTopicId: {
            in: roadmapTopicIds,
            notIn: existingTopicIds
          }
        },
        include: {
          afterTopic: {
            include: {
              contents: {
                include: {
                  content: {
                    select: {
                      id: true,
                      title: true,
                      description: true,
                      type: true,
                      url: true,
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: [
          { weight: 'desc' },
          { transitionCount: 'desc' }
        ],
        take: 5
      });
      
      // Add fallback logic for empty recommendations
      if (initialRecommendations.length === 0) {
        const availableTopics = await prisma.topic.findMany({
          where: {
            id: {
              in: roadmapTopicIds,
              notIn: existingTopicIds
            }
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
                    url: true,
                  }
                }
              }
            }
          },
          take: 5
        });
        
        return availableTopics.map(topic => ({
          id: `fallback-${topic.id}`,
          weight: 0.5,
          transitionCount: 0,
          lastTransitionAt: new Date(),
          afterTopic: topic,
          afterTopicId: topic.id,
          roadmapId
        }));
      }
      
      return initialRecommendations;
    }

    // Recommendations when there's a current topic
    const recommendations = await prisma.topicRecommendation.findMany({
      where: {
        beforeTopicId: currentTopicId,
        roadmapId,
        afterTopicId: {
          in: roadmapTopicIds,
          notIn: existingTopicIds
        }
      },
      include: {
        afterTopic: {
          include: {
            contents: {
              include: {
                content: {
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    type: true,
                    url: true,
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [
        { weight: 'desc' },
        { transitionCount: 'desc' }
      ],
      take: 5
    });
    
    // Add fallback recommendations if none found
    if (recommendations.length === 0) {
      // Get any remaining topics from the roadmap that aren't in the user's roadmap
      const availableTopics = await prisma.topic.findMany({
        where: {
          id: {
            in: roadmapTopicIds,
            notIn: existingTopicIds
          }
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
                  url: true,
                }
              }
            }
          }
        },
        take: 5
      });
      
      return availableTopics.map(topic => ({
        id: `fallback-${topic.id}`,
        weight: 0.5,
        transitionCount: 0,
        lastTransitionAt: new Date(),
        afterTopic: topic,
        afterTopicId: topic.id,
        roadmapId
      }));
    }

    return recommendations;
  } catch (error) {
    console.error("Error getting recommendations:", error);
    throw error;
  }
}

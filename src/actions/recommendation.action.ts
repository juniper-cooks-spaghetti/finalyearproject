"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function getTopicRecommendations(currentTopicId: string | null, roadmapId: string) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Get topics that exist in the base roadmap
    const roadmapTopics = await prisma.roadmapTopic.findMany({
      where: { roadmapId },
      select: { topicId: true }
    });
    const roadmapTopicIds = roadmapTopics.map(t => t.topicId);

    // Get topics already in user's roadmap
    const existingTopics = await prisma.userRoadmapTopic.findMany({
      where: {
        userRoadmap: {
          roadmapId: roadmapId
        }
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
            in: roadmapTopicIds,    // Must be in base roadmap
            notIn: existingTopicIds // Not already in user's roadmap
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

      return initialRecommendations;
    }

    // Recommendations when there's a current topic
    const recommendations = await prisma.topicRecommendation.findMany({
      where: {
        beforeTopicId: currentTopicId,
        roadmapId,
        afterTopicId: {
          in: roadmapTopicIds,    // Must be in base roadmap
          notIn: existingTopicIds // Not already in user's roadmap
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

    return recommendations;
  } catch (error) {
    console.error("Error getting recommendations:", error);
    throw error;
  }
}

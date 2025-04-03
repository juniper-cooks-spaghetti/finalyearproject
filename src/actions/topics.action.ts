"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function deleteTopic(topicId: string, userRoadmapId: string) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Delete the UserRoadmapTopic entry
    await prisma.userRoadmapTopic.delete({
      where: {
        userRoadmapId_topicId: {
          userRoadmapId,
          topicId
        }
      }
    });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error deleting topic:", error);
    throw error;
  }
}

export async function addTopic({
  id,
  title,
  description,
  difficulty,
  estimatedTime,
  content,
  userRoadmapId,
  roadmapId,
  previousTopicId = null
}: {
  id?: string;
  title: string;
  description: string;
  difficulty: number;
  estimatedTime: number;
  content?: any[];
  userRoadmapId: string;
  roadmapId: string;
  previousTopicId?: string | null;
}) {
  try {
    console.log("Adding topic in action:", {
      id,
      title,
      roadmapId,
      previousTopicId
    });

    // Check if user is authenticated
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    // Get DB user ID from Clerk ID
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId }
    });
    if (!dbUser) {
      return { success: false, error: "User not found" };
    }

    // Find or create the topic
    let topicId = id;
    if (!topicId) {
      // Create new topic if no ID provided
      const newTopic = await prisma.topic.create({
        data: {
          title,
          description,
          difficulty,
          estimatedTime,
          roadmaps: {
            create: {
              roadmapId
            }
          }
        }
      });
      topicId = newTopic.id;
    } else {
      // Check if the topic exists in the roadmap
      const existingRoadmapTopic = await prisma.roadmapTopic.findUnique({
        where: {
          roadmapId_topicId: {
            roadmapId,
            topicId
          }
        }
      });

      if (!existingRoadmapTopic) {
        await prisma.roadmapTopic.create({
          data: {
            roadmapId,
            topicId
          }
        });
      }
    }

    // Check if this topic is already in user's roadmap
    const existingUserRoadmapTopic = await prisma.userRoadmapTopic.findUnique({
      where: {
        userRoadmapId_topicId: {
          userRoadmapId,
          topicId
        }
      },
      include: {
        topic: {
          include: {
            contents: {
              include: {
                content: true
              }
            }
          }
        }
      }
    });

    if (existingUserRoadmapTopic) {
      console.log("Topic already exists in roadmap, returning existing:", existingUserRoadmapTopic.id);
      return { 
        success: true, 
        topic: existingUserRoadmapTopic 
      };
    }

    // Get the last topic's order
    const lastTopicOrder = previousTopicId 
      ? await prisma.userRoadmapTopic.findUnique({
          where: {
            userRoadmapId_topicId: {
              userRoadmapId,
              topicId: previousTopicId
            }
          },
          select: {
            customOrder: true
          }
        })
      : await prisma.userRoadmapTopic.findFirst({
          where: { userRoadmapId },
          orderBy: { customOrder: 'desc' },
          select: { customOrder: true }
        });

    const newCustomOrder = (lastTopicOrder?.customOrder ?? 0) + 10;

    // Create the UserRoadmapTopic with a transaction to avoid partial operations
    const userRoadmapTopic = await prisma.$transaction(async (tx) => {
      // Create the user roadmap topic
      const userRoadmapTopic = await tx.userRoadmapTopic.create({
        data: {
          userRoadmapId,
          topicId,
          customOrder: newCustomOrder
        },
        include: {
          topic: {
            include: {
              contents: {
                include: {
                  content: true
                }
              }
            }
          }
        }
      });

      // Create the topic completion entry
      await tx.userTopicCompletion.upsert({
        where: {
          topicId_userId: {
            topicId,
            userId: dbUser.id
          }
        },
        update: {}, // No updates if exists
        create: {
          userId: dbUser.id,
          topicId,
          status: 'not_started'
        }
      });

      // Update the transition count in recommendations
      if (previousTopicId === null) {
        // For initial topics
        const existingRec = await tx.topicRecommendation.findFirst({
          where: {
            roadmapId,
            afterTopicId: topicId,
            beforeTopicId: null
          }
        });

        if (existingRec) {
          await tx.topicRecommendation.update({
            where: { id: existingRec.id },
            data: {
              transitionCount: { increment: 1 },
              lastTransitionAt: new Date()
            }
          });
        } else {
          await tx.topicRecommendation.create({
            data: {
              roadmapId,
              afterTopicId: topicId,
              beforeTopicId: null,
              transitionCount: 1,
              weight: 0.5,
              lastTransitionAt: new Date()
            }
          });
        }
      } else {
        // For subsequent topics (with a prerequisite)
        await tx.topicRecommendation.upsert({
          where: {
            roadmapId_afterTopicId_beforeTopicId: {
              roadmapId,
              afterTopicId: topicId,
              beforeTopicId: previousTopicId
            }
          },
          update: {
            transitionCount: { increment: 1 },
            lastTransitionAt: new Date()
          },
          create: {
            roadmapId,
            afterTopicId: topicId,
            beforeTopicId: previousTopicId,
            transitionCount: 1,
            weight: 0.5,
            lastTransitionAt: new Date()
          }
        });
      }

      return userRoadmapTopic;
    });

    revalidatePath("/dashboard");
    return { success: true, topic: userRoadmapTopic };
  } catch (error) {
    console.error('Error adding topic:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "An unknown error occurred" 
    };
  }
}

export async function updateTopicStatus(
  userRoadmapId: string,
  topicId: string,
  status: 'not_started' | 'in_progress' | 'completed'
) {
  console.log('Starting updateTopicStatus:', {
    userRoadmapId,
    topicId,
    status
  });

  try {
    const { userId } = await auth();
    if (!userId) {
      console.error('Authentication failed: No userId found');
      throw new Error("Unauthorized");
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    if (!dbUser) {
      console.error('Database user not found');
      throw new Error("User not found");
    }

    // First check if the UserRoadmapTopic exists
    const existingTopic = await prisma.userRoadmapTopic.findUnique({
      where: {
        userRoadmapId_topicId: {
          userRoadmapId,
          topicId
        }
      }
    });

    if (!existingTopic) {
      throw new Error("Topic not found in roadmap");
    }

    // Update the completion status
    const updatedCompletion = await prisma.userTopicCompletion.upsert({
      where: {
        topicId_userId: {
          topicId,
          userId: dbUser.id
        }
      },
      update: {
        status,
        lastUpdated: new Date()
      },
      create: {
        topicId,
        userId: dbUser.id,
        status,
        lastUpdated: new Date()
      }
    });

    console.log('Topic status updated:', {
      topicId,
      newStatus: updatedCompletion.status,
      success: true
    });

    revalidatePath("/dashboard", "layout");
    return { 
      success: true, 
      data: updatedCompletion 
    };
  } catch (error) {
    console.error('Error in updateTopicStatus:', {
      error,
      stack: (error as Error).stack
    });
    
    return { 
      success: false, 
      error: String(error),
      details: {
        userRoadmapId,
        topicId,
        status
      }
    };
  }
}

export async function forceRerender() {
  revalidatePath("/dashboard", "layout");
  return { timestamp: Date.now() };
}

export async function getTopicCompletion(topicId: string, profileUserId?: string) {
  try {
    // If profileUserId is provided, use it (for viewing others' profiles)
    let userId: string;
    
    if (profileUserId) {
      // Direct use of provided user ID
      userId = profileUserId;
    } else {
      // Try to get current user's ID (for own dashboard/profile)
      try {
        const authResult = await auth();
        if (!authResult.userId) {
          // For non-authenticated users viewing profiles, return default state
          return {
            success: true,
            completion: { status: 'not_started', difficultyRating: null, timeSpent: null }
          };
        }
        
        const dbUser = await prisma.user.findUnique({
          where: { clerkId: authResult.userId }
        });
        
        if (!dbUser) {
          return {
            success: true,
            completion: { status: 'not_started', difficultyRating: null, timeSpent: null }
          };
        }
        
        userId = dbUser.id;
      } catch (error) {
        // Handle auth errors gracefully
        return {
          success: true,
          completion: { status: 'not_started', difficultyRating: null, timeSpent: null }
        };
      }
    }

    const completion = await prisma.userTopicCompletion.findUnique({
      where: {
        topicId_userId: {
          topicId,
          userId
        }
      }
    });

    return {
      success: true,
      completion: completion || { status: 'not_started', difficultyRating: null, timeSpent: null }
    };
  } catch (error) {
    console.error("Error getting topic completion:", error);
    return { 
      success: true, // Still return success to avoid breaking UI
      completion: { status: 'not_started', difficultyRating: null, timeSpent: null }
    };
  }
}

export async function updateTopicCompletion(
  topicId: string,
  data: {
    status: string;
    difficultyRating?: number;
    timeSpent?: number;
  }
) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    if (!dbUser) throw new Error("User not found");

    // Update completion data with lastUpdated
    await prisma.userTopicCompletion.upsert({
      where: {
        topicId_userId: {
          topicId,
          userId: dbUser.id
        }
      },
      update: {
        ...data,
        lastUpdated: new Date() // Update the timestamp
      },
      create: {
        ...data,
        topicId,
        userId: dbUser.id,
        lastUpdated: new Date()
      }
    });

    // Fetch fresh data
    const updatedCompletion = await prisma.userTopicCompletion.findUnique({
      where: {
        topicId_userId: {
          topicId,
          userId: dbUser.id
        }
      }
    });

    return { 
      success: true, 
      completion: updatedCompletion || { status: 'not_started' }
    };
  } catch (error) {
    console.error("Error updating topic completion:", error);
    return { success: false, error: String(error) };
  }
}

export async function updateTopicStatistics(topicId: string) {
  try {
    // Get all completions for this topic
    const completions = await prisma.userTopicCompletion.findMany({
      where: {
        topicId,
        status: 'completed',
        difficultyRating: { not: null },
        timeSpent: { not: null }
      },
      select: {
        difficultyRating: true,
        timeSpent: true
      }
    });

    if (completions.length === 0) {
      return { success: true, message: "No completed ratings found" };
    }

    // Calculate averages
    const avgDifficulty = completions.reduce((sum, curr) => 
      sum + (curr.difficultyRating || 0), 0) / completions.length;
    
    const avgTimeSpent = completions.reduce((sum, curr) => 
      sum + (curr.timeSpent || 0), 0) / completions.length;

    // Update topic with new averages
    await prisma.topic.update({
      where: { id: topicId },
      data: {
        difficulty: Math.round(avgDifficulty),
        estimatedTime: Math.round(avgTimeSpent),
        averageCompletionTime: avgTimeSpent
      }
    });

    return { 
      success: true, 
      averages: { 
        difficulty: avgDifficulty, 
        timeSpent: avgTimeSpent 
      } 
    };
  } catch (error) {
    console.error("Error updating topic statistics:", error);
    return { success: false, error: String(error) };
  }
}
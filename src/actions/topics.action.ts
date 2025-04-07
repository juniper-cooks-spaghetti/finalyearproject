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
    return { success: false, error: "Failed to delete topic" };
  }
}

export async function addTopic(params: {
  id?: string; // Make id optional to handle new topic creation
  title: string;
  description: string;
  difficulty?: number;
  estimatedTime?: number;
  content?: any[];
  userRoadmapId?: string;
  roadmapId: string;
  previousTopicId?: string | null;
}) {
  try {
    console.log("Adding topic:", params);
    
    // Validate userRoadmapId first
    if (!params.userRoadmapId) {
      console.error("userRoadmapId is missing or empty:", params.userRoadmapId);
      
      // If we don't have userRoadmapId, we need to find it based on roadmapId and userId
      const { userId } = await auth();
      if (!userId) {
        return { success: false, error: "Unauthorized" };
      }
      
      const dbUser = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true }
      });
      
      if (!dbUser) {
        return { success: false, error: "User not found" };
      }
      
      // Find the user's roadmap for this specific roadmap
      const userRoadmap = await prisma.userRoadmap.findFirst({
        where: {
          userId: dbUser.id,
          roadmapId: params.roadmapId
        },
        select: { id: true }
      });
      
      if (!userRoadmap) {
        // Create a new userRoadmap if it doesn't exist
        const newUserRoadmap = await prisma.userRoadmap.create({
          data: {
            userId: dbUser.id,
            roadmapId: params.roadmapId,
            startedAt: new Date()
          }
        });
        params.userRoadmapId = newUserRoadmap.id;
      } else {
        params.userRoadmapId = userRoadmap.id;
      }
      
      console.log("Found/created userRoadmapId:", params.userRoadmapId);
    }
    
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true }
    });

    if (!dbUser) {
      return { success: false, error: "User not found" };
    }

    let topicId = params.id;
    
    // STEP 1: Create/find the topic
    if (!topicId) {
      // For a new topic, create it first, then create the RoadmapTopic connection
      console.log("Creating new topic:", params.title);
      
      // Create a new topic with connection to roadmap
      const newTopic = await prisma.topic.create({
        data: {
          title: params.title,
          description: params.description,
          difficulty: params.difficulty || null,
          estimatedTime: params.estimatedTime || null,
          // Create the RoadmapTopic relationship in the same transaction
          roadmaps: {
            create: {
              roadmapId: params.roadmapId
            }
          }
        }
      });
      
      topicId = newTopic.id;
      console.log("Created new topic with ID:", topicId);

      // If content was provided, link it to the new topic
      if (params.content && params.content.length > 0) {
        for (const content of params.content) {
          await prisma.topicContent.create({
            data: {
              topicId: newTopic.id,
              contentId: content.id
            }
          });
        }
      }
    } else {
      // For existing topics, ensure connection to the roadmap exists
      const existingRoadmapTopic = await prisma.roadmapTopic.findUnique({
        where: {
          roadmapId_topicId: {
            roadmapId: params.roadmapId,
            topicId
          }
        }
      });

      if (!existingRoadmapTopic) {
        await prisma.roadmapTopic.create({
          data: {
            roadmapId: params.roadmapId,
            topicId
          }
        });
      }
    }

    // Check if this topic is already in user's roadmap
    const existingUserRoadmapTopic = await prisma.userRoadmapTopic.findFirst({
      where: {
        userRoadmapId: params.userRoadmapId,
        topicId: topicId
      }
    });

    if (existingUserRoadmapTopic) {
      console.log("Topic already exists in roadmap, returning existing:", existingUserRoadmapTopic.id);
      
      // Fetch the full topic data to return
      const fullTopic = await prisma.userRoadmapTopic.findUnique({
        where: { id: existingUserRoadmapTopic.id },
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
      
      return { 
        success: true, 
        topic: fullTopic 
      };
    }

    // STEP 2: Add the topic to the user's roadmap
    
    // Get the last topic's order for proper positioning
    const lastTopic = await prisma.userRoadmapTopic.findFirst({
      where: {
        userRoadmapId: params.userRoadmapId
      },
      orderBy: {
        customOrder: 'desc'
      }
    });
    
    const nextOrder = lastTopic ? (lastTopic.customOrder || 0) + 10 : 10;

    // Add the topic to the user's roadmap
    const userRoadmapTopic = await prisma.userRoadmapTopic.create({
      data: {
        userRoadmapId: params.userRoadmapId,
        topicId: topicId,
        customOrder: nextOrder,
        isSkipped: false
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

    // If this is from a recommendation, log the transition for future recommendations
    if (params.previousTopicId) {
      const existingRecommendation = await prisma.topicRecommendation.findFirst({
        where: {
          roadmapId: params.roadmapId,
          beforeTopicId: params.previousTopicId,
          afterTopicId: topicId
        }
      });

      if (existingRecommendation) {
        // Update existing recommendation
        await prisma.topicRecommendation.update({
          where: { id: existingRecommendation.id },
          data: {
            transitionCount: { increment: 1 },
            lastTransitionAt: new Date()
          }
        });
      } else {
        // Create new recommendation
        await prisma.topicRecommendation.create({
          data: {
            roadmapId: params.roadmapId,
            beforeTopicId: params.previousTopicId,
            afterTopicId: topicId,
            transitionCount: 1,
            weight: 0.5,
            lastTransitionAt: new Date()
          }
        });
      }
    }

    // Revalidate paths to update UI
    revalidatePath(`/roadmap/${params.roadmapId}`);
    revalidatePath('/dashboard');

    return { 
      success: true, 
      topic: userRoadmapTopic 
    };
  } catch (error) {
    console.error("Error adding topic:", error);
    return { 
      success: false, 
      error: "Failed to add topic: " + (error instanceof Error ? error.message : String(error)) 
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
    return { success: false, error: "Failed to update topic completion" };
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
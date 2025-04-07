'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getDbUserId } from "./user.action";

interface CreateRoadmapData {
  title: string;
  description: string;
  category: string;
  isPublic: boolean;
}

// Update the addRoadmap function with more detailed error handling

export async function addRoadmap(data: CreateRoadmapData) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) throw new Error("Unauthorized");

    console.log("Creating roadmap for user:", clerkId);
    console.log("Roadmap data:", data);

    const user = await prisma.user.findUnique({
      where: { clerkId }
    });

    if (!user) {
      console.error("User not found for clerkId:", clerkId);
      throw new Error("User not found");
    }

    const roadmap = await prisma.roadmap.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
      }
    });

    console.log("Created roadmap:", roadmap.id);

    const userRoadmap = await prisma.userRoadmap.create({
      data: {
        userId: user.id,
        roadmapId: roadmap.id,
        public: data.isPublic,
        startedAt: new Date() // Make sure to set a startedAt date
      }
    });

    console.log("Created user roadmap:", userRoadmap.id);

    revalidatePath('/dashboard');
    return roadmap;
  } catch (error) {
    console.error('Error creating roadmap:', error);
    throw error;
  }
}

export async function deleteRoadmap(userRoadmapId: string) {
  try {
    const userId = await getDbUserId();
    if (!userId) throw new Error("Unauthorized");

    const userRoadmap = await prisma.userRoadmap.findUnique({
      where: {
        id: userRoadmapId,
        userId
      }
    });

    if (!userRoadmap) {
      throw new Error("Roadmap not found or unauthorized");
    }

    await prisma.userRoadmap.delete({
      where: {
        id: userRoadmapId
      }
    });

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error deleting roadmap:', error);
    throw error;
  }
}

export async function toggleRoadmapCompletion(userRoadmapId: string) {
  try {
    const userId = await getDbUserId();
    if (!userId) throw new Error("Unauthorized");

    const userRoadmap = await prisma.userRoadmap.findUnique({
      where: {
        id: userRoadmapId,
        userId
      },
      include: {
        topics: {
          select: {
            id: true,
            topicId: true
          }
        }
      }
    });

    if (!userRoadmap) {
      throw new Error("Roadmap not found or unauthorized");
    }

    const topicCompletions = await prisma.userTopicCompletion.findMany({
      where: {
        userId,
        topicId: {
          in: userRoadmap.topics.map(t => t.topicId)
        }
      }
    });

    if (!userRoadmap.completed) {
      const incompleteTopicIds = userRoadmap.topics
        .filter(topic => {
          const completion = topicCompletions.find(c => c.topicId === topic.topicId);
          return !completion || completion.status !== 'completed';
        })
        .map(t => t.id);

      if (incompleteTopicIds.length > 0) {
        await prisma.userRoadmapTopic.updateMany({
          where: {
            id: {
              in: incompleteTopicIds
            }
          },
          data: {
            isSkipped: true
          }
        });
      }
    } else {
      await prisma.userRoadmapTopic.updateMany({
        where: {
          userRoadmapId
        },
        data: {
          isSkipped: false
        }
      });
    }

    const updatedRoadmap = await prisma.userRoadmap.update({
      where: {
        id: userRoadmapId
      },
      data: {
        completed: !userRoadmap.completed,
        completedAt: !userRoadmap.completed ? new Date() : null
      }
    });

    revalidatePath('/dashboard');
    return {
      success: true,
      completed: updatedRoadmap.completed
    };
  } catch (error) {
    console.error('Error toggling roadmap completion:', error);
    throw error;
  }
}

export async function addUserRoadmap(roadmapId: string, isPublic: boolean) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) throw new Error("Unauthorized");

    const user = await prisma.user.findUnique({
      where: { clerkId }
    });

    if (!user) throw new Error("User not found");

    const userRoadmap = await prisma.userRoadmap.create({
      data: {
        userId: user.id,
        roadmapId: roadmapId,
        public: isPublic
      }
    });

    revalidatePath('/dashboard');
    return userRoadmap;
  } catch (error) {
    console.error('Error adding user roadmap:', error);
    throw error;
  }
}

export async function toggleRoadmapVisibility(userRoadmapId: string) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) throw new Error("Unauthorized");

    const userRoadmap = await prisma.userRoadmap.findUnique({
      where: { id: userRoadmapId }
    });

    if (!userRoadmap) throw new Error("Roadmap not found");

    const updatedRoadmap = await prisma.userRoadmap.update({
      where: { id: userRoadmapId },
      data: { public: !userRoadmap.public }
    });

    revalidatePath('/dashboard');
    return updatedRoadmap;
  } catch (error) {
    console.error('Error toggling roadmap visibility:', error);
    throw error;
  }
}
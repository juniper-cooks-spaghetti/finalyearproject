'use server'

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Bulk delete multiple topics at once
 */
export async function bulkDeleteTopics(topicIds: string[]) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }
    
    // Check if the user is an admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true }
    });
    
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: "Only admins can delete topics" };
    }
    
    let success = 0;
    let failed = 0;
    
    // Delete each topic
    for (const topicId of topicIds) {
      try {
        await prisma.topic.delete({
          where: { id: topicId }
        });
        success++;
      } catch (error) {
        console.error(`Failed to delete topic ${topicId}:`, error);
        failed++;
      }
    }
    
    revalidatePath('/admin/topics');
    return { 
      success: true, 
      stats: { success, failed }
    };
  } catch (error) {
    console.error('Error in bulk delete topics:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Bulk link multiple topics to a roadmap
 */
export async function bulkLinkTopicsToRoadmap(topicIds: string[], roadmapId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }
    
    // Check if the user is an admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true }
    });
    
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: "Only admins can link topics to roadmaps" };
    }
    
    // Check if roadmap exists
    const roadmap = await prisma.roadmap.findUnique({
      where: { id: roadmapId }
    });
    
    if (!roadmap) {
      return { success: false, error: "Roadmap not found" };
    }
    
    let success = 0;
    let failed = 0;
    
    // Link each topic to the roadmap
    for (const topicId of topicIds) {
      try {
        // Check if topic exists
        const topic = await prisma.topic.findUnique({
          where: { id: topicId }
        });
        
        if (!topic) {
          failed++;
          continue;
        }
        
        // Check if the link already exists
        const existingLink = await prisma.roadmapTopic.findUnique({
          where: {
            roadmapId_topicId: {
              roadmapId,
              topicId
            }
          }
        });
        
        // Skip if already linked
        if (existingLink) {
          // Count as success since it's already linked
          success++;
          continue;
        }
        
        // Create the link
        await prisma.roadmapTopic.create({
          data: {
            roadmapId,
            topicId
          }
        });
        success++;
      } catch (error) {
        console.error(`Failed to link topic ${topicId} to roadmap ${roadmapId}:`, error);
        failed++;
      }
    }
    
    // Revalidate paths
    revalidatePath('/admin/topics');
    revalidatePath('/admin/roadmaps');
    revalidatePath(`/admin/roadmaps/${roadmapId}`);
    
    return { 
      success: true, 
      stats: { success, failed }
    };
  } catch (error) {
    console.error('Error in bulk link topics to roadmap:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Bulk unlink (delink) multiple topics from a roadmap
 */
export async function bulkUnlinkTopicsFromRoadmap(topicIds: string[], roadmapId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }
    
    // Check if the user is an admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true }
    });
    
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: "Only admins can unlink topics from roadmaps" };
    }
    
    let success = 0;
    let failed = 0;
    
    // Unlink each topic from the roadmap
    for (const topicId of topicIds) {
      try {
        // Check if the relationship exists
        const existing = await prisma.roadmapTopic.findUnique({
          where: {
            roadmapId_topicId: {
              roadmapId,
              topicId
            }
          }
        });
        
        if (!existing) {
          // Already unlinked, count as success
          success++;
          continue;
        }
        
        // Delete the relationship
        await prisma.roadmapTopic.delete({
          where: {
            roadmapId_topicId: {
              roadmapId,
              topicId
            }
          }
        });
        success++;
      } catch (error) {
        console.error(`Failed to unlink topic ${topicId} from roadmap ${roadmapId}:`, error);
        failed++;
      }
    }
    
    // Revalidate paths
    revalidatePath('/admin/topics');
    revalidatePath('/admin/roadmaps');
    revalidatePath(`/admin/roadmaps/${roadmapId}`);
    
    return { 
      success: true, 
      stats: { success, failed }
    };
  } catch (error) {
    console.error('Error in bulk unlink topics from roadmap:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Create a new topic
 */
export async function createTopic(data: {
  title: string;
  description?: string;
  difficulty: number | null;
  estimatedTime: number | null;
}) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }
    
    // Check if the user is an admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true }
    });
    
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: "Only admins can create topics" };
    }
    
    // Create the topic
    const topic = await prisma.topic.create({
      data: {
        title: data.title,
        description: data.description || "",
        difficulty: data.difficulty,
        estimatedTime: data.estimatedTime,
      }
    });
    
    revalidatePath('/admin/topics');
    return { success: true, topic };
  } catch (error) {
    console.error('Error creating topic:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Update an existing topic
 */
export async function updateTopic(data: {
  id: string;
  title: string;
  description?: string;
  difficulty: number | null;
  estimatedTime: number | null;
}) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }
    
    // Check if the user is an admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true }
    });
    
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: "Only admins can update topics" };
    }
    
    // Update the topic
    const topic = await prisma.topic.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description || "",
        difficulty: data.difficulty,
        estimatedTime: data.estimatedTime,
      }
    });
    
    revalidatePath('/admin/topics');
    return { success: true, topic };
  } catch (error) {
    console.error('Error updating topic:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Fetch topic details and all available roadmaps for editing
 */
export async function getTopicEditData(topicId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }
    
    // Check if the user is an admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true }
    });
    
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: "Only admins can access topic edit data" };
    }
    
    // Get the full topic details including description
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: {
        roadmaps: {
          include: {
            roadmap: {
              select: {
                id: true,
                title: true
              }
            }
          }
        }
      }
    });
    
    if (!topic) {
      return { success: false, error: "Topic not found" };
    }
    
    // Get all roadmaps for the dropdown
    const allRoadmaps = await prisma.roadmap.findMany({
      select: {
        id: true,
        title: true,
        category: true
      },
      orderBy: {
        title: 'asc'
      }
    });
    
    // Format roadmaps for the dropdown
    const roadmapOptions = allRoadmaps.map(roadmap => ({
      value: roadmap.id,
      label: roadmap.category 
        ? `${roadmap.title} (${roadmap.category})`
        : roadmap.title
    }));
    
    // Get assigned roadmap IDs
    const assignedRoadmapIds = topic.roadmaps.map(r => r.roadmap.id);
    
    return { 
      success: true, 
      topic,
      roadmapOptions,
      assignedRoadmapIds
    };
  } catch (error) {
    console.error('Error getting topic edit data:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Update topic roadmap assignments
 */
export async function updateTopicRoadmaps(topicId: string, roadmapIds: string[]) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }
    
    // Check if the user is an admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true }
    });
    
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: "Only admins can update topic roadmaps" };
    }
    
    // Get current roadmap assignments
    const currentAssignments = await prisma.roadmapTopic.findMany({
      where: {
        topicId: topicId
      },
      select: {
        roadmapId: true
      }
    });
    
    const currentRoadmapIds = currentAssignments.map(a => a.roadmapId);
    
    // Determine which roadmaps to add and which to remove
    const roadmapsToAdd = roadmapIds.filter(id => !currentRoadmapIds.includes(id));
    const roadmapsToRemove = currentRoadmapIds.filter(id => !roadmapIds.includes(id));
    
    // Create new assignments
    if (roadmapsToAdd.length > 0) {
      await Promise.all(
        roadmapsToAdd.map(roadmapId => 
          prisma.roadmapTopic.create({
            data: {
              roadmapId,
              topicId
            }
          })
        )
      );
    }
    
    // Remove old assignments
    if (roadmapsToRemove.length > 0) {
      await Promise.all(
        roadmapsToRemove.map(roadmapId => 
          prisma.roadmapTopic.delete({
            where: {
              roadmapId_topicId: {
                roadmapId,
                topicId
              }
            }
          })
        )
      );
    }
    
    revalidatePath('/admin/topics');
    return { 
      success: true,
      stats: {
        added: roadmapsToAdd.length,
        removed: roadmapsToRemove.length
      }
    };
  } catch (error) {
    console.error('Error updating topic roadmaps:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Fetch all available roadmaps (for creating new topics)
 */
export async function getAllRoadmaps() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }
    
    // Check if the user is an admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true }
    });
    
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: "Only admins can access roadmap data" };
    }
    
    // Get all roadmaps with complete info
    const allRoadmaps = await prisma.roadmap.findMany({
      select: {
        id: true,
        title: true,
        category: true
      },
      orderBy: {
        title: 'asc'
      }
    });
    
    // Format roadmaps for the dropdown
    const roadmapOptions = allRoadmaps.map(roadmap => ({
      value: roadmap.id,
      label: roadmap.category 
        ? `${roadmap.title} (${roadmap.category})`
        : roadmap.title
    }));
    
    return { 
      success: true, 
      roadmaps: allRoadmaps,
      roadmapOptions
    };
  } catch (error) {
    console.error('Error getting roadmaps:', error);
    return { success: false, error: String(error) };
  }
}
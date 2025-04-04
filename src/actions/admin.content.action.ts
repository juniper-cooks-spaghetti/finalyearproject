'use server'

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ContentType } from "@prisma/client";

/**
 * Create a new content item
 */
export async function createContent(data: {
  title: string;
  type: string;
  url: string;
  description: string;
  topicId?: string; // Optional topic to link content to
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
      return { success: false, error: "Only admins can create content" };
    }
    
    // Create the content
    const content = await prisma.content.create({
      data: {
        title: data.title,
        type: data.type as ContentType, // Cast to ContentType enum
        url: data.url,
        description: data.description,
      }
    });
    
    // Link to topic if provided
    if (data.topicId) {
      await prisma.topicContent.create({
        data: {
          topicId: data.topicId,
          contentId: content.id
        }
      });
    }
    
    revalidatePath('/admin/content');
    return { success: true, content };
  } catch (error) {
    console.error('Error creating content:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Update an existing content item
 */
export async function updateContent(data: {
  id: string;
  title: string;
  type: string;
  url: string;
  description: string;
  topicId?: string; // Optional topic to link content to
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
      return { success: false, error: "Only admins can update content" };
    }
    
    // Update the content
    const content = await prisma.content.update({
      where: { id: data.id },
      data: {
        title: data.title,
        type: data.type as ContentType, // Cast to ContentType enum
        url: data.url,
        description: data.description,
      }
    });
    
    // If topicId is provided, create the link if it doesn't exist already
    if (data.topicId) {
      // Check if the relationship exists
      const existingLink = await prisma.topicContent.findFirst({
        where: {
          contentId: data.id,
          topicId: data.topicId
        }
      });
      
      if (!existingLink) {
        await prisma.topicContent.create({
          data: {
            contentId: data.id,
            topicId: data.topicId
          }
        });
      }
    }
    
    revalidatePath('/admin/content');
    return { success: true, content };
  } catch (error) {
    console.error('Error updating content:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get topics that content is not already linked to
 */
export async function getAvailableTopics(contentId?: string) {
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
      return { success: false, error: "Only admins can view available topics" };
    }
    
    // If no contentId, return all topics
    if (!contentId) {
      const allTopics = await prisma.topic.findMany({
        select: {
          id: true,
          title: true
        },
        orderBy: {
          title: 'asc'
        }
      });
      
      return { success: true, topics: allTopics };
    }
    
    // Get topics that the content is already linked to
    const linkedTopicIds = await prisma.topicContent.findMany({
      where: {
        contentId
      },
      select: {
        topicId: true
      }
    });
    
    const linkedIds = linkedTopicIds.map(item => item.topicId);
    
    // Get all topics except those already linked
    const availableTopics = await prisma.topic.findMany({
      where: {
        id: {
          notIn: linkedIds
        }
      },
      select: {
        id: true,
        title: true
      },
      orderBy: {
        title: 'asc'
      }
    });
    
    return { success: true, topics: availableTopics };
  } catch (error) {
    console.error('Error getting available topics:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Bulk delete content items
 */
export async function bulkDeleteContent(contentIds: string[]) {
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
      return { success: false, error: "Only admins can delete content" };
    }
    
    let success = 0;
    let failed = 0;
    
    // Delete each content item
    for (const contentId of contentIds) {
      try {
        await prisma.content.delete({
          where: { id: contentId }
        });
        success++;
      } catch (error) {
        console.error(`Failed to delete content ${contentId}:`, error);
        failed++;
      }
    }
    
    revalidatePath('/admin/content');
    return { 
      success: true, 
      stats: { success, failed }
    };
  } catch (error) {
    console.error('Error in bulk delete content:', error);
    return { success: false, error: String(error) };
  }
}
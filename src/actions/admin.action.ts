"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ContentType } from "@prisma/client";

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function deleteUser(clerkId: string) {
  try {
    // Initialize the clerk client properly - notice the function call
    const clerk = await clerkClient();
    
    // Delete from Clerk using the initialized client
    await clerk.users.deleteUser(clerkId);
    
    // Delete from database (will cascade delete related data)
    await prisma.user.delete({
      where: {
        clerkId
      }
    });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { success: false, error: String(error) };
  }
}

export async function deleteRoadmap(roadmapId: string) {
  try {
    await prisma.roadmap.delete({
      where: {
        id: roadmapId
      }
    });

    revalidatePath('/admin/roadmaps');
    return { success: true };
  } catch (error) {
    console.error('Error deleting roadmap:', error);
    return { success: false, error: String(error) };
  }
}

export async function deleteTopic(topicId: string) {
  try {
    // Delete the topic (cascades to TopicContent, UserTopicCompletion, etc.)
    await prisma.topic.delete({
      where: {
        id: topicId
      }
    });

    revalidatePath('/admin/topics');
    return { success: true };
  } catch (error) {
    console.error('Error deleting topic:', error);
    return { success: false, error: String(error) };
  }
}

export async function removeTopicFromRoadmap(topicId: string, roadmapId: string) {
  try {
    // Delete the RoadmapTopic entry
    await prisma.roadmapTopic.delete({
      where: {
        roadmapId_topicId: {
          roadmapId,
          topicId
        }
      }
    });

    revalidatePath('/admin/topics');
    return { success: true };
  } catch (error) {
    console.error('Error unlinking topic:', error);
    return { success: false, error: String(error) };
  }
}

export async function removeContentFromTopic(contentId: string, topicId: string) {
  try {
    await prisma.topicContent.delete({
      where: {
        topicId_contentId: {
          topicId,
          contentId
        }
      }
    });

    revalidatePath('/admin/content');
    return { success: true };
  } catch (error) {
    console.error('Error unlinking content:', error);
    return { success: false, error: String(error) };
  }
}

export async function deleteContent(contentId: string) {
  try {
    await prisma.content.delete({
      where: {
        id: contentId
      }
    });

    revalidatePath('/admin/content');
    return { success: true };
  } catch (error) {
    console.error('Error deleting content:', error);
    return { success: false, error: String(error) };
  }
}

export async function rebalanceAllRoadmapWeights() {
  try {
    const roadmaps = await prisma.roadmap.findMany({
      select: { id: true }
    });

    const results = await Promise.all(
      roadmaps.map(async (roadmap) => {
        const response = await fetch(`${API_URL}/api/topics/recommendation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ roadmapId: roadmap.id }),
        });

        if (!response.ok) {
          throw new Error(`Failed to process roadmap ${roadmap.id}`);
        }

        return response.json();
      })
    );

    return { success: true, processed: results.length, results };
  } catch (error) {
    console.error('Error rebalancing weights:', error);
    return { success: false, error: String(error) };
  }
}

export async function rebalanceRoadmapWeights(roadmapId: string) {
  try {
    const response = await fetch(`${API_URL}/api/topics/recommendation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ roadmapId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to rebalance roadmap ${roadmapId}`);
    }

    revalidatePath('/admin/roadmaps');
    return { success: true };
  } catch (error) {
    console.error('Error rebalancing weights:', error);
    return { success: false, error: String(error) };
  }
}

export async function handleContentSuggestion(
  suggestion: {
    id: string,
    topicId: string,
    title: string,
    type: string,
    url: string,
    description: string
  },
  action: 'approve' | 'reject'
) {
  try {
    if (action === 'approve') {
      // Check if content already exists
      const existingContent = await prisma.content.findFirst({
        where: { url: suggestion.url }
      });

      if (existingContent) {
        // Add only TopicContent relation if content exists
        await prisma.topicContent.create({
          data: {
            topicId: suggestion.topicId,
            contentId: existingContent.id
          }
        });
      } else {
        // Create new content and TopicContent relation
        const newContent = await prisma.content.create({
          data: {
            title: suggestion.title,
            type: suggestion.type as ContentType, // Now TypeScript knows what ContentType is
            url: suggestion.url,
            description: suggestion.description,
            topics: {
              create: {
                topicId: suggestion.topicId
              }
            }
          }
        });
      }
    }

    // Delete suggestion after processing
    await prisma.userContentSuggestion.delete({
      where: { id: suggestion.id }
    });

    // Revalidate both paths to ensure data is fresh
    revalidatePath('/admin/content');
    revalidatePath('/admin/suggestions');
    return { success: true };
  } catch (error) {
    console.error('Error handling content suggestion:', error);
    return { success: false, error: String(error) };
  }
}

export async function revalidateContentPage() {
  'use server';
  
  try {
    // Revalidate admin content page
    revalidatePath('/admin/content');
    return { success: true };
  } catch (error) {
    console.error('Error revalidating content page:', error);
    return { success: false, error: String(error) };
  }
}

export async function revalidateRoadmapsPage() {
  'use server';
  
  try {
    revalidatePath('/admin/roadmaps');
    return { success: true };
  } catch (error) {
    console.error('Error revalidating roadmaps page:', error);
    return { success: false, error: String(error) };
  }
}

export async function revalidateTopicsPage() {
  'use server';
  
  try {
    revalidatePath('/admin/topics');
    return { success: true };
  } catch (error) {
    console.error('Error revalidating topics page:', error);
    return { success: false, error: String(error) };
  }
}

export async function revalidateUsersPage() {
  'use server';
  
  try {
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Error revalidating users page:', error);
    return { success: false, error: String(error) };
  }
}
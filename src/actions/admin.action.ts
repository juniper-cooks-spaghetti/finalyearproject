"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ContentType } from "@prisma/client";

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function deleteUser(clerkId: string) {
  try {
    // Initialize the clerk client properly
    const clerk = await clerkClient();
    
    try {
      // Try to delete from Clerk, but don't let it stop the whole process if it fails
      await clerk.users.deleteUser(clerkId);
    } catch (clerkError) {
      // Log the clerk error but continue with database deletion
      console.error('Error deleting user from Clerk (continuing with DB deletion):', clerkError);
      // If it's not a "user not found" error, you might want to re-throw it
      // but for now we'll continue with the database deletion
    }
    
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

export async function updateUserRole(userId: string, role: 'USER' | 'ADMIN') {
  'use server';
  
  try {
    const { userId: adminClerkId } = await auth();
    if (!adminClerkId) {
      return { success: false, error: "Unauthorized" };
    }
    
    // Check if the current user is an admin
    const admin = await prisma.user.findUnique({
      where: { clerkId: adminClerkId },
      select: { role: true }
    });
    
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, error: "Only admins can perform this action" };
    }
    
    // Update the user's role
    await prisma.user.update({
      where: { id: userId },
      data: { role }
    });
    
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Error updating user role:', error);
    return { success: false, error: String(error) };
  }
}

export async function updateUserDetails(
  userId: string,
  data: { username?: string; email?: string }
) {
  'use server';
  
  try {
    const { userId: adminClerkId } = await auth();
    if (!adminClerkId) {
      return { success: false, error: "Unauthorized" };
    }
    
    // Check if the current user is an admin
    const admin = await prisma.user.findUnique({
      where: { clerkId: adminClerkId },
      select: { role: true }
    });
    
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, error: "Only admins can perform this action" };
    }
    
    // Check if username already exists (if username is being updated)
    if (data.username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: data.username,
          NOT: { id: userId }
        }
      });
      
      if (existingUser) {
        return { success: false, error: "Username already taken" };
      }
    }
    
    // Check if email already exists (if email is being updated)
    if (data.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: data.email,
          NOT: { id: userId }
        }
      });
      
      if (existingUser) {
        return { success: false, error: "Email already taken" };
      }
    }
    
    // Update the user's details
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data
    });
    
    revalidatePath('/admin/users');
    return { success: true, user: updatedUser };
  } catch (error) {
    console.error('Error updating user details:', error);
    return { success: false, error: String(error) };
  }
}

export async function bulkDeleteUsers(userIds: string[]) {
  'use server';
  
  try {
    const { userId: adminClerkId } = await auth();
    if (!adminClerkId) {
      return { success: false, error: "Unauthorized" };
    }
    
    // Check if the current user is an admin
    const admin = await prisma.user.findUnique({
      where: { clerkId: adminClerkId },
      select: { role: true }
    });
    
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, error: "Only admins can perform this action" };
    }
    
    // Get clerk IDs for the selected users
    const usersToDelete = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { clerkId: true }
    });
    
    const clerkIds = usersToDelete.map(user => user.clerkId);
    
    // Delete users
    let success = 0;
    let failed = 0;
    
    for (const clerkId of clerkIds) {
      try {
        await deleteUser(clerkId);
        success++;
      } catch (error) {
        console.error(`Failed to delete user with clerkId ${clerkId}:`, error);
        failed++;
      }
    }
    
    revalidatePath('/admin/users');
    return { 
      success: true, 
      stats: { success, failed }
    };
  } catch (error) {
    console.error('Error in bulk delete users:', error);
    return { success: false, error: String(error) };
  }
}

export async function updateRoadmap(data: {
  id: string;
  title: string;
  description: string;
  category: string;
}) {
  'use server';
  
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
      return { success: false, error: "Only admins can update roadmaps" };
    }
    
    // Update the roadmap
    const updatedRoadmap = await prisma.roadmap.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
      }
    });
    
    revalidatePath('/admin/roadmaps');
    return { success: true, roadmap: updatedRoadmap };
  } catch (error) {
    console.error('Error updating roadmap:', error);
    return { success: false, error: String(error) };
  }
}

// Add this function

export async function createAdminRoadmap(data: {
  title: string;
  description: string;
  category: string;
}) {
  'use server';
  
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
      return { success: false, error: "Only admins can create roadmaps" };
    }
    
    // Create the roadmap
    const roadmap = await prisma.roadmap.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        // Note: We don't add a userRoadmap connection for admin-created roadmaps
      }
    });
    
    revalidatePath('/admin/roadmaps');
    return { success: true, roadmap };
  } catch (error) {
    console.error('Error creating roadmap:', error);
    return { success: false, error: String(error) };
  }
}
"use server";

import { prisma } from "@/lib/prisma";
import { getDbUserId } from "./user.action";
import { revalidatePath } from "next/cache";
import type { Content, ContentLike } from "@/types/roadmap";
import { ContentType } from "@prisma/client";

interface TopicContentRelation {
  content: Content & {
    userInteractions: ContentLike[];
    _count: {
      userInteractions: number;
    };
  };
}

export async function getTopicContent(topicId: string) {
  try {
    const userId = await getDbUserId();

    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: {
        contents: {
          include: {
            content: {
              include: {
                userInteractions: {
                  where: {
                    // Only get likes for this specific topic
                    topicId: topicId,
                    // If logged in, also filter by user
                    ...(userId ? { userId } : {})
                  }
                },
                _count: {
                  select: {
                    userInteractions: {
                      where: {
                        topicId: topicId // Only count likes for this topic
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!topic) {
      return { success: false, error: 'Topic not found' };
    }

    const formattedContent = topic.contents.map(tc => ({
      ...tc.content,
      userInteractions: tc.content.userInteractions,
      _count: tc.content._count
    }));

    return { success: true, content: formattedContent };
  } catch (error) {
    console.error('Failed to fetch topic content:', error);
    return { success: false, error: 'Failed to fetch content' };
  }
}

export async function toggleContentLike(contentId: string, topicId: string) {
  try {
    const userId = await getDbUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    // Check if like exists for this specific topic
    const existingLike = await prisma.contentLike.findFirst({
      where: {
        userId,
        contentId,
        topicId // Include topicId in the where clause
      }
    });

    if (existingLike) {
      // Unlike for this specific topic
      await prisma.contentLike.delete({
        where: {
          id: existingLike.id
        }
      });
    } else {
      // Like for this specific topic
      await prisma.contentLike.create({
        data: {
          userId,
          contentId,
          topicId
        }
      });
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Failed to toggle content like:', error);
    return { success: false, error: 'Failed to toggle like' };
  }
}

export async function suggestContent(data: {
  topicId: string,
  title: string,
  type: string,
  url: string,
  description: string
}) {
  try {
    const userId = await getDbUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    // First check if content exists in TopicContent
    const existingContent = await prisma.content.findFirst({
      where: {
        url: data.url,
        topics: {
          some: {
            topicId: data.topicId
          }
        }
      }
    });

    if (existingContent) {
      return { 
        success: false, 
        error: 'Content already exists in this topic' 
      };
    }

    // Check for existing suggestion with same URL for this topic
    const existingSuggestion = await prisma.userContentSuggestion.findUnique({
      where: {
        topicId_url: {
          topicId: data.topicId,
          url: data.url
        }
      }
    });

    if (existingSuggestion) {
      // Increment amount of existing suggestion
      const updated = await prisma.userContentSuggestion.update({
        where: { id: existingSuggestion.id },
        data: { amount: { increment: 1 } }
      });
      return { success: true, data: updated };
    }

    // Create new suggestion
    const suggestion = await prisma.userContentSuggestion.create({
      data: {
        ...data,
        type: data.type as ContentType
      }
    });

    return { success: true, data: suggestion };
  } catch (error) {
    console.error('Failed to suggest content:', error);
    return { success: false, error: 'Failed to suggest content' };
  }
}
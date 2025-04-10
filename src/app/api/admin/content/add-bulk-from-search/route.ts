import { NextRequest, NextResponse } from 'next/server';
import { checkAdmin } from '@/adminCheck';
import { prisma } from '@/lib/prisma';

// Define request body type
interface BulkAddContentRequest {
  topicId: string;
  contents: Array<{
    title: string;
    url: string;
    description: string;
    type: string; // One of the ContentType enum values
  }>;
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const isAuthorized = await checkAdmin();
    if (!isAuthorized) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized. Admin access required.'
      }, { status: 401 });
    }

    // Parse request body
    const body = await request.json() as BulkAddContentRequest;
    const { topicId, contents } = body;

    // Validate required fields
    if (!topicId || !contents || !Array.isArray(contents) || contents.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Missing or invalid contents array'
      }, { status: 400 });
    }

    // Check if topic exists
    const topic = await prisma.topic.findUnique({
      where: { id: topicId }
    });

    if (!topic) {
      return NextResponse.json({
        success: false,
        error: 'Topic not found'
      }, { status: 404 });
    }

    // Track statistics
    const stats = {
      added: 0,
      alreadyExists: 0,
      failed: 0
    };

    // Process each content item
    for (const content of contents) {
      if (!content.url || !content.title) {
        stats.failed++;
        continue; // Skip invalid entries
      }

      try {
        // Check if content with this URL already exists
        let existingContent = await prisma.content.findFirst({
          where: { url: content.url }
        });

        let contentId: string;

        if (existingContent) {
          contentId = existingContent.id;
        } else {
          // Create new content
          const newContent = await prisma.content.create({
            data: {
              title: content.title,
              description: content.description || '',
              url: content.url,
              type: content.type as any, // Cast to ContentType enum
            }
          });
          contentId = newContent.id;
        }

        // Check if topic-content relationship already exists
        const existingTopicContent = await prisma.topicContent.findFirst({
          where: {
            topicId,
            contentId
          }
        });

        if (existingTopicContent) {
          stats.alreadyExists++;
        } else {
          // Create topic-content relationship
          await prisma.topicContent.create({
            data: {
              topicId,
              contentId
            }
          });
          stats.added++;
        }
      } catch (err) {
        console.error('Error processing content item:', err, content);
        stats.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${contents.length} items: ${stats.added} added, ${stats.alreadyExists} already exist, ${stats.failed} failed`,
      stats,
      added: stats.added,
    });

  } catch (error) {
    console.error('Error adding bulk content:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to add content items',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
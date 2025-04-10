import { NextRequest, NextResponse } from 'next/server';
import { checkAdmin } from '@/adminCheck';
import { prisma } from '@/lib/prisma';

// Define request body type
interface AddContentRequest {
  topicId: string;
  content: {
    title: string;
    url: string;
    description: string;
    type: string; // Assuming this is one of the ContentType enum values
  };
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
    const body = await request.json() as AddContentRequest;
    const { topicId, content } = body;

    // Validate required fields
    if (!topicId || !content || !content.url || !content.title) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
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

    // Check if content with this URL already exists
    let existingContent = await prisma.content.findFirst({
      where: { url: content.url }
    });

    let contentId: string;

    if (existingContent) {
      contentId = existingContent.id;
      console.log(`Content with URL ${content.url} already exists with ID ${contentId}`);
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
      console.log(`Created new content with ID ${contentId}`);
    }

    // Check if topic-content relationship already exists
    const existingTopicContent = await prisma.topicContent.findFirst({
      where: {
        topicId,
        contentId
      }
    });

    if (existingTopicContent) {
      return NextResponse.json({
        success: true,
        message: 'Content is already linked to this topic',
        status: 'already_exists',
        contentId
      });
    }

    // Create topic-content relationship
    await prisma.topicContent.create({
      data: {
        topicId,
        contentId
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Content added to topic successfully',
      contentId,
      status: 'added'
    });

  } catch (error) {
    console.error('Error adding content:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to add content',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
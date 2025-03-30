import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Define interface for the update object
interface TopicOrderUpdate {
  id: string;
  customOrder: number;
}

export async function PATCH(request: Request) {
  try {
    const { updates }: { updates: TopicOrderUpdate[] } = await request.json();
    
    // Update each topic's order
    const updatePromises = updates.map(({ id, customOrder }: TopicOrderUpdate) =>
      prisma.userRoadmapTopic.update({
        where: { id },
        data: { customOrder }
      })
    );

    await Promise.all(updatePromises);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating topic order:', error);
    return NextResponse.json(
      { error: 'Failed to update topic order' },
      { status: 500 }
    );
  }
}
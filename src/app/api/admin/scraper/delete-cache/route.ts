import { NextRequest, NextResponse } from 'next/server';
import { checkAdmin } from '@/adminCheck';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: NextRequest) {
  try {
    // Check if user is admin
    const isAuthorized = await checkAdmin();
    if (!isAuthorized) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized. Admin access required.'
      }, { status: 401 });
    }

    // Get runId from query parameter
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('runId');

    if (!runId) {
      return NextResponse.json({
        success: false,
        error: 'Missing runId parameter'
      }, { status: 400 });
    }

    // Check if search exists
    const search = await prisma.searchCache.findUnique({
      where: { runId },
      include: { results: true }
    });

    if (!search) {
      return NextResponse.json({
        success: false,
        error: 'Search cache entry not found'
      }, { status: 404 });
    }

    // Delete the cache entry
    await prisma.searchCache.delete({
      where: { runId }
    });

    return NextResponse.json({
      success: true,
      message: `Cache entry for "${search.query}" has been deleted`,
      resultsRemoved: search.results.length
    });

  } catch (error) {
    console.error('Error deleting search cache:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete cache entry',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
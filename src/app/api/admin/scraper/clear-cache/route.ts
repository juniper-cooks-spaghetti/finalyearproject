import { NextRequest, NextResponse } from 'next/server';
import dbSearchService from '@/lib/dbSearchService';

// Modern Next.js App Router config format
export const dynamic = 'force-dynamic';
export const preferredRegion = ['auto'];
export const maxDuration = 10; // Keeping within Vercel Hobby tier limits

export async function POST(request: NextRequest) {
  try {
    console.log('Clear cache API called');
    
    // Call the clearCache method on our database search service
    const result = await dbSearchService.clearCache();
    
    console.log('Cache clear operation result:', result);
    
    // Return the result to the client
    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? `Successfully cleared search cache. Removed ${result.deletedCount} cached entries.` 
        : 'Failed to clear search cache',
      deletedCount: result.deletedCount
    });
    
  } catch (error) {
    console.error('Error in clear cache API:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to clear search cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
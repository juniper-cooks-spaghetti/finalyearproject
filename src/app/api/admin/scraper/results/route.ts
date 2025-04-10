import { NextRequest, NextResponse } from 'next/server';
import dbSearchService from '@/lib/dbSearchService';

// Modern Next.js App Router config format
export const dynamic = 'force-dynamic';
export const preferredRegion = ['auto'];
export const maxDuration = 10; // Keeping within Vercel Hobby tier limits

export async function GET(request: NextRequest) {
  try {
    // Get URL parameters
    const searchParams = request.nextUrl.searchParams;
    const runId = searchParams.get('runId');
    const query = searchParams.get('query');
    
    console.log('Results API called with params:', { runId, query });
    
    // Calculate cache durations
    const SHORT_CACHE = 10; // 10 seconds for more frequent polling
    const MEDIUM_CACHE = 60; // 1 minute in seconds
    const LONG_CACHE = 1800; // 30 minutes in seconds
    
    // Case 1: If a specific runId is provided - prioritize this case
    if (runId) {
      console.log(`Looking up results for runId: ${runId}`);
      
      // Check the database for the current status
      const searchEntry = await dbSearchService.getSearchById(runId);
      
      if (!searchEntry) {
        return NextResponse.json({
          success: false,
          error: 'Results not found',
          message: 'No data available for the provided runId',
          runId
        }, { status: 404 });
      }
      
      // If the search is in progress, return the current status
      if (searchEntry.status !== 'completed') {
        const responseData: any = {
          success: true,
          runId,
          status: searchEntry.status,
          message: searchEntry.status === 'error' ? searchEntry.error : `Search ${searchEntry.status}`,
          query: searchEntry.query,
          timestamp: searchEntry.timestamp.toISOString(),
          retryAfter: searchEntry.status === 'queued' ? 5000 : 2000
        };
        
        // Add queue position if available
        if (searchEntry.queuePosition !== undefined) {
          responseData.queuePosition = searchEntry.queuePosition;
        }
        
        const response = NextResponse.json(responseData);
        
        // No caching for in-progress searches
        response.headers.set('Cache-Control', `no-store, max-age=0`);
        return response;
      }
      
      // If search is completed and we have results
      console.log(`Successfully retrieved results for runId: ${runId} from database`);
      const response = NextResponse.json({
        success: true,
        runId: searchEntry.runId,
        status: 'completed',
        query: searchEntry.query,
        results: searchEntry.results || [],
        timestamp: searchEntry.timestamp.toISOString(),
        resultsCount: searchEntry.results ? searchEntry.results.length : 0
      });
      
      // Medium cache for completed searches - still allow refreshing
      response.headers.set('Cache-Control', `public, max-age=${MEDIUM_CACHE}, s-maxage=${MEDIUM_CACHE}`);
      return response;
    }
    
    // Case 2: If a query is provided, find results for that query
    if (query) {
      console.log(`Looking up results for query: ${query}`);
      
      const searchEntry = await dbSearchService.findSearchByQuery(query);
      
      if (!searchEntry) {
        return NextResponse.json({
          success: false,
          error: 'No results found',
          query
        }, { status: 404 });
      }
      
      // If the search is in progress, return the current status
      if (searchEntry.status !== 'completed') {
        const responseData: any = {
          success: true,
          runId: searchEntry.runId,
          query,
          status: searchEntry.status,
          message: searchEntry.status === 'error' ? searchEntry.error : `Search ${searchEntry.status}`,
          timestamp: searchEntry.timestamp.toISOString(),
          retryAfter: searchEntry.status === 'queued' ? 5000 : 3000
        };
        
        // Add queue position if available
        if (searchEntry.queuePosition !== undefined) {
          responseData.queuePosition = searchEntry.queuePosition;
        }
        
        const response = NextResponse.json(responseData);
        
        // No caching for in-progress searches to ensure fresh status
        response.headers.set('Cache-Control', `no-store, max-age=0`);
        return response;
      }
      
      // If completed, include the results
      const response = NextResponse.json({
        success: true,
        runId: searchEntry.runId,
        query,
        status: 'completed',
        results: searchEntry.results || [],
        resultsCount: searchEntry.results ? searchEntry.results.length : 0,
        timestamp: searchEntry.timestamp.toISOString()
      });
      
      // Short cache for query-based results to allow fresh searches
      response.headers.set('Cache-Control', `public, max-age=${SHORT_CACHE}, s-maxage=${SHORT_CACHE}`);
      return response;
    }
    
    // Case 3: No specific parameters, return a simple status
    // We won't dump the entire cache in this implementation to prevent large responses
    return NextResponse.json({
      success: true,
      message: 'Please provide a runId or query parameter to get specific results'
    });
    
  } catch (error) {
    console.error('Error in results API:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve search results',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
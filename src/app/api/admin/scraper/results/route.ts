import { NextRequest, NextResponse } from 'next/server';
import searchCache from '@/lib/searchCache';

// Modern Next.js App Router config format
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get URL parameters
    const searchParams = request.nextUrl.searchParams;
    const runId = searchParams.get('runId');
    const query = searchParams.get('query');
    
    console.log('Results API called with params:', { runId, query });

    // Calculate cache durations
    const SHORT_CACHE = 60; // 1 minute in seconds
    const MEDIUM_CACHE = 300; // 5 minutes in seconds
    const LONG_CACHE = 1800; // 30 minutes in seconds
    
    // Case 1: If a specific runId is provided - prioritize this case
    if (runId) {
      console.log(`Looking up results for runId: ${runId}`);
      
      // Check the cache for the current status
      const searchEntry = searchCache.getSearchById(runId);
      
      // If the search is in progress, return the current status with short cache time
      if (searchEntry && (searchEntry.status === 'pending' || searchEntry.status === 'error')) {
        console.log(`Search ${runId} is ${searchEntry.status}`);
        
        const response = NextResponse.json({
          success: true,
          runId,
          status: searchEntry.status,
          message: searchEntry.status === 'error' ? searchEntry.error : 'Search in progress',
          query: searchEntry.query,
          timestamp: searchEntry.timestamp.toISOString(),
          retryAfter: 3000 // Add a retry suggestion in 3 seconds
        });
        
        // Short cache for in-progress searches
        response.headers.set('Cache-Control', `public, max-age=${SHORT_CACHE}, s-maxage=${SHORT_CACHE}`);
        return response;
      }
      
      // If search is completed and we have results
      if (searchEntry && searchEntry.status === 'completed' && searchEntry.results) {
        console.log(`Successfully retrieved results for runId: ${runId} from cache`);
        
        const response = NextResponse.json({
          success: true,
          runId: searchEntry.runId,
          status: 'completed',
          query: searchEntry.query,
          results: searchEntry.results,
          timestamp: searchEntry.timestamp.toISOString()
        });
        
        // Long cache for completed searches
        response.headers.set('Cache-Control', `public, max-age=${LONG_CACHE}, s-maxage=${LONG_CACHE}`);
        return response;
      }
      
      // If we don't have the entry in cache
      return NextResponse.json({
        success: false,
        error: 'Results not found',
        message: 'No data available for the provided runId'
      }, { status: 404 });
    }
    
    // Case 2: If a query is provided, find results for that query
    if (query) {
      console.log(`Looking up results for query: ${query}`);
      const searchEntry = searchCache.findSearchByQuery(query);
      
      if (searchEntry) {
        // If the search is in progress, return the current status
        if (searchEntry.status !== 'completed') {
          const response = NextResponse.json({
            success: true,
            runId: searchEntry.runId,
            query,
            status: searchEntry.status,
            message: searchEntry.status === 'error' ? searchEntry.error : 'Search in progress',
            timestamp: searchEntry.timestamp.toISOString()
          });
          
          // Short cache for in-progress searches
          response.headers.set('Cache-Control', `public, max-age=${SHORT_CACHE}, s-maxage=${SHORT_CACHE}`);
          return response;
        }
        
        // If completed, include the results
        const response = NextResponse.json({
          success: true,
          runId: searchEntry.runId,
          query,
          status: 'completed',
          results: searchEntry.results || [],
          timestamp: searchEntry.timestamp.toISOString()
        });
        
        // Medium cache for query-based results
        response.headers.set('Cache-Control', `public, max-age=${MEDIUM_CACHE}, s-maxage=${MEDIUM_CACHE}`);
        return response;
      }
      
      console.log(`No results found for query "${query}"`);
      return NextResponse.json({
        success: false,
        error: 'No results found',
        query
      }, { status: 404 });
    }
    
    // Case 3: No specific parameters, list all available searches from memory cache
    console.log('Listing all available searches from memory cache');
    
    // Get all entries from memory cache
    const cacheState = searchCache.dumpCacheState();
    const entries = (cacheState as any).entries || [];
    
    // Format the response
    const results = entries.map(entry => ({
      runId: entry.runId,
      query: entry.query,
      status: entry.status,
      timestamp: entry.timestamp,
      hasResults: entry.hasResults > 0
    }));
    
    // Sort by timestamp (newest first)
    results.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    const response = NextResponse.json({
      success: true,
      count: results.length,
      results
    });
    
    // Medium cache for listing
    response.headers.set('Cache-Control', `public, max-age=${MEDIUM_CACHE}, s-maxage=${MEDIUM_CACHE}`);
    return response;
    
  } catch (error) {
    console.error('Error in results API:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve results',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
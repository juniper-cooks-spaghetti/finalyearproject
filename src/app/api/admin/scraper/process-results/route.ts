import { NextRequest, NextResponse } from 'next/server';
import dbSearchService from '@/lib/dbSearchService';
import type { SearchResult } from '@/lib/dbSearchService';

// Modern Next.js App Router config format
export const dynamic = 'force-dynamic';
export const maxDuration = 10; // Keeping within Vercel Hobby tier limits

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

/**
 * Background process to handle search results
 * This is called from the webhook handler to process results asynchronously
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request data - either from URL params or body
    const searchParams = request.nextUrl.searchParams;
    let runId = searchParams.get('runId');
    let datasetId = searchParams.get('datasetId');
    
    // If not in URL params, try to get from body
    let query: string | null = searchParams.get('query');
    
    if (!runId || !datasetId) {
      // Try to get from request body
      const body = await request.json();
      if (body.runId) runId = body.runId;
      if (body.datasetId) datasetId = body.datasetId;
      if (body.query) query = body.query;
    }
    
    // Log received parameters
    console.log('Process results received:', { runId, datasetId, query });
    
    if (!runId || !datasetId) {
      console.error('Missing required parameters: runId and datasetId');
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }
    
    // Validate Apify API token
    if (!APIFY_API_TOKEN) {
      console.error('Missing Apify API token');
      await dbSearchService.errorSearch(runId, 'Missing Apify API token');
      return NextResponse.json({
        success: false,
        error: 'Apify API token not configured'
      }, { status: 500 });
    }
    
    // Try to get the search entry from the database to get the query if not provided
    if (!query || query === "unknown_query" || query === "search_query") {
      const searchEntry = await dbSearchService.getSearchById(runId);
      if (searchEntry && searchEntry.query) {
        query = searchEntry.query;
        console.log(`Retrieved query from database: "${query}"`);
      } else {
        query = "unknown_query"; // Fallback
      }
    }
    
    console.log(`Processing search results for runId: ${runId}, datasetId: ${datasetId}, query: "${query}"`);
    
    // Fetch results from Apify API - using items endpoint for better performance
    const apiUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}`;
    console.log(`Fetching results from ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch dataset (${response.status}): ${errorText}`);
      await dbSearchService.errorSearch(runId, `Failed to fetch dataset: ${response.status} ${errorText}`);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch dataset',
        runId,
        datasetId
      }, { status: 500 });
    }
    
    // Parse results
    const rawResults = await response.json();
    console.log(`Retrieved dataset with ${Array.isArray(rawResults) ? rawResults.length : 'unknown'} items`);
    
    // Update query if still needed from raw results
    if ((query === "unknown_query" || query === "search_query") && Array.isArray(rawResults) && rawResults.length > 0) {
      // Extract query from the first result if possible
      if (rawResults[0]?.searchQuery?.term) {
        query = rawResults[0].searchQuery.term;
        console.log(`Extracted query from results: "${query}"`);
      }
    }
    
    // Process results
    const transformedResults = await transformApifyResults(rawResults);
    console.log(`Transformed ${transformedResults.length} search results`);
    
    // Store results in database
    await dbSearchService.completeSearch(runId, transformedResults);
    
    return NextResponse.json({
      success: true,
      message: 'Successfully processed search results',
      runId,
      resultsCount: transformedResults.length
    });
  } catch (error) {
    console.error('Error processing search results:', error);
    
    // Try to get runId from the request to update status
    const searchParams = request.nextUrl.searchParams;
    const runId = searchParams.get('runId');
    
    if (runId) {
      await dbSearchService.errorSearch(runId, error instanceof Error ? error.message : 'Unknown error');
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process search results',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Transform Apify results into a standard format
 * This function takes raw Apify search results and converts them to our internal format
 * Removed relevance scoring as it's no longer needed
 * @param rawResults The raw results from Apify
 * @returns An array of transformed search results
 */
async function transformApifyResults(rawResults: any): Promise<SearchResult[]> {
  try {
    // Handle case where rawResults is not an array
    if (!Array.isArray(rawResults)) {
      console.warn('Raw results is not an array:', typeof rawResults);
      return [];
    }
    
    // Filter out non-object items
    const validResults = rawResults.filter(item => typeof item === 'object' && item !== null);
    
    // Main search results are usually in the organic items
    const allResults: SearchResult[] = [];
    
    // Process only one page of results
    const page = validResults[0];
    if (!page || !page.organicResults) {
      console.warn('No organic results found in the data');
      return [];
    }
    
    // Extract organic results
    const organicResults = page.organicResults;
    if (!Array.isArray(organicResults)) {
      console.warn('Organic results is not an array:', typeof organicResults);
      return [];
    }
    
    // Transform each organic result
    for (const item of organicResults) {
      if (!item.title || !item.url) continue;
      
      // Determine content type and source
      let type = 'OTHER';
      let source = 'unknown';
      
      // Determine content type based on URL patterns
      if (item.url.includes('coursera.org/learn') || item.url.includes('coursera.org/professional-certificates')) {
        type = 'COURSE';
        source = 'coursera.org';
      } else if (item.url.includes('udemy.com/course')) {
        type = 'COURSE';
        source = 'udemy.com';
      } else if (item.url.includes('edx.org/learn') || item.url.includes('edx.org/course')) {
        type = 'COURSE';
        source = 'edx.org';
      } else if (item.url.includes('youtube.com/watch')) {
        type = 'VIDEO';
        source = 'youtube.com';
      } else if (item.url.includes('medium.com')) {
        type = 'ARTICLE';
        source = 'medium.com';
      } else if (item.url.includes('tutorial') || item.url.includes('guide')) {
        type = 'TUTORIAL';
        
        // Still extract domain for source
        try {
          const url = new URL(item.url);
          source = url.hostname.replace('www.', '');
        } catch (urlError) {
          console.warn('Error parsing URL:', urlError);
        }
      } else {
        // Default case - extract domain for source
        try {
          const url = new URL(item.url);
          source = url.hostname.replace('www.', '');
        } catch (urlError) {
          console.warn('Error parsing URL:', urlError);
        }
      }
      
      // Add to results - with fixed relevanceScore value since we're no longer calculating it
      allResults.push({
        title: item.title,
        url: item.url,
        description: item.description || '',
        type,
        source,
      });
    }
    
    // Sort by position in search results (natural order from Google)
    return allResults;
  } catch (error) {
    console.error('Error transforming search results:', error);
    return [];
  }
}
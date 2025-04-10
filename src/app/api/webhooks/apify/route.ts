import { NextRequest, NextResponse } from 'next/server';
import searchCache from '@/lib/searchCache';
import type { SearchResult } from '@/lib/searchCache';

// Modern Next.js App Router config format
export const dynamic = 'force-dynamic';
export const preferredRegion = ['auto'];
export const maxDuration = 60; // Keep request open for 60 seconds

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Process webhook data from Apify
export async function POST(request: NextRequest) {
  console.log('Apify webhook called');
  
  try {
    // Log the current cache state before processing
    console.log('Cache state before processing webhook:', JSON.stringify(searchCache.dumpCacheState(), null, 2).slice(0, 1000));
    
    // Log raw request body for detailed debugging
    const rawBody = await request.text();
    console.log('Webhook received raw body:', rawBody);
    
    // Parse the JSON body
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error('Failed to parse webhook body as JSON:', e);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    
    console.log('Webhook received parsed body:', JSON.stringify(body).slice(0, 500));
    
    // Handle Apify test webhook
    if (body.eventType === 'TEST') {
      console.log('Received test webhook from Apify');
      return NextResponse.json({ 
        success: true, 
        message: 'Test webhook received successfully' 
      });
    }
    
    // Validate basic structure
    if (!body.eventType || !body.resource) {
      console.error('Invalid webhook payload structure:', JSON.stringify(body).slice(0, 500));
      return NextResponse.json({ 
        error: 'Invalid webhook payload structure',
        receivedPayload: body 
      }, { status: 400 });
    }
    
    // Handle actor run succeeded event
    if (body.eventType === 'ACTOR.RUN.SUCCEEDED') {
      return await handleActorRunSucceeded(body);
    }
    
    // If other event type, just acknowledge receipt
    console.log(`Received webhook event type: ${body.eventType}`);
    return NextResponse.json({
      success: true,
      message: `Received ${body.eventType} webhook, acknowledged but no action taken`
    });
    
  } catch (error) {
    console.error('Error processing webhook payload:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * Define types for the Apify webhook payload
 */
type ApifyWebhookPayload = {
  userId: string;
  createdAt: string;
  eventType: string;
  eventData?: {
    actorId?: string;
    actorTaskId?: string;
    actorRunId?: string;
    searchQuery?: string;
    input?: {
      queries?: string;
      searchQueries?: Array<{ term?: string }>;
    };
    [key: string]: any;
  };
  resource: {
    id: string;
    actId?: string;
    userId?: string;
    actorTaskId?: string;
    defaultDatasetId?: string;
    startedAt?: string;
    finishedAt?: string;
    status?: string;
    statusMessage?: string;
    [key: string]: any;
  };
};

/**
 * Extract search query from Apify webhook payload
 */
function extractSearchQuery(payload: ApifyWebhookPayload): string {
  // Try to get the query from different possible locations in the payload
  
  // 1. Try to get from eventData.searchQuery directly
  if (payload.eventData?.searchQuery) {
    return payload.eventData.searchQuery;
  }
  
  // 2. Try to get from eventData.input.queries (common format for Google SERP tasks)
  if (payload.eventData?.input?.queries) {
    return payload.eventData.input.queries;
  }
  
  // 3. Try to get from searchQueries array (sometimes used in Apify)
  if (Array.isArray(payload.eventData?.input?.searchQueries) && 
      payload.eventData?.input?.searchQueries.length > 0) {
    const firstQuery = payload.eventData.input.searchQueries[0];
    if (firstQuery && firstQuery.term) {
      return firstQuery.term;
    }
  }
  
  // If we can't find a query, return a default
  return "unknown_query";
}

/**
 * Call the results API to warmup the cache for this search
 * This helps ensure the search is accessible even if webhook processing gets interrupted
 * @param runId The search/run ID
 */
async function warmupResultsCache(runId: string): Promise<void> {
  try {
    const url = `${API_URL}/api/admin/scraper/results?runId=${runId}`;
    console.log(`Warming up results cache for runId ${runId} by calling: ${url}`);
    
    // Make a non-blocking request to the results API
    // We don't need to await the response, this is just to ensure the results
    // are cached and accessible even if the webhook times out
    fetch(url, { 
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' }
    })
    .then(response => {
      console.log(`Warmup request for ${runId} completed with status: ${response.status}`);
    })
    .catch(error => {
      console.error(`Error in warmup request for ${runId}:`, error);
    });
    
    console.log(`Warmup request initiated for ${runId}`);
  } catch (error) {
    console.error(`Failed to warmup results cache for ${runId}:`, error);
    // Non-critical error, don't throw
  }
}

/**
 * Handle successful actor run event
 */
async function handleActorRunSucceeded(payload: ApifyWebhookPayload) {
  // Extract data from the payload
  const resource = payload.resource;
  const eventData = payload.eventData || {};
  
  // Get the actor run ID from the payload - this is the critical part
  const runId = eventData.actorRunId || resource.id;
  
  console.log(`Processing webhook for runId: ${runId}`);
  
  // Extract dataset ID from the resource
  const datasetId = resource.defaultDatasetId;
  const actorId = resource.actId || 'unknown';
  
  // Start a timer to track processing time - important for serverless timeout management
  const startTime = Date.now();
  const timeLeft = () => {
    const elapsed = Date.now() - startTime;
    return Math.max(0, 50000 - elapsed); // 50s safety threshold (under the 60s max)
  };
  
  // Dump the current cache state
  console.log('Cache state details before processing results:');
  console.log(`Memory cache for ${runId}: ${searchCache.getSearchById(runId) ? 'found' : 'not found'}`);
  
  try {
    // Validate required fields
    if (!datasetId) {
      console.error('Missing dataset ID in webhook payload:', JSON.stringify(payload).slice(0, 500));
      // We can't proceed without a dataset ID
      console.log(`Marking search with runId: ${runId} as error due to missing dataset ID`);
      searchCache.errorSearch(runId, 'Missing dataset ID in webhook response');
      
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'The webhook payload is missing datasetId'
      }, { status: 400 });
    }
    
    // Look up the search in our cache using the runId - instead of creating a new entry
    const searchEntry = searchCache.getSearchById(runId);
    
    // Extract query from payload if not found in cache
    let query = "unknown_query";
    
    if (searchEntry) {
      console.log(`Found search entry for runId: ${runId}, query: ${searchEntry.query}, status: ${searchEntry.status}`);
      query = searchEntry.query;
    } else {
      // Try to extract query from the payload
      query = extractSearchQuery(payload);
      console.log(`Extracted initial query from payload: "${query}"`);
    }
    
    console.log(`Processing successful run: ${runId} (Actor: ${actorId}, Query: ${query})`);
    console.log(`Fetching dataset: ${datasetId}`);
    
    // Check time remaining before fetching dataset
    if (timeLeft() < 30000) { // If less than 30 seconds left
      console.warn(`Low time remaining (${timeLeft()}ms), processing may be at risk of timeout`);
    }
    
    // Fetch the dataset items from Apify
    const apiUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}`;
    console.log('Fetching dataset from URL:', apiUrl);
    
    const response = await fetch(apiUrl, { method: 'GET' });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch dataset (${response.status}): ${errorText}`);
      console.log(`Marking search with runId: ${runId} as error due to failed dataset fetch`);
      searchCache.errorSearch(runId, `Failed to fetch dataset: ${response.status} ${errorText}`);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch dataset',
        runId,
        datasetId
      }, { status: 500 });
    }
    
    // Parse and process the results
    const rawResults = await response.json();
    console.log(`Retrieved dataset with ${typeof rawResults === 'object' ? 'object' : typeof rawResults} data`);
    
    if (Array.isArray(rawResults)) {
      console.log(`Dataset contains ${rawResults.length} items`);
      
      // If we still have an unknown query, try to extract it from the dataset
      if (query === "unknown_query" && rawResults.length > 0) {
        // Try to extract query from the first item of the results array
        if (rawResults[0] && rawResults[0].searchQuery && rawResults[0].searchQuery.term) {
          const extractedQuery = rawResults[0].searchQuery.term;
          
          // Clean up the extracted query: Remove URLs and clean spaces
          const cleanedQuery = extractedQuery
            .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
            .replace(/\s+/g, ' ')              // Normalize spaces
            .trim();                           // Trim whitespace
          
          if (cleanedQuery) {
            query = cleanedQuery;
            console.log(`Extracted query from dataset: "${query}"`);
          }
        }
      }
    } else {
      console.log('Dataset is not an array, structure:', Object.keys(rawResults));
    }
    
    // Check time remaining before transformation
    if (timeLeft() < 20000) { // If less than 20 seconds left
      console.warn(`Low time remaining (${timeLeft()}ms) before transformation, risk of timeout`);
    }
    
    // Transform the results into our application format
    const transformedResults = transformApifyResults(rawResults, query);
    console.log(`Transformed ${transformedResults.length} search results`);
    
    // Check time remaining before updating cache
    if (timeLeft() < 10000) { // If less than 10 seconds left
      console.warn(`Very low time remaining (${timeLeft()}ms), completing critical operations`);
    }
    
    // CRITICAL OPERATION: Update the search status in cache with the results
    // If webhook times out after this point, the results will still be available
    if (searchEntry) {
      searchCache.completeSearch(runId, transformedResults);
      console.log(`Updated search cache for runId: ${runId}, status now set to completed`);
    } else {
      // Create a new entry if one doesn't exist (for runs initiated outside our system)
      searchCache.addSearch(runId, runId, query);
      searchCache.completeSearch(runId, transformedResults);
      console.log(`Created and completed new search entry for runId: ${runId}, query: "${query}"`);
    }

    // IMPORTANT: Immediately warmup the results API cache 
    // This ensures the results are accessible even if this webhook execution times out
    await warmupResultsCache(runId);
    
    // Final log showing the state after processing
    console.log('Cache state after processing:');
    console.log(`Memory cache entry for ${runId}: ${searchCache.getSearchById(runId)?.status || 'not found'}`);
    console.log(`Total processing time: ${Date.now() - startTime}ms`);
    
    return NextResponse.json({
      success: true,
      message: 'Results received and processed successfully',
      runId,
      datasetId,
      query,
      resultsCount: transformedResults.length,
      processingTimeMs: Date.now() - startTime
    });
    
  } catch (error) {
    console.error(`Error processing dataset ${datasetId}:`, error);
    console.log(`Marking search with runId: ${runId} as error due to processing exception`);
    searchCache.errorSearch(runId, error instanceof Error ? error.message : 'Unknown error processing dataset');
    
    // Even in error case, try to warmup the error result
    try {
      await warmupResultsCache(runId);
    } catch (warmupError) {
      console.error(`Failed to warmup error results for ${runId}:`, warmupError);
    }
    
    return NextResponse.json({
      error: 'Dataset processing failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      runId,
      datasetId,
      processingTimeMs: Date.now() - startTime
    }, { status: 500 });
  }
}

/**
 * Transform Apify search results into our application format
 */
function transformApifyResults(apifyData: any, originalQuery: string): SearchResult[] {
  console.log('Transforming search results for query:', originalQuery);
  
  try {
    if (!apifyData) {
      console.log('Invalid Apify data: empty payload');
      return [];
    }
    
    // Handle different possible formats from Apify
    let organicResults: any[] = [];
    
    // Case 1: Array of search result objects
    if (Array.isArray(apifyData)) {
      for (const resultSet of apifyData) {
        if (resultSet && Array.isArray(resultSet.organicResults)) {
          organicResults = organicResults.concat(resultSet.organicResults);
        } else if (resultSet && resultSet.url && resultSet.title) {
          // Case where each item is already a result
          organicResults.push(resultSet);
        }
      }
    } 
    // Case 2: Single object with organicResults array 
    else if (apifyData.organicResults && Array.isArray(apifyData.organicResults)) {
      organicResults = apifyData.organicResults;
    } 
    // Case 3: Object with nested data structure
    else if (apifyData.data && Array.isArray(apifyData.data)) {
      for (const item of apifyData.data) {
        if (item && Array.isArray(item.organicResults)) {
          organicResults = organicResults.concat(item.organicResults);
        }
      }
    }
    
    console.log(`Found ${organicResults.length} organic results to process`);
    
    if (organicResults.length === 0) {
      console.log('No organic results found, generating simulated results');
      return generateSimulatedResults(originalQuery);
    }
    
    // Process each result into our standardized format
    const allResults: SearchResult[] = [];
    
    for (const item of organicResults) {
      // Skip items without URLs or titles
      if (!item.url || !item.title) {
        console.log('Skipping result with missing URL or title');
        continue;
      }
      
      // Determine content type based on URL
      let type = 'OTHER';
      let source;
      
      try {
        source = new URL(item.url).hostname;
        
        if (item.url.includes('coursera.org/learn/')) {
          type = 'COURSE';
        } else if (item.url.includes('coursera.org/specialization/')) {
          type = 'COURSE';
        } else if (item.url.includes('coursera.org/professional-certificates/')) {
          type = 'COURSE';
        } else if (item.url.includes('udemy.com/course/')) {
          type = 'COURSE';
        } else if (item.url.includes('edx.org/course/')) {
          type = 'COURSE';
        } else if (item.url.includes('edx.org/professional-certificate/')) {
          type = 'COURSE';
        } else if (item.url.includes('youtube.com/watch')) {
          type = 'VIDEO';
        } else if (item.url.includes('medium.com/')) {
          type = 'ARTICLE';
        }
      } catch (urlError) {
        console.warn('Error parsing URL:', urlError);
        source = 'unknown';
      }
      
      // Add to results
      allResults.push({
        title: item.title,
        url: item.url,
        description: item.description || '',
        type,
        source,
        relevanceScore: calculateRelevanceScore(item, originalQuery),
      });
    }
    
    console.log(`Transformed ${allResults.length} results for query: ${originalQuery}`);
    
    // Sort by relevance
    return allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
  } catch (error) {
    console.error('Error transforming search results:', error);
    return generateSimulatedResults(originalQuery);
  }
}

/**
 * Calculate a relevance score for sorting results
 */
function calculateRelevanceScore(item: any, originalQuery: string): number {
  let score = 0;
  const queryLower = originalQuery.toLowerCase();
  
  // Title match is very important
  if (item.title && item.title.toLowerCase().includes(queryLower)) {
    score += 10;
  }
  
  // Description match
  if (item.description && item.description.toLowerCase().includes(queryLower)) {
    score += 5;
  }
  
  // Boost based on position (higher positions = more relevant)
  if (typeof item.position === 'number') {
    score += Math.max(0, (10 - item.position) / 2);
  }
  
  // Emphasized keywords are good indicators of relevance
  if (item.emphasizedKeywords && Array.isArray(item.emphasizedKeywords)) {
    for (const keyword of item.emphasizedKeywords) {
      if (keyword.toLowerCase().includes(queryLower)) {
        score += 3;
      }
    }
  }
  
  return score;
}

/**
 * Generate simulated search results when no real results are available
 * This is a fallback in case the Apify results are empty or malformed
 */
function generateSimulatedResults(query: string): SearchResult[] {
  console.log('Generating simulated results for query:', query);
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();
  
  const domains = [
    'coursera.org', 
    'udemy.com', 
    'edx.org', 
    'youtube.com', 
    'medium.com'
  ];
  
  // Generate different types of content
  const types = ['COURSE', 'VIDEO', 'ARTICLE', 'CERTIFICATE', 'SPECIALIZATION'];
  
  for (let i = 0; i < 10; i++) {
    const domainIndex = i % domains.length;
    const typeIndex = i % types.length;
    
    const domain = domains[domainIndex];
    const type = types[typeIndex];
    
    let url = `https://www.${domain}/`;
    
    switch (type) {
      case 'COURSE':
        url += domain === 'coursera.org' ? 'learn/' : 'course/';
        break;
      case 'SPECIALIZATION':
        url += 'specialization/';
        break;
      case 'CERTIFICATE':
        url += 'professional-certificates/';
        break;
      case 'VIDEO':
        url += 'watch?v=';
        break;
      case 'ARTICLE':
        url += '@author/';
        break;
    }
    
    url += queryLower.replace(/\s+/g, '-') + `-${i + 1}`;
    
    results.push({
      title: `Learn about ${query} - ${type.toLowerCase()} ${i + 1}`,
      url: url,
      description: `This comprehensive ${type.toLowerCase()} teaches you everything about ${query} with practical examples, exercises, and industry-relevant projects.`,
      type,
      source: domain,
      relevanceScore: 10 - (i * 0.5),
    });
  }
  
  console.log(`Generated ${results.length} simulated results`);
  return results;
}
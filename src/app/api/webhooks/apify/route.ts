import { NextRequest, NextResponse } from 'next/server';
import dbSearchService from '@/lib/dbSearchService';
import type { SearchResult } from '@/lib/dbSearchService';
import { prisma } from '@/lib/prisma';

// Modern Next.js App Router config format - Adjusted for Vercel Hobby tier
export const dynamic = 'force-dynamic';
export const preferredRegion = ['auto'];
export const maxDuration = 10; // Reduced to 10 seconds for Vercel Hobby tier

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Process webhook data from Apify
export async function POST(request: NextRequest) {
  console.log('Apify webhook called');
  
  try {
    // Get request body
    const rawBody = await request.text();
    
    // Parse the JSON body
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error('Failed to parse webhook body as JSON:', e);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    
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
        error: 'Invalid webhook payload structure'
      }, { status: 400 });
    }
    
    // Handle actor run succeeded event
    if (body.eventType === 'ACTOR.RUN.SUCCEEDED') {
      // Extract minimal data needed
      const runId = body.eventData?.actorRunId || body.resource.id;
      const datasetId = body.resource.defaultDatasetId;
      
      console.log(`Webhook received for runId=${runId}, datasetId=${datasetId}`);
      
      if (!runId || !datasetId) {
        console.error('Missing required fields in webhook payload');
        return NextResponse.json({
          error: 'Missing required fields',
          message: 'The webhook payload is missing runId or datasetId'
        }, { status: 400 });
      }
      
      // IMPORTANT: Look up the search query from our database using the runId
      // This solves the issue of search_query being used as fallback
      const existingSearch = await prisma.searchCache.findUnique({
        where: { runId }
      });
      
      let query = 'unknown_query';
      
      if (existingSearch) {
        // We found the search in our database, use its query
        query = existingSearch.query;
        console.log(`Found existing search in database with query="${query}"`);
      } else {
        // If we can't find it in the database, try to extract it from the webhook payload
        query = extractSearchQuery(body);
        console.log(`No existing search found in database, extracted query="${query}" from webhook`);
        
        // Register the search if it doesn't exist yet
        await dbSearchService.addSearch(runId, query);
        console.log(`Registered new search in database: runId=${runId}, query="${query}"`);
      }
      
      console.log(`Processing search results for runId=${runId}, datasetId=${datasetId}, query="${query}"`);

      // Trigger background processing by calling a separate API endpoint
      // This allows the webhook to return quickly within the 10-second limit
      try {
        const processUrl = `${API_URL}/api/admin/scraper/process-results?runId=${runId}&datasetId=${datasetId}&query=${encodeURIComponent(query)}`;
        fetch(processUrl, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ runId, datasetId, query })
        }).catch(err => console.error('Error triggering background process:', err));
        
        console.log(`Triggered background processing for runId: ${runId}, datasetId: ${datasetId}, query: "${query}"`);
      } catch (error) {
        console.error('Error starting background processing:', error);
      }
      
      // Return success quickly to avoid timeout
      return NextResponse.json({
        success: true,
        message: 'Webhook received, background processing started',
        runId,
        datasetId,
        query
      });
    }
    
    // If other event type, just acknowledge receipt
    return NextResponse.json({
      success: true,
      message: `Received ${body.eventType} webhook, acknowledged but no action taken`
    });
    
  } catch (error) {
    console.error('Error processing webhook payload:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
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
  searchQuery?: string; // Added field based on our custom payload template
  customData?: {
    originalQuery?: string; // Added field to store our original search query
    [key: string]: any;
  };
  eventData?: {
    actorId?: string;
    actorTaskId?: string;
    actorRunId?: string;
    searchQuery?: string;
    input?: {
      queries?: string;
      searchQueries?: Array<{ term?: string }>;
      customData?: {
        originalQuery?: string;
      };
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
  // Try to get from different possible locations in the payload
  
  // 1. Try to get from top level searchQuery (from our payload template)
  if (payload.searchQuery) {
    console.log(`Found searchQuery in payload: "${payload.searchQuery}"`);
    return payload.searchQuery;
  }
  
  // 2. Try to get from customData field (from our payload template)
  if (payload.customData?.originalQuery) {
    console.log(`Found originalQuery in customData: "${payload.customData.originalQuery}"`);
    return payload.customData.originalQuery;
  }
  
  // 3. Try to get from eventData.searchQuery directly
  if (payload.eventData?.searchQuery) {
    console.log(`Found searchQuery in eventData: "${payload.eventData.searchQuery}"`);
    return payload.eventData.searchQuery;
  }
  
  // 4. Try to get from eventData.input.customData.originalQuery
  if (payload.eventData?.input?.customData?.originalQuery) {
    console.log(`Found originalQuery in eventData.input.customData: "${payload.eventData.input.customData.originalQuery}"`);
    return payload.eventData.input.customData.originalQuery;
  }
  
  // 5. Try to get from eventData.input.queries (common format for Google SERP tasks)
  // But extract just the topic part without the site restrictions
  if (payload.eventData?.input?.queries) {
    const queriesString = payload.eventData.input.queries as string;
    // Try to extract just the topic name by getting text before "learn tutorial course"
    const match = queriesString.match(/^(.*?)(?:\s+learn\s+tutorial\s+course|$)/i);
    if (match && match[1]) {
      const cleanQuery = match[1].trim();
      console.log(`Extracted topic name from queries: "${cleanQuery}"`);
      return cleanQuery;
    }
    console.log(`Using full queries string: "${queriesString}"`);
    return queriesString;
  }
  
  // 6. Try to get from searchQueries array
  if (Array.isArray(payload.eventData?.input?.searchQueries) && 
      payload.eventData?.input?.searchQueries.length > 0) {
    const firstQuery = payload.eventData.input.searchQueries[0];
    if (firstQuery && firstQuery.term) {
      console.log(`Found term in searchQueries[0]: "${firstQuery.term}"`);
      return firstQuery.term;
    }
  }
  
  // Generate a unique placeholder instead of a generic string
  // This will prevent duplicate runs but still indicate a problem
  const uniqueFallback = `unknown_query_${Date.now()}`;
  console.warn(`Could not find query in webhook payload, using fallback: "${uniqueFallback}"`);
  return uniqueFallback;
}
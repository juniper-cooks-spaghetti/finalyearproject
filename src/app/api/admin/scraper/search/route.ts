import { NextRequest, NextResponse } from 'next/server';
import searchCache from '@/lib/searchCache';
import { v4 as uuidv4 } from 'uuid';

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_TASK_ID = process.env.APIFY_TASK_ID;
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Define type for search API request
interface SearchRequest {
  query: string;
  domains?: string[];
}

// Modern Next.js App Router config format
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SearchRequest;
    const { query, domains } = body;
    
    console.log('Search API received request:', { query, domains });
    
    if (!query || query.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Query is required'
      }, { status: 400 });
    }
    
    if (!APIFY_API_TOKEN || !APIFY_TASK_ID) {
      console.error('Missing Apify configuration');
      return NextResponse.json({
        success: false,
        error: 'Search service is not properly configured'
      }, { status: 500 });
    }
    
    // Check if we already have cached results for this query
    const cachedSearch = searchCache.findSearchByQuery(query);
    
    if (cachedSearch && cachedSearch.status === 'completed' && cachedSearch.results) {
      console.log(`Found cached results for query "${query}"`);
      return NextResponse.json({
        success: true,
        cached: true,
        searchId: cachedSearch.searchId,
        runId: cachedSearch.runId,
        results: cachedSearch.results,
        status: 'completed'
      });
    }
    
    // Format the domain URLs for the Apify task
    let formattedQuery = query.trim();

    // Add domains to the query if provided
    if (domains && domains.length > 0) {
      formattedQuery = `${formattedQuery} ${domains.join(' ')}`;
    }
    
    // Create a unique search ID for this request - we'll use UUID for our internal tracking
    const searchId = uuidv4();
    
    // Build the webhook URL - this is where Apify will send the results
    const webhookUrl = `${API_URL}/api/webhooks/apify`;
    console.log('Using webhook URL:', webhookUrl);
    
    // Prepare the request body for Apify
    const requestBody = {
      // These are the fields expected by the Google Search Results Scraper
      "queries": formattedQuery,
      "countryCode": "us",  // We'll use US results for consistency
      "languageCode": "en", // English results
      "resultsPerPage": 20, // Number of results per search page
      "maxPagesPerQuery": 1, // Only fetch first page for faster results
      "mobileResults": false, // Desktop results only
      "saveHtml": false, // No need to save HTML content
      "saveHtmlToKeyValueStore": false,
      "includeUnfilteredResults": true, // Get more results
      // Configure the webhook
      "webhooks": [{
        "eventTypes": ["ACTOR.RUN.SUCCEEDED"],
        "requestUrl": webhookUrl
      }]
    };

    console.log('Sending request to Apify with payload:', JSON.stringify(requestBody).slice(0, 1000));
    
    // Call Apify API to start the search
    const response = await fetch(`https://api.apify.com/v2/actor-tasks/${APIFY_TASK_ID}/runs?token=${APIFY_API_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Apify API error (${response.status}):`, errorText);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to start search task',
        details: errorText
      }, { status: 500 });
    }

    // Parse the Apify response
    const data = await response.json();
    console.log('Apify API response:', JSON.stringify(data, null, 2).slice(0, 1000));
    
    if (!data.data || !data.data.id) {
      console.error('Invalid response from Apify:', data);
      return NextResponse.json({
        success: false, 
        error: 'Invalid Apify response format',
        details: 'API response did not contain run ID'
      }, { status: 500 });
    }
    
    // Get the run ID - this will be our primary key for tracking this search
    const runId = data.data.id;
    console.log(`Apify search started with runId: ${runId}`);
    
    // Register this search in our cache with pending status
    searchCache.addSearch(runId, searchId, query);
    console.log(`Registered search in cache: runId=${runId}, searchId=${searchId}, query="${query}"`);
    
    // Return success response with runId
    return NextResponse.json({
      success: true,
      message: 'Search initiated successfully',
      searchId,
      runId,
      status: 'pending'
    });
    
  } catch (error) {
    console.error('Error in search API:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Search request failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
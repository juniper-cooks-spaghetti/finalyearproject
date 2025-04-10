import { NextRequest, NextResponse } from 'next/server';
import dbSearchService from '@/lib/dbSearchService';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_TASK_ID = process.env.APIFY_TASK_ID;
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Define type for search API request
interface SearchRequest {
  query: string;
  domains?: string[];
  topicOnly?: boolean; // Parameter to indicate topic-based search
  topicId?: string; // Optional topic ID for tracking
}

// Modern Next.js App Router config format
export const dynamic = 'force-dynamic';
export const maxDuration = 10; // Keep within Vercel Hobby tier limits

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SearchRequest;
    let { query, domains, topicOnly = false, topicId } = body;
    
    console.log('Search API received request:', { query, domains, topicOnly, topicId });
    
    if (!query || query.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Query is required'
      }, { status: 400 });
    }
    
    if (!domains || domains.length === 0) {
      console.warn('No domains provided in search request, defaulting to general search');
      domains = []; // Default to empty array for general search
    }
    
    // A variable to hold the actual search query we'll send to Apify
    let searchQuery = query.trim();
    let matchingTopic = null;
    
    // If topicOnly is true or we have a topicId, let's find the corresponding topic
    if (topicOnly || topicId) {
      // If we have a topicId, use that to find the topic
      if (topicId) {
        matchingTopic = await prisma.topic.findUnique({
          where: { id: topicId },
          select: { id: true, title: true }
        });
      } else {
        // Otherwise use the query to find a matching topic
        matchingTopic = await prisma.topic.findFirst({
          where: {
            title: {
              contains: query,
              mode: 'insensitive'
            }
          },
          select: { id: true, title: true }
        });
      }
      
      if (!matchingTopic) {
        return NextResponse.json({
          success: false,
          error: 'No matching topic found',
          message: 'Please enter a valid topic name'
        }, { status: 404 });
      }
      
      // Use the exact topic title as the search query
      searchQuery = matchingTopic.title;
      console.log(`Using topic title "${searchQuery}" as search query`);
      
      // No longer need to track topic searches since we removed that functionality
      // await dbSearchService.trackTopicSearch(matchingTopic.id); // Removed this line
    }
    
    if (!APIFY_API_TOKEN || !APIFY_TASK_ID) {
      console.error('Missing Apify configuration');
      return NextResponse.json({
        success: false,
        error: 'Search service is not properly configured'
      }, { status: 500 });
    }
    
    // Check if we already have cached results for this query
    const cachedSearch = await dbSearchService.findSearchByQuery(searchQuery);
    
    if (cachedSearch && cachedSearch.status === 'completed' && cachedSearch.results) {
      console.log(`Found cached results for query "${searchQuery}"`);
      
      // If domains were specified, filter the cached results to only include those domains
      let filteredResults = cachedSearch.results;
      if (domains && domains.length > 0) {
        console.log(`Filtering cached results for domains:`, domains);
        // Filter results to only include those from the specified domains
        filteredResults = cachedSearch.results.filter(result => 
          domains.some(domain => result.url.includes(domain))
        );
        
        console.log(`After filtering: ${filteredResults.length} of ${cachedSearch.results.length} results match domains`);
      }
      
      return NextResponse.json({
        success: true,
        cached: true,
        searchId: cachedSearch.searchId,
        runId: cachedSearch.runId,
        results: filteredResults,
        status: 'completed'
      });
    }

    // Format the search query based on selected domains
    let formattedQuery = searchQuery;
    
    // Add domains to the query if provided
    if (domains && domains.length > 0) {
      // Format specific site restrictions for better filtering in Google search
      const siteParts = domains.map(domain => {
        // Extract the domain part (remove http/https, www, and paths)
        let cleanDomain = domain;
        try {
          if (domain.startsWith('http')) {
            const url = new URL(domain);
            cleanDomain = url.hostname;
          } else if (domain.includes('/')) {
            cleanDomain = domain.split('/')[0];
          }
          
          // Remove www. prefix if present
          cleanDomain = cleanDomain.replace(/^www\./, '');
        } catch (e) {
          console.warn('Error parsing domain:', domain, e);
        }
        
        return `site:${cleanDomain}`;
      });
      
      // Join with OR for Google search syntax
      const siteRestrictions = siteParts.join(' OR ');
      
      // Simplify to just the topic name and site restrictions
      // This maintains the pure topic name for caching while still filtering by site
      formattedQuery = `${searchQuery} ${siteRestrictions}`;
    }
    
    console.log(`Formatted search query: "${formattedQuery}"`);
    
    // Create a unique search ID for this request
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
      // Store the original search query for extraction in the webhook
      "customData": {
        "originalQuery": searchQuery,
        "domains": domains
      },
      // Configure the webhook
      "webhooks": [{
        "eventTypes": ["ACTOR.RUN.SUCCEEDED"],
        "requestUrl": webhookUrl,
        "payloadTemplate": JSON.stringify({
          "runId": "{{resource.id}}",
          "datasetId": "{{resource.defaultDatasetId}}",
          "searchQuery": searchQuery, // Original search query from topic
          "originalQuery": searchQuery, // Duplicate for redundancy
          "domains": domains, // Include the domains to filter by
          "actorRunId": "{{eventData.actorRunId}}"
        })
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
    
    // Get the run ID from Apify
    const apifyRunId = data.data.id;
    console.log(`Apify search started with runId: ${apifyRunId}`);
    
    // Register this search in our database cache with pending status BEFORE the webhook is received
    // This is crucial - we need to associate the search query with the runId in our database
    // so that when the webhook comes in with just the runId, we can look up the query
    await dbSearchService.addSearch(apifyRunId, searchQuery);
    console.log(`Registered search in database: runId=${apifyRunId}, query="${searchQuery}"`);
    
    // No need to store domains as metadata since the schema doesn't support it
    // Instead, log the domains for debugging purposes
    if (domains && domains.length > 0) {
      console.log(`Search ${apifyRunId} includes domains:`, domains);
      // We could consider updating the schema to include domains in the future if needed
    }
    
    // Return success response with runId
    return NextResponse.json({
      success: true,
      message: 'Search initiated successfully',
      searchId,
      runId: apifyRunId,
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
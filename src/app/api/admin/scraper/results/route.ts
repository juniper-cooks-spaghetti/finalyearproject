import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import searchCache from '@/lib/searchCache';

const RESULTS_DIR = path.join(process.cwd(), 'data', 'search-results');

export async function GET(request: NextRequest) {
  try {
    // Get URL parameters
    const searchParams = request.nextUrl.searchParams;
    const runId = searchParams.get('runId');
    const query = searchParams.get('query');
    const filename = searchParams.get('filename');
    
    console.log('Results API called with params:', { runId, query, filename });
    
    // Ensure results directory exists
    await fs.mkdir(RESULTS_DIR, { recursive: true }).catch(err => {
      console.error('Error creating results directory:', err);
    });
    
    // Case 1: If a specific runId is provided - prioritize this case
    if (runId) {
      console.log(`Looking up results for runId: ${runId}`);
      
      // First check the cache for the current status
      const searchEntry = searchCache.getSearchById(runId);
      
      // If the search is in progress, return the current status
      if (searchEntry && (searchEntry.status === 'pending' || searchEntry.status === 'error')) {
        console.log(`Search ${runId} is ${searchEntry.status}`);
        return NextResponse.json({
          success: true,
          runId,
          status: searchEntry.status,
          message: searchEntry.status === 'error' ? searchEntry.error : 'Search in progress',
          query: searchEntry.query,
          timestamp: searchEntry.timestamp.toISOString(),
          retryAfter: 3000 // Add a retry suggestion in 3 seconds
        });
      }
      
      // If completed or no search entry found, try to read the results file directly
      try {
        const filePath = path.join(RESULTS_DIR, `${runId}.json`);
        const fileContent = await fs.readFile(filePath, 'utf8');
        const resultData = JSON.parse(fileContent);
        
        console.log(`Successfully retrieved results for runId: ${runId}`);
        
        // Return the full result data
        return NextResponse.json({
          success: true,
          runId: resultData.runId,
          status: 'completed',
          query: resultData.query,
          results: resultData.results,
          timestamp: resultData.timestamp
        });
      } catch (error) {
        console.error(`Error loading results for ${runId}:`, error);
        // If file doesn't exist but we have a cache entry, return that
        if (searchEntry) {
          return NextResponse.json({
            success: true,
            runId,
            status: searchEntry.status,
            message: 'Results file not found, but search is tracked',
            query: searchEntry.query,
            timestamp: searchEntry.timestamp.toISOString(),
            retryAfter: 2000 // Add a retry suggestion
          });
        }
        
        return NextResponse.json({
          success: false,
          error: 'Results not found',
          message: 'No data available for the provided runId'
        }, { status: 404 });
      }
    }
    
    // Case 2: If a specific filename is provided
    if (filename) {
      console.log(`Looking up file by name: ${filename}`);
      
      try {
        const filePath = path.join(RESULTS_DIR, filename);
        const fileContent = await fs.readFile(filePath, 'utf8');
        const resultData = JSON.parse(fileContent);
        
        return NextResponse.json({
          success: true,
          filename,
          results: resultData
        });
      } catch (error) {
        console.error(`Error loading file ${filename}:`, error);
        return NextResponse.json({
          success: false,
          error: 'File not found',
          filename
        }, { status: 404 });
      }
    }
    
    // Case 3: If a query is provided, find results for that query
    if (query) {
      console.log(`Looking up results for query: ${query}`);
      const searchEntry = searchCache.findSearchByQuery(query);
      
      if (searchEntry) {
        // If the search is in progress, return the current status
        if (searchEntry.status !== 'completed') {
          return NextResponse.json({
            success: true,
            runId: searchEntry.runId,
            query,
            status: searchEntry.status,
            message: searchEntry.status === 'error' ? searchEntry.error : 'Search in progress',
            timestamp: searchEntry.timestamp.toISOString()
          });
        }
        
        // If completed, include the results
        return NextResponse.json({
          success: true,
          runId: searchEntry.runId,
          query,
          status: 'completed',
          results: searchEntry.results || [],
          timestamp: searchEntry.timestamp.toISOString()
        });
      }
      
      // Try to find a query lookup file
      try {
        const queryFileName = `query_${query.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
        const filePath = path.join(RESULTS_DIR, queryFileName);
        const fileContent = await fs.readFile(filePath, 'utf8');
        const resultData = JSON.parse(fileContent);
        
        return NextResponse.json({
          success: true,
          query,
          status: resultData.status,
          runId: resultData.runId,
          results: resultData.results,
          timestamp: resultData.timestamp
        });
      } catch (error) {
        console.log(`No results found for query "${query}"`);
        return NextResponse.json({
          success: false,
          error: 'No results found',
          query
        }, { status: 404 });
      }
    }
    
    // Case 4: No specific parameters, list all available searches
    console.log('Listing all available searches');
    
    // Get all files from the results directory
    let files;
    try {
      files = await fs.readdir(RESULTS_DIR);
    } catch (error) {
      console.error('Error reading results directory:', error);
      files = [];
    }
    
    // Process each file to extract metadata
    const results = await Promise.all(
      files.filter(file => file.endsWith('.json'))
        .map(async (file) => {
          try {
            const filePath = path.join(RESULTS_DIR, file);
            const stats = await fs.stat(filePath);
            
            try {
              // Try to read the file content
              const content = await fs.readFile(filePath, 'utf8');
              const data = JSON.parse(content);
              
              // Determine the runId and query based on file format
              let runId, query, status;
              
              if (data.runId) {
                // This is our cache entry format
                runId = data.runId;
                query = data.query;
                status = data.status;
              } else if (data.metadata && data.metadata.runId) {
                // This is our application format with metadata
                runId = data.metadata.runId;
                query = data.metadata.query || data.metadata.searchTerm;
                status = 'completed';
              } else {
                // Fallback: use filename without extension as runId
                runId = file.replace('.json', '');
                query = 'unknown';
                status = 'unknown';
              }
              
              return {
                filename: file,
                runId,
                query,
                status,
                timestamp: stats.mtime.toISOString()
              };
            } catch (parseError) {
              // If we can't read or parse the file, return basic info
              console.error(`Error parsing ${file}:`, parseError);
              return {
                filename: file,
                timestamp: stats.mtime.toISOString(),
                status: 'error',
                error: 'Failed to parse file'
              };
            }
          } catch (error) {
            console.error(`Error processing file ${file}:`, error);
            return null;
          }
        })
    );
    
    // Filter out nulls and sort by timestamp (newest first)
    const validResults = results.filter(item => item !== null);
    validResults.sort((a, b) => 
      new Date(b!.timestamp).getTime() - new Date(a!.timestamp).getTime()
    );
    
    return NextResponse.json({
      success: true,
      count: validResults.length,
      results: validResults
    });
    
  } catch (error) {
    console.error('Error in results API:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve results',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
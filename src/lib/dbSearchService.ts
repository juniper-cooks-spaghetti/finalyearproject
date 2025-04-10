import { PrismaClient } from '@prisma/client';
import { prisma } from './prisma';

export type SearchResult = {
  title: string;
  url: string;
  description: string;
  type: string;
  source: string;
};

export type SearchStatus = 'pending' | 'completed' | 'timeout' | 'error' | 'queued';

export type SearchEntry = {
  searchId: string;
  runId: string;
  query: string;
  timestamp: Date;
  status: SearchStatus;
  results?: SearchResult[];
  error?: string;
  queuePosition?: number;
  expiresAt: Date;
};

// Constants
const CACHE_TTL_MS = 30 * 60 * 1000; // Cache entries expire after 30 minutes
const TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes timeout for searches

/**
 * Database-backed search service
 * This replaces the in-memory searchCache to work with Vercel serverless functions
 */
export class DbSearchService {
  /**
   * Add a new search to the database
   */
  public async addSearch(runId: string, query: string, status: SearchStatus = 'pending'): Promise<void> {
    const normalizedQuery = query.toLowerCase().trim();
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS);
    
    try {
      await prisma.searchCache.create({
        data: {
          runId,
          query,
          normalizedQuery,
          status,
          expiresAt
        }
      });
      
      console.log(`Added new search to database: runId=${runId}, query="${query}"`);
      
      // For pending searches, set up expiration job
      if (status === 'pending') {
        this.scheduleTimeout(runId, TIMEOUT_MS);
      }
    } catch (error) {
      // Handle unique constraint errors
      if ((error as any).code === 'P2002') {
        console.log(`Search with runId ${runId} already exists, updating instead`);
        await prisma.searchCache.update({
          where: { runId },
          data: {
            query,
            normalizedQuery,
            status,
            expiresAt
          }
        });
      } else {
        console.error('Error adding search to database:', error);
        throw error;
      }
    }
  }
  
  /**
   * Update search status when results are available
   */
  public async completeSearch(runId: string, results: SearchResult[]): Promise<boolean> {
    try {
      // Update search status
      const searchCache = await prisma.searchCache.update({
        where: { runId },
        data: {
          status: 'completed',
          timestamp: new Date(), // Update timestamp
          expiresAt: new Date(Date.now() + CACHE_TTL_MS) // Extend expiration
        },
        select: {
          id: true
        }
      });
      
      if (!searchCache) {
        console.warn(`No search found with runId: ${runId}`);
        return false;
      }
      
      // Delete any existing results for this search
      await prisma.searchResult.deleteMany({
        where: { searchCacheId: searchCache.id }
      });
      
      // Add new results
      await prisma.searchResult.createMany({
        data: results.map(result => ({
          searchCacheId: searchCache.id,
          title: result.title,
          url: result.url,
          description: result.description,
          type: result.type,
          source: result.source
        }))
      });
      
      console.log(`Completed search with runId ${runId}, added ${results.length} results`);
      return true;
    } catch (error) {
      console.error(`Error completing search ${runId}:`, error);
      return false;
    }
  }
  
  /**
   * Mark a search as errored
   */
  public async errorSearch(runId: string, errorMessage: string): Promise<boolean> {
    try {
      await prisma.searchCache.update({
        where: { runId },
        data: {
          status: 'error',
          errorMessage,
          expiresAt: new Date(Date.now() + CACHE_TTL_MS) // Extend expiration
        }
      });
      
      console.log(`Marked search ${runId} as error: ${errorMessage}`);
      return true;
    } catch (error) {
      console.error(`Error updating search ${runId} status:`, error);
      return false;
    }
  }
  
  /**
   * Get a search entry by runId
   */
  public async getSearchById(runId: string): Promise<SearchEntry | null> {
    try {
      const search = await prisma.searchCache.findUnique({
        where: { runId },
        include: {
          results: true
        }
      });
      
      if (!search) return null;
      
      // Check if expired
      if (new Date() > search.expiresAt) {
        console.log(`Search ${runId} has expired, deleting`);
        await prisma.searchCache.delete({ where: { id: search.id } });
        return null;
      }
      
      // Transform to expected format
      return {
        searchId: search.id,
        runId: search.runId,
        query: search.query,
        timestamp: search.timestamp,
        status: search.status as SearchStatus,
        error: search.errorMessage || undefined,
        results: search.results.map(r => ({
          title: r.title,
          url: r.url,
          description: r.description,
          type: r.type,
          source: r.source
        })),
        expiresAt: search.expiresAt
      };
    } catch (error) {
      console.error(`Error getting search ${runId}:`, error);
      return null;
    }
  }
  
  /**
   * Find a search by query string
   */
  public async findSearchByQuery(query: string): Promise<SearchEntry | null> {
    try {
      const normalizedQuery = query.toLowerCase().trim();
      
      const search = await prisma.searchCache.findFirst({
        where: {
          normalizedQuery,
          status: 'completed',
          expiresAt: { gt: new Date() }
        },
        include: {
          results: true
        },
        orderBy: {
          timestamp: 'desc'
        }
      });
      
      if (!search) return null;
      
      // Transform to expected format
      return {
        searchId: search.id,
        runId: search.runId,
        query: search.query,
        timestamp: search.timestamp,
        status: search.status as SearchStatus,
        results: search.results.map(r => ({
          title: r.title,
          url: r.url,
          description: r.description,
          type: r.type,
          source: r.source
        })),
        expiresAt: search.expiresAt
      };
    } catch (error) {
      console.error(`Error finding search for query ${query}:`, error);
      return null;
    }
  }
  
  /**
   * Clear expired cache entries - this should be called periodically
   */
  public async clearExpiredCache(): Promise<number> {
    try {
      // Delete expired search entries (cascade will delete results)
      const result = await prisma.searchCache.deleteMany({
        where: {
          expiresAt: { lt: new Date() }
        }
      });
      
      console.log(`Cleared ${result.count} expired search cache entries`);
      return result.count;
    } catch (error) {
      console.error('Error clearing expired cache:', error);
      return 0;
    }
  }
  
  /**
   * Clear all entries from the search cache
   */
  public async clearCache(): Promise<{ success: boolean, deletedCount: number }> {
    try {
      // Delete all search entries (cascade will delete results)
      const result = await prisma.searchCache.deleteMany({});
      
      console.log(`Cleared all search cache entries (${result.count} deleted)`);
      return { success: true, deletedCount: result.count };
    } catch (error) {
      console.error('Error clearing cache:', error);
      return { success: false, deletedCount: 0 };
    }
  }
  
  /**
   * Schedule a timeout for a search
   * This is a helper method to mark searches as timed out if they take too long
   */
  private async scheduleTimeout(runId: string, timeoutMs: number): Promise<void> {
    // In serverless environment, we can't rely on setTimeout
    // Instead, we use the database's timestamp to check for timeouts
    // during status checks (handled in the API routes)
    const timeoutAt = new Date(Date.now() + timeoutMs);
    
    try {
      await prisma.searchCache.update({
        where: { runId },
        data: { expiresAt: timeoutAt }
      });
      
      console.log(`Set timeout for search ${runId}, will expire at ${timeoutAt}`);
    } catch (error) {
      console.error(`Error setting timeout for search ${runId}:`, error);
    }
  }
}

// Create and export singleton instance
const dbSearchService = new DbSearchService();
export default dbSearchService;
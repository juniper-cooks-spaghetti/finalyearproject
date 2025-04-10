export type SearchResult = {
  title: string;
  url: string;
  description: string;
  type: string;
  source: string;
  relevanceScore: number;
};

export type SearchStatus = 'pending' | 'completed' | 'timeout' | 'error' | 'queued';

export type SearchEntry = {
  searchId: string; // This is the same as runId for consistency
  runId: string;    // The Apify run ID is the primary key
  query: string;
  timestamp: Date;
  status: SearchStatus;
  results?: SearchResult[];
  error?: string;
  lastAccessed?: Date; // Track when this entry was last accessed for LRU
  queuePosition?: number; // Position in the queue if queued
  expiresAt: Date; // When this entry expires from cache
};

// Type for active search lock
type SearchLock = {
  query: string;
  runId: string;
  timestamp: Date;
  releaseTimeout: NodeJS.Timeout;
};

class SearchCache {
  private cache: Map<string, SearchEntry> = new Map();
  private readonly TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes timeout (reduced from 5)
  private readonly MAX_CACHE_SIZE = 20; // Increased cache size slightly from 10
  private readonly CACHE_TTL_MS = 30 * 60 * 1000; // Cache entries expire after 30 minutes
  
  // Search locking system
  private activeSearches: Map<string, SearchLock> = new Map(); // Query -> Lock mapping
  private searchQueue: Array<{query: string, resolve: (value: string | null) => void, reject: (reason: Error) => void}> = [];
  private isProcessingQueue = false;
  private readonly MAX_CONCURRENT_SEARCHES = 2; // Maximum searches that can run in parallel
  private readonly LOCK_TIMEOUT_MS = 30 * 1000; // 30 seconds max lock time
  
  // Track timeout references to cancel them when a search completes
  private timeoutRefs: Map<string, NodeJS.Timeout> = new Map();

  // Dump the current cache state for debugging
  public dumpCacheState(): object {
    const cacheEntries = Array.from(this.cache.entries()).map(([key, entry]) => {
      return {
        runId: key,
        query: entry.query,
        status: entry.status,
        timestamp: entry.timestamp.toISOString(),
        expiresAt: entry.expiresAt.toISOString(),
        hasResults: entry.results ? entry.results.length : 0,
      };
    });

    const activeSearches = Array.from(this.activeSearches.entries()).map(([query, lock]) => {
      return {
        query,
        runId: lock.runId,
        timestamp: lock.timestamp.toISOString(),
      };
    });

    const timeouts = Array.from(this.timeoutRefs.keys());

    return {
      cacheSize: this.cache.size,
      activeSearches: this.activeSearches.size,
      queueLength: this.searchQueue.length,
      activeTimeouts: this.timeoutRefs.size,
      entries: cacheEntries,
      locks: activeSearches,
      timeouts,
    };
  }

  /**
   * Check if a search is already in progress for a given query
   * @param query The search query to check
   * @returns True if the search is in progress, false otherwise
   */
  public isSearchInProgress(query: string): boolean {
    const normalizedQuery = query.toLowerCase().trim();
    return this.activeSearches.has(normalizedQuery);
  }

  /**
   * Get number of active searches currently in progress
   */
  public getActiveSearchCount(): number {
    return this.activeSearches.size;
  }

  /**
   * Get number of searches in queue
   */
  public getQueueLength(): number {
    return this.searchQueue.length;
  }

  /**
   * Queue a search or return existing search if one is already in progress
   * @param query The search query to add to the queue
   * @returns Promise that resolves with the runId when the search can proceed, or null if search is already completed
   */
  public async queueSearch(query: string): Promise<string | null> {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Check if search is already completed in cache
    const cachedSearch = this.findSearchByQuery(normalizedQuery);
    if (cachedSearch && cachedSearch.status === 'completed' && cachedSearch.results) {
      console.log(`Search for "${query}" already completed in cache`);
      return null; // No need to queue, return null to indicate we should use cached results
    }
    
    // Check if search is already in progress
    if (this.isSearchInProgress(normalizedQuery)) {
      console.log(`Search for "${query}" is already in progress, waiting for it to complete`);
      const lock = this.activeSearches.get(normalizedQuery);
      if (lock) {
        return lock.runId; // Return the existing runId
      }
    }
    
    // If we have capacity to run more searches, proceed immediately
    if (this.activeSearches.size < this.MAX_CONCURRENT_SEARCHES) {
      const runId = this.lockSearch(normalizedQuery);
      console.log(`Search for "${query}" can proceed immediately with runId ${runId}`);
      return runId;
    }
    
    // Otherwise, add to queue and wait
    console.log(`Search for "${query}" added to queue (position ${this.searchQueue.length + 1})`);
    return new Promise((resolve, reject) => {
      this.searchQueue.push({
        query: normalizedQuery,
        resolve,
        reject
      });
    });
  }

  /**
   * Lock a search and return a runId
   * @param query The search query to lock
   * @returns The runId for the search
   */
  private lockSearch(query: string): string {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Generate a runId (in a real implementation, this would come from Apify)
    const runId = `search_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Create a timeout to auto-release the lock after a certain time
    const releaseTimeout = setTimeout(() => {
      console.log(`Search lock for "${query}" auto-released after timeout`);
      this.releaseSearchLock(normalizedQuery);
    }, this.LOCK_TIMEOUT_MS);
    
    // Store the lock
    this.activeSearches.set(normalizedQuery, {
      query: normalizedQuery,
      runId,
      timestamp: new Date(),
      releaseTimeout
    });
    
    console.log(`Search lock acquired for "${query}" with runId ${runId}`);
    return runId;
  }

  /**
   * Release a search lock and process next item from queue
   * @param query The search query to unlock
   */
  public releaseSearchLock(query: string): void {
    const normalizedQuery = query.toLowerCase().trim();
    
    const lock = this.activeSearches.get(normalizedQuery);
    if (lock) {
      // Clear the auto-release timeout
      clearTimeout(lock.releaseTimeout);
      this.activeSearches.delete(normalizedQuery);
      console.log(`Search lock released for "${query}"`);
    }
    
    // Process next item in queue
    this.processNextQueuedSearch();
  }

  /**
   * Process the next search in the queue if any and if we have capacity
   */
  private processNextQueuedSearch(): void {
    if (this.isProcessingQueue) return; // Prevent concurrent processing
    
    this.isProcessingQueue = true;
    
    try {
      // If we're at capacity or the queue is empty, nothing to do
      if (this.activeSearches.size >= this.MAX_CONCURRENT_SEARCHES || this.searchQueue.length === 0) {
        this.isProcessingQueue = false;
        return;
      }
      
      // Get the next search from the queue
      const nextSearch = this.searchQueue.shift();
      if (!nextSearch) {
        this.isProcessingQueue = false;
        return;
      }
      
      // Check if this search is still needed
      const cachedSearch = this.findSearchByQuery(nextSearch.query);
      if (cachedSearch && cachedSearch.status === 'completed' && cachedSearch.results) {
        console.log(`Queued search for "${nextSearch.query}" no longer needed, already completed`);
        nextSearch.resolve(null); // Resolve with null to indicate we should use cached results
        
        // Try to process another one
        this.isProcessingQueue = false;
        this.processNextQueuedSearch();
        return;
      }
      
      // Lock the search and resolve the promise with the runId
      const runId = this.lockSearch(nextSearch.query);
      console.log(`Processing queued search for "${nextSearch.query}" with runId ${runId}`);
      nextSearch.resolve(runId);
    } catch (error) {
      console.error('Error processing search queue:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  // Add a new search to the cache - runId is the primary key
  public addSearch(runId: string, runIdOrSearchId: string, query: string): void {
    // Check if we need to evict the least recently used entry
    this.enforceCacheSizeLimit();

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + this.CACHE_TTL_MS);
    
    const entry: SearchEntry = {
      searchId: runId, // Use runId as searchId for consistency
      runId,
      query,
      timestamp: new Date(),
      lastAccessed: new Date(), // Initialize lastAccessed time
      status: 'pending',
      expiresAt
    };

    this.cache.set(runId, entry);
    
    // Set timeout to mark as timed out after timeout period
    // Store the timeout reference so we can cancel it if the search completes
    const timeoutRef = setTimeout(() => {
      const entry = this.cache.get(runId);
      if (entry && entry.status === 'pending') {
        console.log(`Search timeout triggered for runId: ${runId}, query: "${query}"`);
        entry.status = 'timeout';
        entry.error = `Search timed out after ${this.TIMEOUT_MS / 1000} seconds`;
        this.cache.set(runId, entry);
        
        // Release the lock for this search query
        this.releaseSearchLock(query);
      }
      
      // Remove the timeout reference
      this.timeoutRefs.delete(runId);
    }, this.TIMEOUT_MS);
    
    // Store the timeout reference
    this.timeoutRefs.set(runId, timeoutRef);
    console.log(`Set timeout for search ${runId}, query: "${query}", will expire in ${this.TIMEOUT_MS / 1000} seconds`);
    
    // Set timeout to remove entry from cache after TTL expires
    setTimeout(() => {
      console.log(`Cache TTL expired for runId: ${runId}, query: "${query}"`);
      this.cache.delete(runId);
    }, this.CACHE_TTL_MS);
  }
  
  // Update a search status when results are available
  public completeSearch(runId: string, results: SearchResult[]): boolean {
    const entry = this.cache.get(runId);
    if (!entry) {
      console.warn(`completeSearch: No search entry found for runId: ${runId}`);
      return false;
    }
    
    // Cancel the timeout for this search if it exists
    if (this.timeoutRefs.has(runId)) {
      console.log(`Cancelling timeout for completed search ${runId}`);
      clearTimeout(this.timeoutRefs.get(runId));
      this.timeoutRefs.delete(runId);
    }

    // Calculate a new expiration time
    const expiresAt = new Date(Date.now() + this.CACHE_TTL_MS);
    
    const updatedEntry: SearchEntry = {
      ...entry,
      status: 'completed',
      results,
      timestamp: new Date(), // Update the timestamp to when we got results
      lastAccessed: new Date(), // Update last accessed time
      expiresAt
    };

    this.cache.set(runId, updatedEntry);
    
    // Release the search lock to allow another search to proceed
    this.releaseSearchLock(entry.query);
    
    console.log(`Completed search for "${entry.query}" with runId ${runId}, results: ${results.length}`);
    
    // Debug: Dump the entire cache state after completion
    console.log(`Cache state after completing ${runId}:`, JSON.stringify(this.dumpCacheState(), null, 2).slice(0, 1000));
    
    return true;
  }
  
  // Mark a search as errored
  public errorSearch(runId: string, error: string): boolean {
    const entry = this.cache.get(runId);
    
    // Cancel the timeout for this search if it exists
    if (this.timeoutRefs.has(runId)) {
      console.log(`Cancelling timeout for errored search ${runId}`);
      clearTimeout(this.timeoutRefs.get(runId));
      this.timeoutRefs.delete(runId);
    }
    
    if (!entry) {
      console.warn(`errorSearch: No search entry found for runId: ${runId}`);
      
      // Calculate expiration time
      const expiresAt = new Date(Date.now() + this.CACHE_TTL_MS);
      
      // Create a minimal entry for this error
      const newEntry: SearchEntry = {
        searchId: runId,
        runId,
        query: 'unknown_query',
        timestamp: new Date(),
        status: 'error',
        error,
        expiresAt
      };
      this.cache.set(runId, newEntry);
      return true;
    }
    
    const updatedEntry: SearchEntry = {
      ...entry,
      status: 'error',
      error
    };

    this.cache.set(runId, updatedEntry);
    
    // Release the search lock to allow another search to proceed
    this.releaseSearchLock(entry.query);
    
    console.log(`Marked search for "${entry.query}" with runId ${runId} as error: ${error}`);
    return true;
  }
  
  // Get a specific search by runId - this is the primary lookup
  public getSearchById(runId: string): SearchEntry | undefined {
    const entry = this.cache.get(runId);
    
    if (entry) {
      // Check if entry has expired
      if (entry.expiresAt && entry.expiresAt < new Date()) {
        console.log(`Cache entry for runId ${runId} has expired, removing from cache`);
        this.cache.delete(runId);
        return undefined;
      }
      
      // Update the last accessed time for LRU tracking
      entry.lastAccessed = new Date();
      this.cache.set(runId, entry);
    }
    
    return entry;
  }

  // Find a search by query
  public findSearchByQuery(query: string): SearchEntry | undefined {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Check memory cache - fixed to use Array.from to avoid TypeScript iterator issues
    for (const entry of Array.from(this.cache.values())) {
      if (entry.query.toLowerCase().trim() === normalizedQuery && 
          entry.status === 'completed' &&
          (!entry.expiresAt || entry.expiresAt > new Date())) {
        // Update the last accessed time for LRU tracking
        entry.lastAccessed = new Date();
        this.cache.set(entry.runId, entry);
        return entry;
      }
    }
    
    return undefined;
  }
  
  // Get the latest completed search
  public getLatestCompletedSearch(): SearchEntry | undefined {
    let latestEntry: SearchEntry | undefined;
    let latestTime = new Date(0);
    
    // Fixed to use Array.from to avoid TypeScript iterator issues
    for (const entry of Array.from(this.cache.values())) {
      if (entry.status === 'completed' && 
          entry.timestamp > latestTime &&
          (!entry.expiresAt || entry.expiresAt > new Date())) {
        latestTime = entry.timestamp;
        latestEntry = entry;
      }
    }
    
    if (latestEntry) {
      // Update the last accessed time
      latestEntry.lastAccessed = new Date();
      this.cache.set(latestEntry.runId, latestEntry);
    }
    
    return latestEntry;
  }
  
  // Find and remove the least recently used cache entry
  private findLeastRecentlyUsedEntry(): string | null {
    if (this.cache.size === 0) return null;
    
    let lruKey: string | null = null;
    let oldestAccess = new Date();
    
    // Fixed to use Array.from to avoid TypeScript iterator issues
    for (const [key, entry] of Array.from(this.cache.entries())) {
      const accessTime = entry.lastAccessed || entry.timestamp;
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        lruKey = key;
      }
    }
    
    return lruKey;
  }
  
  // Enforce the cache size limit using LRU policy
  private enforceCacheSizeLimit(): void {
    // First remove any expired entries
    const now = new Date();
    
    // Fixed to use Array.from to avoid TypeScript iterator issues
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.cache.delete(key);
        console.log(`Removed expired cache entry for query "${entry.query}" with runId ${key}`);
      }
    }
    
    // Then remove oldest entries if still over limit
    while (this.cache.size >= this.MAX_CACHE_SIZE) {
      const lruKey = this.findLeastRecentlyUsedEntry();
      if (lruKey) {
        const evictedEntry = this.cache.get(lruKey);
        this.cache.delete(lruKey);
        console.log(`LRU cache eviction: removed entry for query "${evictedEntry?.query}" with runId ${lruKey}`);
      } else {
        break; // Safety check in case we can't find an LRU entry
      }
    }
  }
  
  // Clear all cache entries
  public clearCache(): { success: boolean, deletedCount: number } {
    try {
      // Get current cache size
      const cacheSize = this.cache.size;
      
      // Clear memory cache
      this.cache.clear();
      console.log(`Cleared in-memory search cache with ${cacheSize} entries`);
      
      // Cancel all timeouts
      // Fixed to use Array.from to avoid TypeScript iterator issues
      for (const [runId, timeout] of Array.from(this.timeoutRefs.entries())) {
        clearTimeout(timeout);
        console.log(`Cancelled timeout for ${runId}`);
      }
      this.timeoutRefs.clear();
      
      // Cancel and clear all active searches
      // Fixed to use Array.from to avoid TypeScript iterator issues
      for (const [query, lock] of Array.from(this.activeSearches.entries())) {
        clearTimeout(lock.releaseTimeout);
      }
      this.activeSearches.clear();
      
      // Clear the search queue and reject all pending promises
      for (const queuedSearch of this.searchQueue) {
        queuedSearch.reject(new Error('Search queue cleared'));
      }
      this.searchQueue = [];
      
      return { success: true, deletedCount: cacheSize };
    } catch (error) {
      console.error('Error clearing search cache:', error);
      return { success: false, deletedCount: 0 };
    }
  }
}

// No longer exporting the singleton instance as it's redundant
// Keeping the class and types for reference or reuse elsewhere
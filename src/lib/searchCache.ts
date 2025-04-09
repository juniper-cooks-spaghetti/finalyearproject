import fs from 'fs';
import path from 'path';

export type SearchResult = {
  title: string;
  url: string;
  description: string;
  type: string;
  source: string;
  relevanceScore: number;
};

export type SearchStatus = 'pending' | 'completed' | 'timeout' | 'error';

export type SearchEntry = {
  searchId: string; // This is the same as runId for consistency
  runId: string;    // The Apify run ID is the primary key
  query: string;
  timestamp: Date;
  status: SearchStatus;
  results?: SearchResult[];
  error?: string;
  lastAccessed?: Date; // Track when this entry was last accessed for LRU
};

class SearchCache {
  private cache: Map<string, SearchEntry> = new Map();
  private readonly TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
  private readonly CACHE_DIR = path.join(process.cwd(), 'data/search-results');
  private readonly MAX_CACHE_SIZE = 10; // LRU cache limit of 10 items

  constructor() {
    this.ensureCacheDirectory();
    this.loadCachedResults();
  }

  private ensureCacheDirectory() {
    if (!fs.existsSync(this.CACHE_DIR)) {
      try {
        fs.mkdirSync(this.CACHE_DIR, { recursive: true });
        console.log('Created search cache directory:', this.CACHE_DIR);
      } catch (error) {
        console.error('Error creating search cache directory:', error);
      }
    }
  }

  private loadCachedResults() {
    try {
      if (!fs.existsSync(this.CACHE_DIR)) return;

      const files = fs.readdirSync(this.CACHE_DIR);
      console.log(`Loading ${files.length} cached search results`);

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(this.CACHE_DIR, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(content);
            
            // Handle different file formats
            if (data.searchId && data.runId) {
              // This is our standard format
              const entry: SearchEntry = {
                ...data,
                timestamp: new Date(data.timestamp)
              };
              
              this.cache.set(entry.runId, entry);
              
            } else if (data.metadata && data.metadata.runId) {
              // This is the raw results format from Apify
              const runId = data.metadata.runId;
              const query = data.metadata.query || data.metadata.searchTerm || 'unknown_query';
              
              // Create a search entry from this data
              if (!this.cache.has(runId)) {
                this.cache.set(runId, {
                  searchId: runId,
                  runId: runId,
                  query: query,
                  timestamp: new Date(data.metadata.timestamp || new Date()),
                  status: 'completed'
                });
              }
            }
          } catch (readError) {
            console.error(`Error reading cache file ${file}:`, readError);
          }
        }
      }
      
      console.log(`Loaded ${this.cache.size} search entries`);
    } catch (error) {
      console.error('Error loading cached search results:', error);
    }
  }

  // Add a new search to the cache - runId is the primary key
  public addSearch(runId: string, runIdOrSearchId: string, query: string): void {
    // Check if we need to evict the least recently used entry
    this.enforceCacheSizeLimit();

    const entry: SearchEntry = {
      searchId: runId, // Use runId as searchId for consistency
      runId,
      query,
      timestamp: new Date(),
      lastAccessed: new Date(), // Initialize lastAccessed time
      status: 'pending'
    };

    this.cache.set(runId, entry);
    this.saveSearchEntry(entry);
    
    // Set timeout to mark as timed out after 5 minutes
    setTimeout(() => {
      const entry = this.cache.get(runId);
      if (entry && entry.status === 'pending') {
        entry.status = 'timeout';
        entry.error = 'Search timed out after 5 minutes';
        this.cache.set(runId, entry);
        this.saveSearchEntry(entry);
      }
    }, this.TIMEOUT_MS);
  }
  
  // Update a search status when results are available
  public completeSearch(runId: string, results: SearchResult[]): boolean {
    const entry = this.cache.get(runId);
    if (!entry) {
      console.warn(`completeSearch: No search entry found for runId: ${runId}`);
      return false;
    }
    
    const updatedEntry: SearchEntry = {
      ...entry,
      status: 'completed',
      results,
      timestamp: new Date(), // Update the timestamp to when we got results
      lastAccessed: new Date() // Update last accessed time
    };

    this.cache.set(runId, updatedEntry);
    this.saveSearchEntry(updatedEntry);
    
    // Instead of creating a file, just update the in-memory mapping
    console.log(`Updated in-memory mapping for query: "${updatedEntry.query}" pointing to runId: ${runId}`);
    
    return true;
  }
  
  // Mark a search as errored
  public errorSearch(runId: string, error: string): boolean {
    const entry = this.cache.get(runId);
    if (!entry) {
      console.warn(`errorSearch: No search entry found for runId: ${runId}`);
      // Create a minimal entry for this error
      const newEntry: SearchEntry = {
        searchId: runId,
        runId,
        query: 'unknown_query',
        timestamp: new Date(),
        status: 'error',
        error
      };
      this.cache.set(runId, newEntry);
      this.saveSearchEntry(newEntry);
      return true;
    }
    
    const updatedEntry: SearchEntry = {
      ...entry,
      status: 'error',
      error
    };

    this.cache.set(runId, updatedEntry);
    this.saveSearchEntry(updatedEntry);
    return true;
  }
  
  // Save search entry to disk
  private saveSearchEntry(entry: SearchEntry): void {
    try {
      this.ensureCacheDirectory();
      
      // Save by runId - this is the canonical file
      const runIdPath = path.join(this.CACHE_DIR, `${entry.runId}.json`);
      fs.writeFileSync(runIdPath, JSON.stringify(entry, null, 2), 'utf-8');
      
      console.log(`Saved search entry for runId: ${entry.runId}, query: ${entry.query}`);
    } catch (error) {
      console.error('Error saving search entry:', error);
    }
  }
  
  // Save a lookup file by query to help find results later
  private saveQueryLookup(query: string, runId: string): void {
    try {
      // We'll maintain the query-to-runId mapping only in memory
      // but do not write additional files to the filesystem
      console.log(`Created query mapping for "${query}" pointing to runId: ${runId}`);
    } catch (error) {
      console.error(`Error saving query lookup for "${query}":`, error);
    }
  }
  
  // Get a specific search by runId - this is the primary lookup
  public getSearchById(runId: string): SearchEntry | undefined {
    const entry = this.cache.get(runId);
    
    if (entry) {
      // Update the last accessed time for LRU tracking
      entry.lastAccessed = new Date();
      this.cache.set(runId, entry);
    }
    
    return entry;
  }

  // Find a search by query
  public findSearchByQuery(query: string): SearchEntry | undefined {
    const normalizedQuery = query.toLowerCase().trim();
    
    // First check memory cache
    for (const entry of this.cache.values()) {
      if (entry.query.toLowerCase().trim() === normalizedQuery && entry.status === 'completed') {
        // Update the last accessed time for LRU tracking
        entry.lastAccessed = new Date();
        this.cache.set(entry.runId, entry);
        return entry;
      }
    }
    
    // If not found in memory, try checking for a query lookup file
    try {
      const queryFileName = `query_${normalizedQuery.replace(/[^a-z0-9]/g, '_')}.json`;
      const queryPath = path.join(this.CACHE_DIR, queryFileName);
      
      if (fs.existsSync(queryPath)) {
        const content = fs.readFileSync(queryPath, 'utf-8');
        const entry = JSON.parse(content) as SearchEntry;
        
        // Add to memory cache
        if (entry && entry.runId) {
          entry.timestamp = new Date(entry.timestamp);
          entry.lastAccessed = new Date(); // Set last accessed time
          this.cache.set(entry.runId, entry);
          
          // Check if we need to evict the least recently used entry
          this.enforceCacheSizeLimit();
          
          return entry;
        }
      }
    } catch (error) {
      console.error(`Error finding search by query "${query}":`, error);
    }
    
    return undefined;
  }
  
  // Get the latest completed search
  public getLatestCompletedSearch(): SearchEntry | undefined {
    let latestEntry: SearchEntry | undefined;
    let latestTime = new Date(0);
    
    for (const entry of this.cache.values()) {
      if (entry.status === 'completed' && entry.timestamp > latestTime) {
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
    
    for (const [key, entry] of this.cache.entries()) {
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
    while (this.cache.size >= this.MAX_CACHE_SIZE) {
      const lruKey = this.findLeastRecentlyUsedEntry();
      if (lruKey) {
        const evictedEntry = this.cache.get(lruKey);
        this.cache.delete(lruKey);
        console.log(`LRU cache eviction: removed entry for query "${evictedEntry?.query}" with runId ${lruKey}`);
        
        // Note: We don't delete the file from disk, just from memory cache
        // This allows us to potentially reload it later if needed
      } else {
        break; // Safety check in case we can't find an LRU entry
      }
    }
  }
  
  // Clear all cache entries both in memory and file system
  public clearCache(): { success: boolean, deletedCount: number } {
    try {
      // Clear memory cache first
      const cacheSize = this.cache.size;
      this.cache.clear();
      console.log(`Cleared in-memory search cache with ${cacheSize} entries`);
      
      // Then clear file system cache if directory exists
      if (fs.existsSync(this.CACHE_DIR)) {
        const files = fs.readdirSync(this.CACHE_DIR);
        let deletedCount = 0;
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              const filePath = path.join(this.CACHE_DIR, file);
              fs.unlinkSync(filePath);
              deletedCount++;
            } catch (error) {
              console.error(`Error deleting cache file ${file}:`, error);
            }
          }
        }
        
        console.log(`Deleted ${deletedCount} cache files from ${this.CACHE_DIR}`);
        return { success: true, deletedCount };
      }
      
      return { success: true, deletedCount: 0 };
    } catch (error) {
      console.error('Error clearing search cache:', error);
      return { success: false, deletedCount: 0 };
    }
  }
}

// Create and export a singleton instance
const searchCache = new SearchCache();
export default searchCache;
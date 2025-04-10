'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Search domain options - these will be used to tailor search results
const searchDomains = [
  { value: 'coursera', label: 'Coursera', urls: [
    'https://www.coursera.org/professional-certificates/', 
    'https://www.coursera.org/learn/', 
    'https://www.coursera.org/specialization/'
  ]},
  { value: 'udemy', label: 'Udemy', urls: [
    'https://www.udemy.com/course/'
  ]},
  { value: 'edx', label: 'edX', urls: [
    'https://www.edx.org/learn/', 
    'https://www.edx.org/course/', 
    'https://www.edx.org/professional-certificate/'
  ]},
  { value: 'youtube', label: 'YouTube', urls: [
    'https://www.youtube.com/watch'
  ]},
  { value: 'medium', label: 'Medium', urls: [
    'https://medium.com/'
  ]}
];

interface SearchResult {
  title: string;
  url: string;
  description: string;
  type: string;
  source: string;
  relevanceScore: number;
}

interface SearchFormProps {
  onResultsFound: (results: SearchResult[]) => void;
  isContentTab?: boolean; // To adjust UI based on which tab it's on
}

export function SearchForm({ onResultsFound, isContentTab = true }: SearchFormProps) {
  const [query, setQuery] = useState('');
  // Changed from array to single string to only allow one platform at a time
  const [selectedDomain, setSelectedDomain] = useState<string>('coursera');
  const [isSearching, setIsSearching] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [searchId, setSearchId] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [activeSearches, setActiveSearches] = useState<number>(0);
  const [queueLength, setQueueLength] = useState<number>(0);
  const { toast } = useToast();
  
  // Cancel search timeout reference
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Handle domain selection - updated to only select one domain
  const handleDomainChange = (value: string) => {
    // Simply set the selected domain to the new value
    setSelectedDomain(value);
  };

  // Clear search cache handler - simplified to only clear all
  const handleClearCache = async () => {
    if (isClearingCache) return;
    
    setIsClearingCache(true);
    
    try {
      const response = await fetch('/api/admin/scraper/clear-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Cache cleared',
          description: data.message,
          variant: 'success'
        });
      } else {
        toast({
          title: 'Failed to clear cache',
          description: data.message || 'An error occurred',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear search cache',
        variant: 'destructive'
      });
    } finally {
      setIsClearingCache(false);
    }
  };

  // Check results with retries
  const checkResults = async (runId: string, attempt: number = 1) => {
    if (!runId) {
      console.error('No runId provided to checkResults');
      return;
    }
    
    try {
      // Maximum attempts to avoid infinite polling
      const MAX_ATTEMPTS = 20;
      
      if (attempt > MAX_ATTEMPTS) {
        setIsSearching(false);
        setSearchStatus(null);
        toast({
          title: 'Search timed out',
          description: 'The search is taking longer than expected. Results may appear later.',
          variant: 'destructive'
        });
        return;
      }
      
      console.log(`Checking results for runId: ${runId}, attempt: ${attempt}`);
      
      // Call the results API to check the status
      const response = await fetch(`/api/admin/scraper/results?runId=${runId}`);
      const data = await response.json();
      
      console.log('Results check response:', data);
      
      if (!data.success) {
        // If the request failed, try again after a delay
        if (attempt < MAX_ATTEMPTS) {
          console.log(`Will retry in ${2000}ms`);
          timeoutRef.current = setTimeout(() => {
            checkResults(runId, attempt + 1);
          }, 2000);
        } else {
          setIsSearching(false);
          setSearchStatus(null);
          setQueuePosition(null);
          toast({
            title: 'Error',
            description: data.error || 'Failed to retrieve search results',
            variant: 'destructive'
          });
        }
        return;
      }
      
      // Check the status of the search
      const status = data.status;
      setSearchStatus(status);
      
      // Update queue position if available
      if (data.queuePosition !== undefined) {
        setQueuePosition(data.queuePosition);
      } else {
        setQueuePosition(null);
      }
      
      switch (status) {
        case 'completed':
          // Search completed successfully, update the UI
          setIsSearching(false);
          setSearchStatus(null);
          setQueuePosition(null);
          
          if (data.results && Array.isArray(data.results)) {
            // Call the callback provided by the parent component with the results
            onResultsFound(data.results);
            toast({
              title: 'Search completed',
              description: `Found ${data.results.length} results`,
              variant: 'success'
            });
          } else {
            toast({
              title: 'No results found',
              description: 'The search completed but no results were found.',
              variant: 'default'
            });
          }
          break;
          
        case 'queued':
          // Search is queued, poll again after a delay
          const retryAfterQueued = 5000; // 5 seconds for queued status
          console.log(`Search is queued at position ${data.queuePosition}, checking again in ${retryAfterQueued}ms`);
          
          toast({
            title: 'Search queued',
            description: `Your search is in queue position ${data.queuePosition}`,
            variant: 'default'
          });
          
          timeoutRef.current = setTimeout(() => {
            checkResults(runId, attempt + 1);
          }, retryAfterQueued);
          break;
          
        case 'pending':
          // Search is still in progress, poll again after a delay
          const retryAfter = data.retryAfter || 2000;
          console.log(`Search still in progress, checking again in ${retryAfter}ms`);
          timeoutRef.current = setTimeout(() => {
            checkResults(runId, attempt + 1);
          }, retryAfter);
          break;
          
        case 'error':
          // Search encountered an error
          setIsSearching(false);
          setSearchStatus(null);
          setQueuePosition(null);
          toast({
            title: 'Search error',
            description: data.message || 'An error occurred during the search',
            variant: 'destructive'
          });
          break;
          
        default:
          // Unknown status
          console.warn(`Unknown search status: ${status}`);
          if (attempt < MAX_ATTEMPTS) {
            timeoutRef.current = setTimeout(() => {
              checkResults(runId, attempt + 1);
            }, 2000);
          } else {
            setIsSearching(false);
            setSearchStatus(null);
            setQueuePosition(null);
          }
      }
      
    } catch (error) {
      console.error('Error checking search results:', error);
      
      // Try again after a delay, if we haven't reached the maximum attempts
      if (attempt < 10) {
        timeoutRef.current = setTimeout(() => {
          checkResults(runId, attempt + 1);
        }, 2000);
      } else {
        setIsSearching(false);
        setSearchStatus(null);
        setQueuePosition(null);
        toast({
          title: 'Error',
          description: 'Failed to check search status after multiple attempts',
          variant: 'destructive'
        });
      }
    }
  };

  // Perform search using the updated admin scraper API
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query || query.trim() === '') {
      toast({
        title: 'Error',
        description: 'Please enter a search query',
        variant: 'destructive'
      });
      return;
    }
    
    if (!selectedDomain) {
      toast({
        title: 'Warning',
        description: 'No platform selected. Please select a platform to search.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSearching(true);
    setSearchStatus('starting');
    
    // Get the selected domain URLs for the search
    const domainUrls: string[] = [];
    const domain = searchDomains.find(d => d.value === selectedDomain);
    if (domain) {
      domainUrls.push(...domain.urls);
    }
    
    try {
      console.log('Starting search with query:', query, 'domain:', selectedDomain);
      
      // Call the search API to initiate the search
      const response = await fetch('/api/admin/scraper/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query.trim(),
          domains: domainUrls
        })
      });
      
      const data = await response.json();
      console.log('Search API response:', data);
      
      if (!data.success) {
        setIsSearching(false);
        setSearchStatus(null);
        toast({
          title: 'Search failed',
          description: data.error || 'Failed to start search',
          variant: 'destructive'
        });
        return;
      }
      
      // Extract search and run IDs
      const { searchId: newSearchId, runId } = data;
      setSearchId(newSearchId);
      setSearchStatus(data.status);
      
      // Update active searches and queue info if available
      if (data.activeSearches !== undefined) {
        setActiveSearches(data.activeSearches);
      }
      if (data.queueLength !== undefined) {
        setQueueLength(data.queueLength);
        if (data.queueLength > 0) {
          setQueuePosition(data.queueLength);
        }
      }
      
      // If the search is already completed (cached results), handle them now
      if (data.status === 'completed' && data.results) {
        setIsSearching(false);
        setSearchStatus(null);
        onResultsFound(data.results);
        toast({
          title: 'Search completed',
          description: `Found ${data.results.length} results (cached)`,
          variant: 'success'
        });
        return;
      }
      
      // For pending searches, start polling for results
      if ((data.status === 'pending' || data.status === 'queued') && runId) {
        toast({
          title: data.status === 'queued' ? 'Search queued' : 'Search initiated',
          description: data.status === 'queued' 
            ? `Your search is in queue (position ${data.queuePosition || queueLength}). Please wait...` 
            : 'Starting search, please wait...',
          variant: 'default'
        });
        
        // Start checking for results
        setTimeout(() => {
          checkResults(runId);
        }, 2000);
      }
      
    } catch (error) {
      console.error('Error starting search:', error);
      setIsSearching(false);
      setSearchStatus(null);
      toast({
        title: 'Error',
        description: 'Failed to start search. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Function to render status message
  const renderStatusMessage = () => {
    if (!isSearching) return null;
    
    if (queuePosition && queuePosition > 0) {
      return (
        <div className="mt-4 px-4 py-3 bg-muted rounded-md">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Search queued (position {queuePosition})</span>
            <Loader2 className="w-4 h-4 animate-spin ml-2" />
          </div>
          <Progress 
            value={Math.max(10, 100 - (queuePosition * 20))} 
            className="h-1" 
          />
          <p className="text-xs mt-2 text-muted-foreground">
            Please wait while your search is in the queue. 
            {activeSearches > 0 && ` Currently ${activeSearches} active ${activeSearches === 1 ? 'search' : 'searches'}.`}
          </p>
        </div>
      );
    }
    
    if (searchStatus === 'pending') {
      return (
        <div className="mt-4 px-4 py-3 bg-muted rounded-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Processing your search</span>
            <Loader2 className="w-4 h-4 animate-spin ml-2" />
          </div>
          <Progress value={50} className="h-1" />
          <p className="text-xs mt-2 text-muted-foreground">
            Searching for "{query}" on {selectedDomain}...
          </p>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Search for Learning Content</h3>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleClearCache}
          disabled={isClearingCache}
        >
          {isClearingCache ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Trash2 className="h-4 w-4 mr-1" />
          )}
          Clear Cache
        </Button>
      </div>
      
      <form onSubmit={handleSearch} className="space-y-4">
        {/* Search input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for learning resources..."
              className="pl-8"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isSearching}
            />
          </div>
          <Button type="submit" disabled={isSearching}>
            {isSearching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {searchStatus === 'pending' ? 'Searching...' : 'Starting...'}
              </>
            ) : (
              "Search"
            )}
          </Button>
        </div>

        {/* Status message and progress indicator */}
        {renderStatusMessage()}

        {/* Domain selection - updated to show which platform is currently selected */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">Select a platform to search:</p>
          <div className="flex flex-wrap gap-2">
            {searchDomains.map((domain) => (
              <Badge
                key={domain.value}
                variant={selectedDomain === domain.value ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => handleDomainChange(domain.value)}
              >
                {domain.label}
              </Badge>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
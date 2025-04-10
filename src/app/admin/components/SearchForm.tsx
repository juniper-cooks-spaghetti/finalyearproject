'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useDebounce } from '@/hooks/useDebounce';
import { getTopicSuggestions } from '@/actions/search.action';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";

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

interface TopicSuggestion {
  id: string;
  title: string;
  description: string;
}

interface SearchResult {
  title: string;
  url: string;
  description: string;
  type: string;
  source: string;
}

interface SearchFormProps {
  onResultsFound: (results: SearchResult[], runId?: string) => void;
  isContentTab?: boolean; // To adjust UI based on which tab it's on
}

export function SearchForm({ onResultsFound, isContentTab = true }: SearchFormProps) {
  const [query, setQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('coursera');
  const [isSearching, setIsSearching] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [searchId, setSearchId] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [activeSearches, setActiveSearches] = useState<number>(0);
  const [queueLength, setQueueLength] = useState<number>(0);
  const { toast } = useToast();
  
  // Topic suggestions state
  const [topicSuggestions, setTopicSuggestions] = useState<TopicSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState<string | undefined>(undefined);
  const [selectedTopic, setSelectedTopic] = useState<TopicSuggestion | null>(null);
  
  // Debounce search query for suggestions
  const debouncedQuery = useDebounce(query, 300);
  
  // Cancel search timeout reference
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Fetch topic suggestions when debounced query changes
  useEffect(() => {
    async function fetchTopicSuggestions() {
      if (debouncedQuery.length < 2) {
        setTopicSuggestions([]);
        setAccordionOpen(undefined);
        return;
      }
      
      setIsLoadingSuggestions(true);
      try {
        const result = await getTopicSuggestions(debouncedQuery);
        if (result.success && result.topics && result.topics.length > 0) {
          setTopicSuggestions(result.topics);
          setAccordionOpen('suggestions'); // Open accordion when suggestions are available
        } else {
          setTopicSuggestions([]);
          if (debouncedQuery.length > 2) {
            // Only close accordion if user has typed enough characters
            setAccordionOpen(undefined);
          }
        }
      } catch (error) {
        console.error('Error fetching topic suggestions:', error);
        setTopicSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }
    
    fetchTopicSuggestions();
  }, [debouncedQuery]);
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Handle domain selection
  const handleDomainChange = (value: string) => {
    setSelectedDomain(value);
  };

  // Handle selecting a topic suggestion
  const handleSelectTopic = (topic: TopicSuggestion) => {
    setQuery(topic.title);
    setSelectedTopic(topic);
    setAccordionOpen(undefined); // Close accordion after selection
  };

  // Clear search cache handler
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
          variant: 'default'
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
    // Define MAX_ATTEMPTS at the top of the function so it's accessible throughout
    const MAX_ATTEMPTS = 30;
    
    if (!runId) {
      console.error('No runId provided to checkResults');
      return;
    }
    
    try {
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
      const response = await fetch(`/api/admin/scraper/results?runId=${runId}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        console.error(`Results API error: ${response.status} ${response.statusText}`);
        
        if (response.status === 404 && attempt < MAX_ATTEMPTS) {
          console.log(`Search ${runId} not found yet, retrying in 3000ms`);
          timeoutRef.current = setTimeout(() => {
            checkResults(runId, attempt + 1);
          }, 3000);
        } else {
          const errorText = await response.text();
          console.error(`Failed to check results: ${errorText}`);
          
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
              description: 'Failed to retrieve search results after multiple attempts',
              variant: 'destructive'
            });
          }
        }
        return;
      }
      
      // Parse the response data
      const data = await response.json();
      
      console.log('Results check response:', data);
      
      if (!data.success) {
        if (attempt < MAX_ATTEMPTS) {
          console.log(`Will retry in ${2000}ms due to unsuccessful response`);
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
          setIsSearching(false);
          setSearchStatus(null);
          setQueuePosition(null);
          
          if (data.results && Array.isArray(data.results) && data.results.length > 0) {
            onResultsFound(data.results, runId);
            toast({
              title: 'Search completed',
              description: `Found ${data.results.length} results`,
              variant: 'default'
            });
          } else {
            onResultsFound([], runId);
            toast({
              title: 'No results found',
              description: 'The search completed but no results were found.',
              variant: 'default'
            });
          }
          break;
          
        case 'queued':
          const retryAfterQueued = 5000;
          console.log(`Search is queued at position ${data.queuePosition || 'unknown'}, checking again in ${retryAfterQueued}ms`);
          
          if (!data.queuePosition || attempt % 3 === 0) {
            toast({
              title: 'Search queued',
              description: data.queuePosition 
                ? `Your search is in queue position ${data.queuePosition}` 
                : 'Your search is queued',
              variant: 'default',
            });
          }
          
          timeoutRef.current = setTimeout(() => {
            checkResults(runId, attempt + 1);
          }, retryAfterQueued);
          break;
          
        case 'pending':
          const retryAfter = data.retryAfter || 3000;
          console.log(`Search still in progress, checking again in ${retryAfter}ms`);
          
          if (attempt % 5 === 0) {
            toast({
              title: 'Search in progress',
              description: 'Please wait while we process your search',
              variant: 'default',
            });
          }
          
          timeoutRef.current = setTimeout(() => {
            checkResults(runId, attempt + 1);
          }, retryAfter);
          break;
          
        case 'error':
          setIsSearching(false);
          setSearchStatus(null);
          setQueuePosition(null);
          toast({
            title: 'Search error',
            description: data.message || 'An error occurred during the search',
            variant: 'destructive'
          });
          break;
          
        case 'timeout':
          setIsSearching(false);
          setSearchStatus(null);
          setQueuePosition(null);
          toast({
            title: 'Search timed out',
            description: data.message || 'The search took too long and timed out',
            variant: 'destructive'
          });
          break;
          
        default:
          console.warn(`Unknown search status: ${status}`);
          if (attempt < MAX_ATTEMPTS) {
            timeoutRef.current = setTimeout(() => {
              checkResults(runId, attempt + 1);
            }, 3000);
          } else {
            setIsSearching(false);
            setSearchStatus(null);
            setQueuePosition(null);
          }
      }
      
    } catch (error) {
      console.error('Error checking search results:', error);
      
      if (attempt < MAX_ATTEMPTS / 2) {
        timeoutRef.current = setTimeout(() => {
          checkResults(runId, attempt + 1);
        }, 3000);
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
    
    // Validate that query matches a topic title exactly
    if (!selectedTopic) {
      // If user hasn't selected a topic from suggestions, check if current query text matches a topic
      let validTopic = false;
      
      // If we have suggestions loaded and one matches exactly, use it
      if (topicSuggestions.length > 0) {
        const exactMatch = topicSuggestions.find(t => t.title.toLowerCase() === query.trim().toLowerCase());
        if (exactMatch) {
          setSelectedTopic(exactMatch);
          validTopic = true;
        }
      }
      
      // If no matching topic found, show error
      if (!validTopic) {
        toast({
          title: 'No Existing Topic Found',
          description: 'Please select a valid topic from the suggestions',
          variant: 'destructive'
        });
        return;
      }
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
      console.log('Starting search with topic:', selectedTopic, 'domain:', selectedDomain);
      
      // Call the search API to initiate the search
      const response = await fetch('/api/admin/scraper/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query.trim(),
          domains: domainUrls,
          topicOnly: true,
          topicId: selectedTopic?.id
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
        onResultsFound(data.results, data.runId); // Pass runId along with results
        toast({
          title: 'Search completed',
          description: `Found ${data.results.length} results (cached)`,
          variant: 'default'
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
        {/* Search input with topic autocomplete */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by topic name..."
              className="pl-8"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedTopic(null); // Clear selected topic when input changes
              }}
              disabled={isSearching}
            />
            {isLoadingSuggestions && (
              <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Topic suggestions accordion */}
          {topicSuggestions.length > 0 && (
            <Accordion
              type="single"
              collapsible
              className="border rounded-md"
              value={accordionOpen}
              onValueChange={setAccordionOpen}
            >
              <AccordionItem value="suggestions" className="border-0">
                <AccordionTrigger className="px-4 py-2 text-sm hover:no-underline">
                  <span className="flex items-center">
                    <span>Topic Suggestions</span>
                    <Badge className="ml-2" variant="secondary">
                      {topicSuggestions.length}
                    </Badge>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="max-h-60 overflow-y-auto">
                    {topicSuggestions.map((topic) => (
                      <div
                        key={topic.id}
                        className={`p-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer ${
                          selectedTopic?.id === topic.id ? 'bg-accent text-accent-foreground' : ''
                        }`}
                        onClick={() => handleSelectTopic(topic)}
                      >
                        <div className="font-medium">{topic.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {topic.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>

        {/* Status message and progress indicator */}
        {renderStatusMessage()}

        {/* Domain selection */}
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

        {/* Display currently selected topic if any */}
        {selectedTopic && (
          <div className="px-3 py-2 bg-muted rounded-md">
            <div className="text-xs text-muted-foreground">Selected Topic:</div>
            <div className="font-medium">{selectedTopic.title}</div>
          </div>
        )}

        {/* Search button */}
        <Button type="submit" disabled={isSearching || !selectedTopic}>
          {isSearching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {searchStatus === 'pending' ? 'Searching...' : 'Starting...'}
            </>
          ) : (
            "Search"
          )}
        </Button>
      </form>
    </div>
  );
}
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

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
  const [selectedDomains, setSelectedDomains] = useState<string[]>(['coursera']);
  const [isSearching, setIsSearching] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [searchId, setSearchId] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
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

  // Handle domain selection
  const handleDomainChange = (value: string) => {
    // Toggle domain selection
    if (selectedDomains.includes(value)) {
      setSelectedDomains(selectedDomains.filter(d => d !== value));
    } else {
      setSelectedDomains([...selectedDomains, value]);
    }
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
  const checkResults = async (searchId: string, attempt: number = 1) => {
    // ...existing code...
  };

  // Perform search using the updated admin scraper API
  const handleSearch = async (e: React.FormEvent) => {
    // ...existing code...
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

        {/* Domain selection */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">Select platforms to search:</p>
          <div className="flex flex-wrap gap-2">
            {searchDomains.map((domain) => (
              <Badge
                key={domain.value}
                variant={selectedDomains.includes(domain.value) ? "default" : "outline"}
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
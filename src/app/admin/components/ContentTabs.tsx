'use client';

import { useState, useEffect } from 'react';
import { ContentTable } from "@/app/admin/components/ContentTable";
import { ContentSuggestionsTable } from "@/app/admin/components/ContentSuggestionsTable";
import { SearchForm } from "@/app/admin/components/SearchForm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, ExternalLink } from "lucide-react";

interface ContentTabsProps {
  content: any[];
  suggestions: any[];
  topics: any[];
  defaultTab?: string;
}

interface SearchResult {
  title: string;
  url: string;
  description: string;
  type: string;
  source: string;
  relevanceScore: number;
}

export function ContentTabs({ 
  content, 
  suggestions, 
  topics = [],
  defaultTab = "content" 
}: ContentTabsProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [mounted, setMounted] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Ensure component is mounted before rendering tabs
  // This fixes hydration issues that might prevent clicking
  useEffect(() => {
    setMounted(true);
  }, []);

  // Debug tab change
  const handleTabChange = (value: string) => {
    console.log(`Tab changed to: ${value}`);
    setActiveTab(value);
  };

  // Don't render tabs until client-side
  if (!mounted) {
    return <div className="min-h-[200px] flex items-center justify-center">Loading...</div>;
  }

  // Handle search results
  const handleSearchResults = (results: SearchResult[]) => {
    setSearchResults(results);
    // Automatically switch to the search tab to show results
    setActiveTab("search");
  };

  return (
    <div className="space-y-4">
      {/* Page header with aligned tabs */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Content Management</h1>
        
        {/* Tabs aligned with title */}
        <div className="inline-flex bg-muted rounded-lg p-1">
          <button
            onClick={() => handleTabChange("content")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === "content" 
                ? "bg-background shadow text-foreground" 
                : "hover:bg-muted-foreground/10"
            }`}
          >
            Content
          </button>
          
          <button
            onClick={() => handleTabChange("search")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === "search" 
                ? "bg-background shadow text-foreground" 
                : "hover:bg-muted-foreground/10"
            }`}
          >
            Search
          </button>
          
          <button
            onClick={() => handleTabChange("suggestions")}
            className={`px-3 py-1 text-sm rounded-md transition-colors relative ${
              activeTab === "suggestions" 
                ? "bg-background shadow text-foreground" 
                : "hover:bg-muted-foreground/10"
            }`}
          >
            Suggestions
            {suggestions.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-medium">
                {suggestions.length}
              </span>
            )}
          </button>
        </div>
      </div>
      
      {/* Content area */}
      <div className="w-full">
        {activeTab === "content" && (
          <ContentTable content={content} />
        )}
        
        {activeTab === "search" && (
          <div className="space-y-6">
            <SearchForm onResultsFound={handleSearchResults} />
            
            {searchResults.length > 0 ? (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Search Results</h2>
                <p className="text-sm text-muted-foreground">
                  Found {searchResults.length} results. Click on a result to view more details.
                </p>
                
                <div className="grid gap-4 md:grid-cols-2">
                  {searchResults.map((result, index) => (
                    <Card key={index} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex flex-col space-y-2">
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium line-clamp-2 flex-1">{result.title}</h3>
                          <Badge className="ml-2" variant="outline">{result.type}</Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2">{result.description}</p>
                        
                        <div className="flex justify-between items-center pt-2">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Globe className="h-3 w-3 mr-1" />
                            <span>{result.source}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="gap-1" asChild>
                            <a href={result.url} target="_blank" rel="noopener noreferrer">
                              Visit <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center p-8 text-center text-muted-foreground">
                <p>Search for content across multiple platforms to add to your topics.</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === "suggestions" && (
          <ContentSuggestionsTable suggestions={suggestions} />
        )}
      </div>
    </div>
  );
}
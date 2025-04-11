'use client';

import { useState, useEffect } from 'react';
import { ContentTable } from "@/app/admin/components/ContentTable";
import { ContentSuggestionsTable } from "@/app/admin/components/ContentSuggestionsTable";
import { SearchForm } from "@/app/admin/components/SearchForm";
import { SearchResultsTable } from "@/app/admin/components/SearchResultsTable";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, ExternalLink } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

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
}

interface TopicSuggestion {
  id: string;
  title: string;
  description: string;
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
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [searchRunId, setSearchRunId] = useState<string | null>(null);

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
  const handleSearchResults = (results: SearchResult[], runId?: string) => {
    setSearchResults(results);
    if (runId) setSearchRunId(runId);
    // Automatically switch to the search tab to show results
    setActiveTab("search");
  };

  // Handle the deletion of a cache entry
  const handleCacheDeleted = () => {
    // Reset search results when cache is deleted
    setSearchResults([]);
    setSearchRunId(null);
  };

  // Handle topic selection from the SearchForm component
  const handleTopicSelected = (topic: TopicSuggestion) => {
    if (topic && topic.id) {
      console.log(`Topic selected in SearchForm: ${topic.title} (${topic.id})`);
      setSelectedTopicId(topic.id);
    }
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
            {/* Topic selector */}
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="text-lg font-medium mb-2">Select Target Topic</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose a topic to add search results to:
              </p>
              
              <Select
                value={selectedTopicId}
                onValueChange={setSelectedTopicId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((topic) => (
                    <SelectItem key={topic.id} value={topic.id}>
                      {topic.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedTopicId && (
                <p className="text-xs text-muted-foreground mt-2">
                  Content will be added to this topic when you click "Add" or "Add All to Topic"
                </p>
              )}
            </div>
            
            <SearchForm 
              onResultsFound={(results, runId) => handleSearchResults(results, runId)} 
              isContentTab={true}
              onTopicSelected={handleTopicSelected}
              selectedTopicId={selectedTopicId}
            />
            
            {searchResults.length > 0 ? (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Search Results</h2>
                <p className="text-sm text-muted-foreground">
                  Found {searchResults.length} results. Click "Add" to add content to the selected topic.
                </p>
                
                <SearchResultsTable 
                  results={searchResults} 
                  topicId={selectedTopicId}
                  runId={searchRunId || undefined}
                  onCacheDeleted={handleCacheDeleted}
                />
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
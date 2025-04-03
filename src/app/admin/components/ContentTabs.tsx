'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentTable } from "@/app/admin/components/ContentTable";
import { ContentSuggestionsTable } from "@/app/admin/components/ContentSuggestionsTable";

interface ContentTabsProps {
  content: any[];
  suggestions: any[];
  defaultTab?: string;
}

export function ContentTabs({ 
  content, 
  suggestions, 
  defaultTab = "content" 
}: ContentTabsProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [mounted, setMounted] = useState(false);

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

  return (
    <div className="space-y-4">
      {/* Compact tabs in right corner */}
      <div className="flex justify-end">
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
            onClick={() => handleTabChange("suggestions")}
            className={`px-3 py-1 text-sm rounded-md transition-colors relative ${
              activeTab === "suggestions" 
                ? "bg-background shadow text-foreground" 
                : "hover:bg-muted-foreground/10"
            }`}
          >
            Suggestions
            {suggestions.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-[10px] rounded-full flex items-center justify-center text-white">
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
        
        {activeTab === "suggestions" && (
          <ContentSuggestionsTable suggestions={suggestions} />
        )}
      </div>
    </div>
  );
}
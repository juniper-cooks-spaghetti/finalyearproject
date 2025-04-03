'use client';

import { useState, useEffect } from 'react';
import { TopicTable } from "./TopicTable";

interface TopicTabsProps {
  topics: any[];
}

export function TopicTabs({ topics }: TopicTabsProps) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before rendering tabs
  useEffect(() => {
    setMounted(true);
  }, []);

  // Debug tab change
  const handleTabChange = (value: string) => {
    console.log(`Tab changed to: ${value}`);
    setActiveTab(value);
  };

  // Get the filtered topics based on the active tab
  const getFilteredTopics = () => {
    if (activeTab === "all") return topics;
    
    if (activeTab === "easy") return topics.filter(t => t.difficulty <= 2);
    if (activeTab === "medium") return topics.filter(t => t.difficulty > 2 && t.difficulty <= 4);
    if (activeTab === "hard") return topics.filter(t => t.difficulty > 4);
    
    return topics;
  };

  // Don't render tabs until client-side
  if (!mounted) {
    return <div className="min-h-[200px] flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Topic Management</h1>
      </div>
      
      {/* Compact tabs in right corner */}
      <div className="flex justify-end">
        <div className="inline-flex bg-muted rounded-lg p-1">
          <button
            onClick={() => handleTabChange("all")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === "all" 
                ? "bg-background shadow text-foreground" 
                : "hover:bg-muted-foreground/10"
            }`}
          >
            All Topics
          </button>
          
          <button
            onClick={() => handleTabChange("easy")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === "easy" 
                ? "bg-background shadow text-foreground" 
                : "hover:bg-muted-foreground/10"
            }`}
          >
            Easy
          </button>
          
          <button
            onClick={() => handleTabChange("medium")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === "medium" 
                ? "bg-background shadow text-foreground" 
                : "hover:bg-muted-foreground/10"
            }`}
          >
            Medium
          </button>
          
          <button
            onClick={() => handleTabChange("hard")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === "hard" 
                ? "bg-background shadow text-foreground" 
                : "hover:bg-muted-foreground/10"
            }`}
          >
            Hard
          </button>
        </div>
      </div>
      
      {/* Content area */}
      <div className="w-full">
        <TopicTable topics={getFilteredTopics()} />
      </div>
    </div>
  );
}
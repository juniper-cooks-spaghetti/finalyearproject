'use client';

import { useState, useEffect } from 'react';
import { RoadmapTable } from "./RoadmapTable";
import { RebalanceButton } from "@/components/RebalanceButton";

interface RoadmapTabsProps {
  roadmaps: any[];
}

export function RoadmapTabs({ roadmaps }: RoadmapTabsProps) {
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

  // Get the filtered roadmaps based on the active tab
  const getFilteredRoadmaps = () => {
    if (activeTab === "all") return roadmaps;
    
    // Filter by category - assuming the category field exists
    return roadmaps.filter(roadmap => 
      roadmap.category?.toLowerCase() === activeTab.toLowerCase()
    );
  };

  // Get unique categories for tabs
  // Fix: Convert Set to Array using Array.from() instead of spread operator
  const categories = Array.from(
    new Set(roadmaps.map(r => r.category).filter(Boolean))
  );

  // Don't render tabs until client-side
  if (!mounted) {
    return <div className="min-h-[200px] flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Page header with aligned tabs */}
      <div className="flex justify-between items-center">
        
        <h1 className="text-3xl font-bold">Roadmap Management</h1>
        
        {/* Tabs aligned with title */}
        <div className="inline-flex bg-muted rounded-lg p-1">
          <button
            onClick={() => handleTabChange("all")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === "all" 
                ? "bg-background shadow text-foreground" 
                : "hover:bg-muted-foreground/10"
            }`}
          >
            All Roadmaps
          </button>
          
          {categories.map(category => (
            <button
              key={category}
              onClick={() => handleTabChange(category)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                activeTab === category 
                  ? "bg-background shadow text-foreground" 
                  : "hover:bg-muted-foreground/10"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      {/* Content area */}
      <div className="w-full">
        <RoadmapTable roadmaps={getFilteredRoadmaps()} />
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect, ReactNode } from 'react';

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabNavigationProps {
  tabs: Tab[];
  defaultTab: string;
  title: string;
  children: (activeTab: string) => ReactNode;
}

export function TabNavigation({ 
  tabs, 
  defaultTab,
  title,
  children 
}: TabNavigationProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before rendering tabs
  useEffect(() => {
    setMounted(true);
  }, []);

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
      {/* Page header with aligned tabs */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{title}</h1>
        
        {/* Tabs aligned with title */}
        <div className="inline-flex bg-muted rounded-lg p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-3 py-1 text-sm rounded-md transition-colors relative ${
                activeTab === tab.id 
                  ? "bg-background shadow text-foreground" 
                  : "hover:bg-muted-foreground/10"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-medium">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content area */}
      <div className="w-full">
        {children(activeTab)}
      </div>
    </div>
  );
}
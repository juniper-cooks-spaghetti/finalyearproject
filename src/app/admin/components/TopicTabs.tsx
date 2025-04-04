'use client';

import { TopicTable } from "./TopicTable";

interface TopicTabsProps {
  topics: any[];
}

export function TopicTabs({ topics }: TopicTabsProps) {
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Topic Management</h1>
      </div>
      
      {/* Content area - passing all topics directly */}
      <div className="w-full">
        <TopicTable topics={topics} />
      </div>
    </div>
  );
}
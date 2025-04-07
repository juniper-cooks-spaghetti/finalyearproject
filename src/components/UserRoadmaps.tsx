'use client';

import { useCallback, useState, useEffect } from 'react';
import { RoadmapCard } from "./RoadmapCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import useSWR from 'swr';

// Define the type for our roadmap data
type UserRoadmap = {
  id: string;
  completed: boolean;
  public: boolean;
  roadmap: {
    id: string;
    title: string;
    description: string;
  };
  topics: any[];
  // Other properties...
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function UserRoadmaps() {
  // Use SWR for data fetching with auto-revalidation
  const { data: userRoadmaps = [], error, isLoading, mutate } = useSWR<UserRoadmap[]>(
    '/api/user-roadmaps', 
    fetcher, 
    { 
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000
    }
  );

  const handleDataChange = useCallback(() => {
    // Manually trigger a revalidation
    mutate();
  }, [mutate]);

  const [currentPage, setCurrentPage] = useState(1);
  const roadmapsPerPage = 3;
  
  // Calculate total pages
  const totalPages = Math.ceil((userRoadmaps?.length || 0) / roadmapsPerPage);
  
  // Get current page's roadmaps
  const indexOfLastRoadmap = currentPage * roadmapsPerPage;
  const indexOfFirstRoadmap = indexOfLastRoadmap - roadmapsPerPage;
  const currentRoadmaps = userRoadmaps.slice(indexOfFirstRoadmap, indexOfLastRoadmap);
  
  // Navigation logic - unchanged
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  const previousPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

  useEffect(() => {
    // Combined event listener for all roadmap changes
    const handleRoadmapChange = () => {
      console.log("Roadmap data changed, refreshing...");
      mutate();
    };
    
    // Listen for both events
    window.addEventListener('roadmap-created', handleRoadmapChange);
    window.addEventListener('roadmap-changed', handleRoadmapChange);
    
    // Clean up event listeners on unmount
    return () => {
      window.removeEventListener('roadmap-created', handleRoadmapChange);
      window.removeEventListener('roadmap-changed', handleRoadmapChange);
    };
  }, [mutate]);

  // Re-adjust current page when total pages change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-6 rounded-lg border bg-card shadow-sm">
            <Skeleton className="h-8 w-2/3 mb-4" />
            <Skeleton className="h-20 w-full mb-4" />
            <div className="flex gap-2 justify-end">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 rounded-lg border bg-card shadow-sm">
        <h2 className="text-xl font-semibold text-center text-red-500">Error</h2>
        <p className="text-muted-foreground text-center">Failed to load roadmaps. Please try again later.</p>
      </div>
    );
  }

  // Empty state
  if (!userRoadmaps || userRoadmaps.length === 0) {
    return (
      <div className="p-6 rounded-lg border bg-card shadow-sm">
        <h2 className="text-xl font-semibold text-center">No roadmaps found</h2>
        <p className="text-muted-foreground text-center">Start by creating or joining a roadmap.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-6">
        {currentRoadmaps.map((userRoadmap) => (
          <RoadmapCard key={userRoadmap.id} userRoadmap={userRoadmap} onDataChange={handleDataChange} />
        ))}
      </div>
      
      {/* Enhanced Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-8 flex flex-col items-center">
          {/* Page indicator */}
          <p className="text-sm text-muted-foreground mb-2">
            Page {currentPage} of {totalPages}
          </p>
          
          {/* Pagination tabs */}
          <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={previousPage} 
              disabled={currentPage === 1}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            
            <div className="flex items-center">
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNumber = i + 1;
                
                // For small number of pages, show all numbers
                if (totalPages <= 5 || 
                    // Always show first and last page
                    pageNumber === 1 || 
                    pageNumber === totalPages ||
                    // Show pages adjacent to current page
                    Math.abs(currentPage - pageNumber) <= 1) {
                  return (
                    <Button
                      key={i}
                      variant={currentPage === pageNumber ? "default" : "ghost"}
                      size="sm"
                      onClick={() => paginate(pageNumber)}
                      className={`rounded-md min-w-[2rem] h-8 ${
                        currentPage === pageNumber 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-background/80"
                      }`}
                    >
                      {pageNumber}
                    </Button>
                  );
                }
                
                // Show ellipsis for gaps in sequence
                if ((pageNumber === 2 && currentPage > 3) || 
                    (pageNumber === totalPages - 1 && currentPage < totalPages - 2)) {
                  return (
                    <span key={i} className="w-8 text-center">
                      &hellip;
                    </span>
                  );
                }
                
                return null;
              })}
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={nextPage} 
              disabled={currentPage === totalPages}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
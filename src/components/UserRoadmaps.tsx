'use client';

import { useEffect, useState, useCallback } from 'react';
import { RoadmapCard } from "./RoadmapCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function UserRoadmaps() {
  const [userRoadmaps, setUserRoadmaps] = useState<UserRoadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const roadmapsPerPage = 3;
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDataChange = useCallback(() => {
    // Increment refresh key to force re-render
    setRefreshKey(prev => prev + 1);
    
    // You could also refetch data here if needed
  }, []);

  useEffect(() => {
    // Fetch roadmap data on component mount
    async function fetchRoadmaps() {
      try {
        setLoading(true);
        const response = await fetch('/api/user-roadmaps');
        
        if (!response.ok) {
          throw new Error('Failed to fetch roadmaps');
        }
        
        const data = await response.json();
        setUserRoadmaps(data);
      } catch (error) {
        console.error('Error fetching roadmaps:', error);
        setError('Failed to load roadmaps. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchRoadmaps();
  }, [refreshKey]);

  // Calculate total pages
  const totalPages = Math.ceil((userRoadmaps?.length || 0) / roadmapsPerPage);
  
  // Get current page's roadmaps
  const indexOfLastRoadmap = currentPage * roadmapsPerPage;
  const indexOfFirstRoadmap = indexOfLastRoadmap - roadmapsPerPage;
  const currentRoadmaps = userRoadmaps.slice(indexOfFirstRoadmap, indexOfLastRoadmap);
  
  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
  // Go to previous page
  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  // Go to next page
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Loading state
  if (loading) {
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
        <p className="text-muted-foreground text-center">{error}</p>
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
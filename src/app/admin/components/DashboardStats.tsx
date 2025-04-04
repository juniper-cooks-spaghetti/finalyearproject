'use client';

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, CheckCircle, GraduationCap, FileText, TrendingUp, Clock, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

// Define analytics data types
interface AnalyticsData {
  users: {
    total: number;
    newThisMonth: number;
    newPercentage: number;
    activeUsers: number;
    activePercentage: number;
  };
  roadmaps: {
    total: number;
    completedThisMonth: number;
    completedPercentage: number;
    totalCompleted: number;
    totalCompletionPercentage: number;
  };
  topics: {
    total: number;
    totalUserTopics: number;
    inProgress: number;
    completed: number;
    completionPercentage: number;
    completedThisMonth: number;
    completedThisMonthPercentage: number;
  };
  content: {
    total: number;
    newThisMonth: number;
    newPercentage: number;
  };
}

// Update the component props interface
interface DashboardStatsProps {
  onUserCardClick?: () => void;
  onRoadmapCardClick?: () => void;
  onTopicCardClick?: () => void;
  onContentCardClick?: () => void;
}

// Update the function signature
export function DashboardStats({ 
  onUserCardClick, 
  onRoadmapCardClick,
  onTopicCardClick,
  onContentCardClick
}: DashboardStatsProps = {}) {
  const [stats, setStats] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Add a ref for the graph view area
  const graphViewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/analytics');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch analytics data');
        }
        
        const data = await response.json();
        setStats(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setError(errorMessage);
        toast({
          title: "Error",
          description: `Failed to load dashboard stats: ${errorMessage}`,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [toast]);

  // Function to handle card clicks with automatic scrolling
  const handleCardClick = (callback?: () => void) => {
    // First call the original callback to update state
    if (callback) {
      callback();
    }
    
    // Then scroll to the graph view with a slight delay to ensure rendering
    setTimeout(() => {
      if (graphViewRef.current) {
        const yOffset = -20; // Add a little offset to give some space at the top
        const y = graphViewRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
        
        window.scrollTo({
          top: y,
          behavior: 'smooth'
        });
      }
    }, 50);
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <Card key={index} className="aspect-square">
            <CardContent className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-lg border border-destructive p-4 text-destructive">
        <p>Could not load dashboard statistics. Please try again later.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Users Card with improved text sizing */}
        <Card 
          className="aspect-square cursor-pointer hover:border-primary transition-colors" 
          onClick={() => handleCardClick(onUserCardClick)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col h-[calc(100%-60px)] justify-between">
            <div>
              <div className="text-3xl font-bold">{stats.users.total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total registered users</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-lg font-semibold">{stats.users.newThisMonth}</div>
                <div className="flex items-center">
                  <p className="text-xs text-muted-foreground">New this month</p>
                  <span className="ml-1 text-[11px] font-medium text-emerald-500 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
                    {stats.users.newPercentage}%
                  </span>
                </div>
              </div>
              <div>
                <div className="text-lg font-semibold">{stats.users.activeUsers}</div>
                <div className="flex items-center">
                  <p className="text-xs text-muted-foreground">Active users</p>
                  <span className="ml-1 text-[11px] font-medium text-emerald-500 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
                    {stats.users.activePercentage}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Roadmaps Card with improved text sizing */}
        <Card 
          className="aspect-square cursor-pointer hover:border-primary transition-colors"
          onClick={() => handleCardClick(onRoadmapCardClick)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Roadmaps
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col h-[calc(100%-60px)] justify-between">
            <div>
              <div className="text-3xl font-bold">{stats.roadmaps.total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total learning roadmaps</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-lg font-semibold">{stats.roadmaps.completedThisMonth}</div>
                <div className="flex items-center">
                  <p className="text-xs text-muted-foreground">This month</p>
                  <span className="ml-1 text-[11px] font-medium text-emerald-500 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
                    {stats.roadmaps.completedPercentage}%
                  </span>
                </div>
              </div>
              <div>
                <div className="text-lg font-semibold">{stats.roadmaps.totalCompleted}</div>
                <div className="flex items-center">
                  <p className="text-xs text-muted-foreground">All time</p>
                  <span className="ml-1 text-[11px] font-medium text-emerald-500 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
                    {stats.roadmaps.totalCompletionPercentage}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Topics Card with improved text sizing */}
        <Card 
          className="aspect-square cursor-pointer hover:border-primary transition-colors"
          onClick={() => handleCardClick(onTopicCardClick)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Topics
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col h-[calc(100%-60px)] justify-between">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-3xl font-bold">{stats.topics.total.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Total topics</p>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.topics.totalUserTopics.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">User enrollments</p>
              </div>
            </div>
            
            <Separator className="my-2" />
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-lg font-semibold">{stats.topics.inProgress}</div>
                <p className="text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 inline mr-1" />
                  In Progress
                </p>
              </div>
              <div>
                <div className="text-lg font-semibold">{stats.topics.completed}</div>
                <div className="flex items-center">
                  <p className="text-xs text-muted-foreground">
                    <CheckCircle className="h-3 w-3 inline mr-1" />
                    Completed
                  </p>
                  <span className="ml-1 text-[11px] font-medium text-emerald-500 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
                    {stats.topics.completionPercentage}%
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-2 flex justify-between items-center">
              <div className="text-lg font-semibold">{stats.topics.completedThisMonth}</div>
              <p className="text-xs text-muted-foreground">Completed this month</p>
            </div>
          </CardContent>
        </Card>

        {/* Content Card with improved text sizing for consistency */}
        <Card 
          className="aspect-square cursor-pointer hover:border-primary transition-colors"
          onClick={() => handleCardClick(onContentCardClick)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Content
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col h-[calc(100%-60px)] justify-between">
            <div>
              <div className="text-3xl font-bold">{stats.content.total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total learning materials</p>
            </div>
            
            <Separator className="my-3" />
            
            <div>
              <div className="flex items-center">
                <div className="text-2xl font-semibold">{stats.content.newThisMonth}</div>
                <span className="ml-2 text-[11px] font-medium text-emerald-500 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 px-2 py-0.5 rounded-full flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {stats.content.newPercentage}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground">New content this month</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Add a reference div for the graph view scroll target */}
      <div ref={graphViewRef} className="h-0 mt-6" aria-hidden="true" />
    </>
  );
}
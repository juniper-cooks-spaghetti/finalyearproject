'use client';

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, BookOpen, CheckCircle, AlertTriangle, TrendingUp, BarChart } from "lucide-react";
import { BarChart as ReBarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Progress } from "@/components/ui/progress";

interface MonthlyCompletionData {
  month: string;
  completedRoadmaps: number;
}

interface PopularRoadmap {
  id: string;
  title: string;
  enrollments: number;
}

interface CompletionRate {
  id: string;
  title: string;
  totalEnrollments: number;
  completedCount: number;
  completionRate: number;
}

interface RoadmapAnalytics {
  monthlyCompletionData: MonthlyCompletionData[];
  overall: {
    totalRoadmaps: number;
    totalUserRoadmaps: number;
    totalCompletedUserRoadmaps: number;
    abandonedUserRoadmaps: number;
    inProgressUserRoadmaps: number;
    completionRate: number;
  };
  popularRoadmaps: PopularRoadmap[];
  completionRates: CompletionRate[];
}

// Colors for the pie chart
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export function RoadmapGraphView() {
  const [analytics, setAnalytics] = useState<RoadmapAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchRoadmapAnalytics() {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/roadmap-analytics');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch roadmap analytics data');
        }
        
        const data = await response.json();
        setAnalytics(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setError(errorMessage);
        toast({
          title: "Error",
          description: `Failed to load roadmap analytics: ${errorMessage}`,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }

    fetchRoadmapAnalytics();
  }, [toast]);

  if (loading) {
    return (
      <Card className="mt-6">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !analytics) {
    return (
      <Card className="mt-6 border-destructive">
        <CardContent className="py-6">
          <p className="text-destructive">Could not load roadmap analytics. Please try again later.</p>
        </CardContent>
      </Card>
    );
  }

  // Data for the roadmap status pie chart
  const roadmapStatusData = [
    { name: 'Completed', value: analytics.overall.totalCompletedUserRoadmaps },
    { name: 'In Progress', value: analytics.overall.inProgressUserRoadmaps },
    { name: 'Inactive', value: analytics.overall.abandonedUserRoadmaps }, // Changed from 'Abandoned' to 'Inactive'
  ];

  return (
    <div className="mt-6 space-y-6">
      {/* Monthly Completion Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <BookOpen className="mr-2 h-5 w-5" />
            Roadmap Completion Trends
          </CardTitle>
          <CardDescription>Monthly roadmap completions over the last year</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={analytics.monthlyCompletionData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="completedRoadmaps"
                  name="Completed Roadmaps"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Roadmap Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <BarChart className="mr-2 h-5 w-5" />
              Roadmap Status Distribution
            </CardTitle>
            <CardDescription>Overview of roadmap enrollment statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roadmapStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {roadmapStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} enrollments`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Add explanatory note for Inactive roadmaps */}
            <div className="mt-4 text-xs text-muted-foreground">
              * Inactive roadmaps are those that haven't shown any activity for over 30 days and are not marked as completed.
            </div>
            
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm">Total Roadmaps: <span className="font-medium">{analytics.overall.totalRoadmaps}</span></div>
              <div className="text-sm">Total Enrollments: <span className="font-medium">{analytics.overall.totalUserRoadmaps}</span></div>
            </div>
            
            <div className="mt-4">
              <div className="flex justify-between mb-1">
                <div className="text-sm font-medium">Overall Completion Rate</div>
                <div className="text-sm font-medium">{analytics.overall.completionRate}%</div>
              </div>
              <Progress value={analytics.overall.completionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Popular Roadmaps */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Most Popular Roadmaps
            </CardTitle>
            <CardDescription>Roadmaps with the highest enrollment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart
                  data={analytics.popularRoadmaps}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 60,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="title" 
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    interval={0}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="enrollments" name="Enrollments" fill="#8884d8" />
                </ReBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Roadmap Completion Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <CheckCircle className="mr-2 h-5 w-5" />
            Roadmap Completion Rates
          </CardTitle>
          <CardDescription>Completion rates for the most popular roadmaps</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.completionRates.slice(0, 5).map((roadmap) => (
              <div key={roadmap.id} className="space-y-1">
                <div className="flex justify-between items-center text-sm font-medium">
                  <div className="truncate max-w-[70%]">{roadmap.title}</div>
                  <div>{roadmap.completionRate}% ({roadmap.completedCount}/{roadmap.totalEnrollments})</div>
                </div>
                <Progress value={roadmap.completionRate} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
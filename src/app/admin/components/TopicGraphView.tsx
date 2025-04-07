'use client';

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, BarChart2, GraduationCap, CheckCircle, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Progress } from "@/components/ui/progress";

interface MonthlyCompletionData {
  month: string;
  completedTopics: number;
  startedTopics: number;
}

interface PopularTopic {
  id: string;
  title: string;
  assignments: number;
}

interface CompletionRate {
  id: string;
  title: string;
  totalAssignments: number;
  completedCount: number;
  completionRate: number;
}

interface DifficultyRating {
  id: string;
  title: string;
  averageDifficulty: number;
  averageTimeSpent: number;
  averageCompletionTime: number;
}

interface TopicAnalytics {
  monthlyCompletionData: MonthlyCompletionData[];
  overall: {
    totalTopics: number;
    totalAssignedTopics: number;
    topicsInProgress: number;
    topicsCompleted: number;
    skippedTopics: number;
    completionRate: number;
  };
  popularTopics: PopularTopic[];
  completionRates: CompletionRate[];
  difficultyRatings: DifficultyRating[];
}

// Colors for the pie chart
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#FF5733'];

export function TopicGraphView() {
  const [analytics, setAnalytics] = useState<TopicAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchTopicAnalytics() {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/topic-analytics');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch topic analytics data');
        }
        
        const data = await response.json();
        setAnalytics(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setError(errorMessage);
        toast({
          title: "Error",
          description: `Failed to load topic analytics: ${errorMessage}`,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }

    fetchTopicAnalytics();
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
          <p className="text-destructive">Could not load topic analytics. Please try again later.</p>
        </CardContent>
      </Card>
    );
  }

  // Data for the topic status pie chart
  const topicStatusData = [
    { name: 'Completed', value: analytics.overall.topicsCompleted },
    { name: 'In Progress', value: analytics.overall.topicsInProgress },
    { name: 'Skipped', value: analytics.overall.skippedTopics },
    { name: 'Not Started', value: analytics.overall.totalAssignedTopics - analytics.overall.topicsCompleted - analytics.overall.topicsInProgress - analytics.overall.skippedTopics },
  ];

  return (
    <div className="mt-6 space-y-6">
      {/* Monthly Completion Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <GraduationCap className="mr-2 h-5 w-5" />
            Topic Completion Trends
          </CardTitle>
          <CardDescription>Monthly topic completions and new starts over the last year</CardDescription>
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
                  dataKey="completedTopics"
                  name="Completed Topics"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="startedTopics"
                  name="Newly Started Topics"
                  stroke="#82ca9d"
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
        {/* Topic Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <BarChart2 className="mr-2 h-5 w-5" />
              Topic Status Distribution
            </CardTitle>
            <CardDescription>Overview of topic progress statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topicStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {topicStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} topics`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm">Total Topics: <span className="font-medium">{analytics.overall.totalTopics}</span></div>
                <div className="text-sm">Total Assignments: <span className="font-medium">{analytics.overall.totalAssignedTopics}</span></div>
              </div>
              <div>
                <div className="text-sm">Skipped Topics: <span className="font-medium">{analytics.overall.skippedTopics}</span></div>
                <div className="text-sm">Completion Rate: <span className="font-medium">{analytics.overall.completionRate}%</span></div>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex justify-between mb-1">
                <div className="text-sm font-medium">Overall Progress</div>
                <div className="text-sm font-medium">{analytics.overall.completionRate}%</div>
              </div>
              <Progress value={analytics.overall.completionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Popular Topics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Most Popular Topics
            </CardTitle>
            <CardDescription>Topics with the highest number of assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.popularTopics}
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
                  <Bar dataKey="assignments" name="Assignments" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Topic Completion Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <CheckCircle className="mr-2 h-5 w-5" />
            Topic Completion Rates
          </CardTitle>
          <CardDescription>Completion rates for the most assigned topics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.completionRates.slice(0, 5).map((topic) => (
              <div key={topic.id} className="space-y-1">
                <div className="flex justify-between items-center text-sm font-medium">
                  <div className="truncate max-w-[70%]">{topic.title}</div>
                  <div>{topic.completionRate}% ({topic.completedCount}/{topic.totalAssignments})</div>
                </div>
                <Progress value={topic.completionRate} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Topic Difficulty Ratings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Most Challenging Topics
          </CardTitle>
          <CardDescription>Topics with the highest difficulty ratings and completion times</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Difficulty Rating Chart */}
            <div>
              <h3 className="text-sm font-medium mb-4 flex items-center">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Difficulty Rating (0-5)
              </h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.difficultyRatings.slice(0, 5)}
                    margin={{ top: 5, right: 10, left: 20, bottom: 60 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 5]} />
                    <YAxis 
                      dataKey="title" 
                      type="category"
                      width={120}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip formatter={(value) => {
                      // Check if value is a number before calling toFixed
                      if (typeof value === 'number') {
                        return [`${value.toFixed(1)}/5`, 'Difficulty'];
                      }
                      // Return a fallback for non-number values
                      return [`${value}/5`, 'Difficulty'];
                    }} />
                    <Bar dataKey="averageDifficulty" name="Difficulty" fill="#FF8042" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Average Time Chart */}
            <div>
              <h3 className="text-sm font-medium mb-4 flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                Average Completion Time (minutes)
              </h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.difficultyRatings.slice(0, 5)}
                    margin={{ top: 5, right: 10, left: 20, bottom: 60 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="title" 
                      type="category"
                      width={120}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip formatter={(value) => [`${value} min`, 'Time']} />
                    <Bar dataKey="averageTimeSpent" name="Time (min)" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Optional: Summary Table */}
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-3">Summary of Most Challenging Topics</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Topic</th>
                    <th className="text-right py-2 font-medium">Difficulty</th>
                    <th className="text-right py-2 font-medium">Time (min)</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.difficultyRatings.slice(0, 5).map((topic) => (
                    <tr key={topic.id} className="border-b">
                      <td className="py-2 truncate max-w-[200px]">{topic.title}</td>
                      <td className="text-right py-2">{topic.averageDifficulty.toFixed(1)}/5</td>
                      <td className="text-right py-2">{Math.round(topic.averageTimeSpent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
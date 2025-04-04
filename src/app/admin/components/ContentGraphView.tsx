'use client';

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, PieChart, TrendingUp, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart as RePieChart, Pie } from 'recharts';
import Link from "next/link";

interface TypeDistribution {
  type: string;
  count: number;
}

interface TopicNeedingContent {
  id: string;
  title: string;
  contentCount: number;
  suggestionCount: number;
  createdAt: Date;
  urgent: boolean;
}

interface MonthlyContentData {
  month: string;
  newContent: number;
  pendingSuggestions: number;
}

interface ContentSuggestion {
  id: string;
  title: string;
  type: string;
  url: string;
  amount: number;
  topic: {
    id: string;
    title: string;
  };
}

interface ContentAnalytics {
  overall: {
    totalContent: number;
    newContentThisMonth: number;
    pendingSuggestions: number;
  };
  typeDistribution: TypeDistribution[];
  topicsNeedingContent: TopicNeedingContent[];
  monthlyContentData: MonthlyContentData[];
  topSuggestions: ContentSuggestion[];
}

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#FF5733', '#C70039', '#900C3F', '#581845', '#FFC300', '#33FF57'];
const URGENT_COLOR = '#FF0000';
const NORMAL_COLOR = '#0088FE';

export function ContentGraphView() {
  const [analytics, setAnalytics] = useState<ContentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchContentAnalytics() {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/content-analytics');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch content analytics data');
        }
        
        const data = await response.json();
        setAnalytics(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setError(errorMessage);
        toast({
          title: "Error",
          description: `Failed to load content analytics: ${errorMessage}`,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }

    fetchContentAnalytics();
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
          <p className="text-destructive">Could not load content analytics. Please try again later.</p>
        </CardContent>
      </Card>
    );
  }

  // Format date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="mt-6 space-y-6">
      {/* Content Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Content Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <FileText className="mr-2 h-4 w-4" />
              Total Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.overall.totalContent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Learning materials available</p>
          </CardContent>
        </Card>

        {/* New Content This Month Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="mr-2 h-4 w-4" />
              New Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.overall.newContentThisMonth.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Added this month</p>
          </CardContent>
        </Card>

        {/* Pending Suggestions Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              Pending Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.overall.pendingSuggestions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Content suggestions from users</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Analysis Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Content Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Content Growth Trends
            </CardTitle>
            <CardDescription>Monthly content additions and pending suggestions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={analytics.monthlyContentData}
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
                    dataKey="newContent"
                    name="New Content"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="pendingSuggestions"
                    name="Pending Suggestions"
                    stroke="#82ca9d"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Content Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <PieChart className="mr-2 h-5 w-5" />
              Content Type Distribution
            </CardTitle>
            <CardDescription>Breakdown of content by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={analytics.typeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="type"
                  >
                    {analytics.typeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => [`${value} items`, props.payload.type]}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Topics Needing Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
            Topics Needing Content
          </CardTitle>
          <CardDescription>Topics with the least amount of learning materials</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.topicsNeedingContent}
                layout="vertical"
                margin={{
                  top: 5,
                  right: 30,
                  left: 120,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                  type="category" 
                  dataKey="title" 
                  width={120}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value, name, props) => {
                    if (name === "Content Count") {
                      return [`${value} items`, "Content Count"];
                    }
                    return [`${value} suggestions`, "Pending Suggestions"];
                  }}
                  labelFormatter={(label, props) => {
                    const topic = analytics.topicsNeedingContent.find(t => t.title === label);
                    return `${label} ${topic?.urgent ? '(Urgent!)' : ''}`;
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="contentCount" 
                  name="Content Count" 
                  fill="#0088FE"
                >
                  {analytics.topicsNeedingContent.map((entry, index) => (
                    <Cell key={`cell-content-${index}`} fill={entry.urgent ? URGENT_COLOR : NORMAL_COLOR} />
                  ))}
                </Bar>
                <Bar 
                  dataKey="suggestionCount" 
                  name="Pending Suggestions" 
                  fill="#00C49F" 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start">
          <p className="text-sm mb-2">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>
            <span className="font-medium">Urgent Attention Required</span> - Topics that are older than 30 days with less than 3 content items
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/content">
              Manage Topics
            </Link>
          </Button>
        </CardFooter>
      </Card>

      {/* Top Content Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-emerald-500" />
            Top Content Suggestions
          </CardTitle>
          <CardDescription>Most requested content by users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="pb-2 font-medium text-sm">Title</th>
                  <th className="pb-2 font-medium text-sm">Type</th>
                  <th className="pb-2 font-medium text-sm">Topic</th>
                  <th className="pb-2 font-medium text-sm text-right">Votes</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topSuggestions.slice(0, 5).map((suggestion) => (
                  <tr key={suggestion.id} className="border-t">
                    <td className="py-3 pr-4">
                      <a 
                        href={suggestion.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline text-blue-600 dark:text-blue-400"
                      >
                        {suggestion.title.length > 40 ? `${suggestion.title.substring(0, 40)}...` : suggestion.title}
                      </a>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant="outline" className="text-xs">
                        {suggestion.type}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-sm">
                      {suggestion.topic.title.length > 25 ? `${suggestion.topic.title.substring(0, 25)}...` : suggestion.topic.title}
                    </td>
                    <td className="py-3 text-right">
                      <Badge className="bg-green-500 hover:bg-green-600 text-white">
                        {suggestion.amount}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/content/suggestions">
              View All Suggestions
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
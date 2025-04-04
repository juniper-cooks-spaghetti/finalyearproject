'use client';

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Calendar, CalendarDays } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface UserGrowthData {
  month: string;
  totalUsers: number;
  activeUsers: number;
}

interface UserAnalytics {
  growthData: UserGrowthData[];
  activeUsers: {
    last7Days: number;
    last30Days: number;
  };
}

export function UserGraphView() {
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchUserAnalytics() {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/user-analytics');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch user analytics data');
        }
        
        const data = await response.json();
        setAnalytics(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setError(errorMessage);
        toast({
          title: "Error",
          description: `Failed to load user analytics: ${errorMessage}`,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }

    fetchUserAnalytics();
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
          <p className="text-destructive">Could not load user analytics. Please try again later.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Users className="mr-2 h-5 w-5" />
            User Growth Trends
          </CardTitle>
          <CardDescription>Monthly growth in user registrations and active users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={analytics.growthData}
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
                  dataKey="totalUsers"
                  name="Total Users"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="activeUsers"
                  name="Monthly Active Users"
                  stroke="#82ca9d"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              <Calendar className="mr-2 h-4 w-4 inline" />
              Weekly Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.activeUsers.last7Days.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Users active in the last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              <CalendarDays className="mr-2 h-4 w-4 inline" />
              Monthly Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.activeUsers.last30Days.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Users active in the last 30 days</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
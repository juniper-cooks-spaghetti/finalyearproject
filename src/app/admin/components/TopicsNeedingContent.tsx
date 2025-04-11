'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";

interface TopicNeedingContent {
  id: string;
  title: string;
  contentCount: number;
  suggestionCount: number;
  urgent: boolean;
}

interface TopicsNeedingContentProps {
  onTopicSelect: (topic: TopicNeedingContent) => void;
}

export function TopicsNeedingContent({ onTopicSelect }: TopicsNeedingContentProps) {
  const [topics, setTopics] = useState<TopicNeedingContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchTopicsNeedingContent() {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/content-analytics');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch content analytics data');
        }
        
        const data = await response.json();
        setTopics(data.topicsNeedingContent);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setError(errorMessage);
        toast({
          title: "Error",
          description: `Failed to load topics needing content: ${errorMessage}`,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }

    fetchTopicsNeedingContent();
  }, [toast]);

  if (loading) {
    return (
      <Card className="mb-4">
        <CardContent className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !topics) {
    return (
      <Card className="mb-4 border-destructive">
        <CardContent className="py-4">
          <p className="text-destructive">Could not load topics. Please try again later.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
          Topics Needing Content
        </CardTitle>
        <CardDescription>Quick-select topics with the least amount of learning materials</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {topics.map((topic) => (
            <Button
              key={topic.id}
              variant={topic.urgent ? "destructive" : "outline"}
              size="sm"
              className="flex items-center gap-2"
              onClick={() => onTopicSelect(topic)}
            >
              {topic.title}
              <Badge variant={topic.urgent ? "destructive" : "secondary"} className="ml-1">
                {topic.contentCount}
              </Badge>
            </Button>
          ))}
        </div>
        {topics.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">No topics requiring content updates found.</p>
        )}
      </CardContent>
    </Card>
  );
}
'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, Unlink, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { deleteTopic, removeTopicFromRoadmap } from "@/actions/admin.action";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Topic {
  id: string;
  title: string;
  difficulty: number | null;
  estimatedTime: number | null;
  roadmaps: {
    roadmap: {
      id: string;
      title: string;
    };
  }[];
  createdAt: string;
  _count: {
    contents: number;
    UserTopicCompletion: number;
  }
}

export function TopicTable({ topics }: { topics: Topic[] }) {
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [unlinkingData, setUnlinkingData] = useState<{topicId: string, roadmapId: string} | null>(null);

  const handleDelete = async (topicId: string) => {
    if (!confirm('Are you sure? This will permanently delete the topic and remove it from all roadmaps.')) {
      return;
    }

    try {
      setDeletingId(topicId);
      const result = await deleteTopic(topicId);
      
      if (result.success) {
        toast({
          title: "Topic deleted",
          description: "Topic has been permanently removed"
        });
        window.location.reload();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete topic. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleUnlink = async (topicId: string, roadmapId: string) => {
    try {
      setUnlinkingData({ topicId, roadmapId });
      const result = await removeTopicFromRoadmap(topicId, roadmapId);
      
      if (result.success) {
        toast({
          title: "Topic unlinked",
          description: "Topic has been removed from the roadmap"
        });
        window.location.reload();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unlink topic. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUnlinkingData(null);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Roadmaps</TableHead>
            <TableHead>Difficulty</TableHead>
            <TableHead>Est. Time (min)</TableHead>
            <TableHead>Content Items</TableHead>
            <TableHead>Completions</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {topics.map((topic) => (
            <TableRow key={topic.id}>
              <TableCell className="font-medium">{topic.title}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {topic.roadmaps.map(({ roadmap }) => (
                    <div key={roadmap.id} className="flex items-center gap-2">
                      <span className="text-sm">{roadmap.title}</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnlink(topic.id, roadmap.id)}
                              disabled={unlinkingData?.topicId === topic.id && unlinkingData?.roadmapId === roadmap.id}
                              className="h-6 w-6 p-0"
                            >
                              {unlinkingData?.topicId === topic.id && unlinkingData?.roadmapId === roadmap.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Unlink className="h-3 w-3 text-muted-foreground" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Remove from roadmap</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ))}
                </div>
              </TableCell>
              <TableCell>{topic.difficulty || 'N/A'}</TableCell>
              <TableCell>{topic.estimatedTime || 'N/A'}</TableCell>
              <TableCell>{topic._count.contents}</TableCell>
              <TableCell>{topic._count.UserTopicCompletion}</TableCell>
              <TableCell>{new Date(topic.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(topic.id)}
                        disabled={deletingId === topic.id}
                        className="text-destructive hover:text-destructive/90"
                      >
                        {deletingId === topic.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delete topic permanently</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
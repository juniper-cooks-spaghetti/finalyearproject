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
import { Badge } from "@/components/ui/badge";
import { Trash2, Loader2, ExternalLink, Unlink, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { deleteContent, removeContentFromTopic, revalidateContentPage } from "@/actions/admin.action";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";

interface Content {
  id: string;
  title: string;
  type: string;
  url: string;
  description: string;
  topics: {
    topic: {
      id: string;
      title: string;
    };
  }[];
  createdAt: string;
  _count: {
    userInteractions: number;
  }
}

export function ContentTable({ content }: { content: Content[] }) {
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [unlinkingData, setUnlinkingData] = useState<{contentId: string, topicId: string} | null>(null);
  const router = useRouter();

  const handleDelete = async (contentId: string) => {
    if (!confirm('Are you sure? This will permanently delete the content from all topics.')) {
      return;
    }

    try {
      setDeletingId(contentId);
      const result = await deleteContent(contentId);
      
      if (result.success) {
        toast({
          title: "Content deleted",
          description: "Content has been permanently removed"
        });
        
        // Refresh the data using Next.js router
        await revalidateContentPage();
        router.refresh();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleUnlink = async (contentId: string, topicId: string) => {
    try {
      setUnlinkingData({ contentId, topicId });
      const result = await removeContentFromTopic(contentId, topicId);
      
      if (result.success) {
        toast({
          title: "Content unlinked",
          description: "Content has been removed from the topic"
        });
        
        // Refresh the data using Next.js router
        await revalidateContentPage();
        router.refresh();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unlink content. Please try again.",
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
            <TableHead>Type</TableHead>
            <TableHead>Topics</TableHead>
            <TableHead>Interactions</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>URL</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {content.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.title}</TableCell>
              <TableCell>
                <Badge variant="secondary">{item.type}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {item.topics.map(({ topic }) => (
                    <div key={topic.id} className="flex items-center gap-2">
                      <span className="text-sm">{topic.title}</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnlink(item.id, topic.id)}
                              disabled={unlinkingData?.contentId === item.id && unlinkingData?.topicId === topic.id}
                              className="h-6 w-6 p-0"
                            >
                              {unlinkingData?.contentId === item.id && unlinkingData?.topicId === topic.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Unlink className="h-3 w-3 text-muted-foreground" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Remove from topic</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ))}
                </div>
              </TableCell>
              <TableCell>{item._count.userInteractions}</TableCell>
              <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  asChild
                >
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </TableCell>
              <TableCell>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="text-destructive hover:text-destructive/90"
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delete content permanently</p>
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
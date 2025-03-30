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
import { Check, X, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { handleContentSuggestion } from "@/actions/admin.action";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ContentSuggestion {
  id: string;
  title: string;
  type: string;
  url: string;
  description: string;
  amount: number;
  topic: {
    id: string;
    title: string;
  };
}

export function ContentSuggestionsTable({ suggestions }: { suggestions: ContentSuggestion[] }) {
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAction = async (suggestion: ContentSuggestion, action: 'approve' | 'reject') => {
    try {
      setProcessingId(suggestion.id);
      const result = await handleContentSuggestion(
        {
          id: suggestion.id,
          topicId: suggestion.topic.id,
          title: suggestion.title,
          type: suggestion.type,
          url: suggestion.url,
          description: suggestion.description
        },
        action
      );

      if (result.success) {
        toast({
          title: action === 'approve' ? "Content Approved" : "Content Rejected",
          description: action === 'approve' 
            ? "Content has been added to the topic" 
            : "Suggestion has been rejected"
        });
        window.location.reload();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} content. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Topic</TableHead>
            <TableHead>Suggestions</TableHead>
            <TableHead>URL</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suggestions.map((suggestion) => (
            <TableRow key={suggestion.id}>
              <TableCell className="font-medium">{suggestion.title}</TableCell>
              <TableCell>
                <Badge variant="secondary">{suggestion.type}</Badge>
              </TableCell>
              <TableCell>{suggestion.topic.title}</TableCell>
              <TableCell>
                <Badge variant="default" className="bg-green-500">
                  {suggestion.amount}
                </Badge>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  asChild
                >
                  <a href={suggestion.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </TableCell>
              <TableCell className="text-right space-x-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAction(suggestion, 'approve')}
                        disabled={processingId === suggestion.id}
                      >
                        {processingId === suggestion.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Approve suggestion</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAction(suggestion, 'reject')}
                        disabled={processingId === suggestion.id}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Reject suggestion</p>
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
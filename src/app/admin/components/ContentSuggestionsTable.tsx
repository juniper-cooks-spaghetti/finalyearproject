'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2, ExternalLink, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { handleContentSuggestion, revalidateContentPage } from "@/actions/admin.action";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

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
  const router = useRouter();
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
        
        // Refresh the data using Next.js router
        await revalidateContentPage();
        router.refresh();
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

  // Define columns for the DataTable
  const columns: ColumnDef<ContentSuggestion>[] = [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => <div className="font-medium">{row.getValue("title")}</div>,
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="secondary">{row.getValue("type")}</Badge>
      ),
    },
    {
      accessorKey: "topic.title",
      header: "Topic",
      cell: ({ row }) => row.original.topic.title,
    },
    {
      accessorKey: "amount",
      header: "Suggestions",
      cell: ({ row }) => (
        <Badge variant="default" className="bg-green-500">
          {row.getValue("amount")}
        </Badge>
      ),
    },
    {
      id: "url",
      header: "URL",
      cell: ({ row }) => {
        const url = row.original.url;
        return (
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center hover:text-primary"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const suggestion = row.original;
        
        return (
          <div className="flex justify-end space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction(suggestion, 'approve')}
                    disabled={processingId === suggestion.id}
                    className="text-green-500 border-green-500 hover:bg-green-500/10"
                  >
                    {processingId === suggestion.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    <span className="ml-2">Approve</span>
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
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction(suggestion, 'reject')}
                    disabled={processingId === suggestion.id}
                    className="text-destructive border-destructive hover:bg-destructive/10"
                  >
                    <X className="h-4 w-4" />
                    <span className="ml-2">Reject</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reject suggestion</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable 
      columns={columns} 
      data={suggestions} 
      searchKey="title"
      searchPlaceholder="Search suggestions..."
      pageSize={25}
    />
  );
}
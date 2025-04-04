'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Loader2, ExternalLink, Unlink, AlertTriangle, Edit, MoreHorizontal, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { deleteContent, removeContentFromTopic, revalidateContentPage } from "@/actions/admin.action";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

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
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [unlinkingData, setUnlinkingData] = useState<{contentId: string, topicId: string} | null>(null);
  const [selectedContent, setSelectedContent] = useState<Content[]>([]);

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
  
  const handleBulkDelete = async () => {
    if (!selectedContent.length) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedContent.length} content item(s)? This will permanently remove them from all topics.`)) {
      return;
    }
    
    try {
      let success = 0;
      let failed = 0;
      
      for (const item of selectedContent) {
        try {
          const result = await deleteContent(item.id);
          if (result.success) {
            success++;
          } else {
            failed++;
          }
        } catch (error) {
          failed++;
        }
      }
      
      toast({
        title: `Deleted ${success} content item(s)`,
        description: failed > 0 ? `Failed to delete ${failed} item(s)` : undefined,
        variant: failed > 0 ? "destructive" : "default",
      });
      
      await revalidateContentPage();
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to perform bulk delete. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Define columns for the DataTable
  const columns: ColumnDef<Content>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
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
      id: "topics",
      header: "Topics",
      cell: ({ row }) => {
        const content = row.original;
        if (content.topics.length === 0) {
          return <span className="text-muted-foreground text-sm italic">None</span>;
        }
        
        return (
          <div className="flex flex-col gap-1 max-w-[250px]">
            {content.topics.map(({ topic }) => (
              <div key={topic.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{topic.title}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnlink(content.id, topic.id)}
                        disabled={unlinkingData?.contentId === content.id && unlinkingData?.topicId === topic.id}
                        className="h-6 w-6 p-0 ml-1"
                      >
                        {unlinkingData?.contentId === content.id && unlinkingData?.topicId === topic.id ? (
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
        );
      },
    },
    {
      accessorKey: "_count.userInteractions",
      header: "Interactions",
      cell: ({ row }) => {
        const count = row.original._count.userInteractions;
        return (
          <div className="flex items-center">
            <BookOpen className="h-3 w-3 mr-1" />
            <span>{count}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => new Date(row.getValue("createdAt")).toLocaleDateString(),
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
        const content = row.original;
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.push(`/admin/content/${content.id}`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Content
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={content.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open URL
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleDelete(content.id)}
                disabled={deletingId === content.id}
              >
                {deletingId === content.id ? 
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> :
                  <Trash2 className="mr-2 h-4 w-4" />
                }
                Delete Content
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {selectedContent.length > 0 && (
        <div className="flex items-center gap-2">
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleBulkDelete}
            className="flex items-center gap-1"
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected ({selectedContent.length})
          </Button>
        </div>
      )}
      
      <DataTable 
        columns={columns} 
        data={content} 
        searchKey="title"
        searchPlaceholder="Search content..."
        pageSize={25}
        onRowSelection={setSelectedContent}
      />
    </div>
  );
}
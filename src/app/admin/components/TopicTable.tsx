'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, Unlink, Book, Edit, MoreHorizontal, Clock, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { deleteTopic, removeTopicFromRoadmap, revalidateTopicsPage } from "@/actions/admin.action";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

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
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [unlinkingData, setUnlinkingData] = useState<{topicId: string, roadmapId: string} | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<Topic[]>([]);

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
        await revalidateTopicsPage();
        router.refresh();
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
        await revalidateTopicsPage();
        router.refresh();
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
  
  const handleBulkDelete = async () => {
    if (!selectedTopics.length) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedTopics.length} topic(s)? This will permanently remove them from all roadmaps.`)) {
      return;
    }
    
    try {
      let success = 0;
      let failed = 0;
      
      for (const topic of selectedTopics) {
        try {
          const result = await deleteTopic(topic.id);
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
        title: `Deleted ${success} topic(s)`,
        description: failed > 0 ? `Failed to delete ${failed} topic(s)` : undefined,
        variant: failed > 0 ? "destructive" : "default",
      });
      
      await revalidateTopicsPage();
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to perform bulk delete. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Render difficulty stars
  const renderDifficultyStars = (difficulty: number | null) => {
    if (difficulty === null) return 'N/A';
    
    const difficultyLevel = Math.min(Math.max(1, Math.round(difficulty)), 5);
    const color = 
      difficultyLevel <= 2 ? 'text-green-500' : 
      difficultyLevel <= 4 ? 'text-amber-500' : 
      'text-red-500';
    
    return (
      <div className="flex items-center">
        <Star className={`h-4 w-4 ${color} fill-current`} />
        <span className="ml-1">{difficultyLevel}</span>
      </div>
    );
  };

  // Define columns for the DataTable
  const columns: ColumnDef<Topic>[] = [
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
      id: "roadmaps",
      header: "Roadmaps",
      cell: ({ row }) => {
        const topic = row.original;
        if (topic.roadmaps.length === 0) {
          return <span className="text-muted-foreground text-sm italic">None</span>;
        }
        
        return (
          <div className="flex flex-col gap-1 max-w-[250px]">
            {topic.roadmaps.map(({ roadmap }) => (
              <div key={roadmap.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{roadmap.title}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnlink(topic.id, roadmap.id)}
                        disabled={unlinkingData?.topicId === topic.id && unlinkingData?.roadmapId === roadmap.id}
                        className="h-6 w-6 p-0 ml-1"
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
        );
      },
    },
    {
      accessorKey: "difficulty",
      header: "Difficulty",
      cell: ({ row }) => renderDifficultyStars(row.getValue("difficulty")),
    },
    {
      accessorKey: "estimatedTime",
      header: "Est. Time",
      cell: ({ row }) => {
        const time = row.getValue("estimatedTime");
        if (!time) return 'N/A';
        return (
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            <span>{String(time)} min</span>
          </div>
        );
      },
    },
    {
      accessorKey: "_count.contents",
      header: "Content",
      cell: ({ row }) => {
        const count = row.original._count.contents;
        return (
          <div className="flex items-center">
            <Book className="h-3 w-3 mr-1" />
            <span>{count}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "_count.UserTopicCompletion",
      header: "Completions",
      cell: ({ row }) => row.original._count.UserTopicCompletion,
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => new Date(row.getValue("createdAt")).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const topic = row.original;
        
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
                onClick={() => router.push(`/admin/topics/${topic.id}`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Topic
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(`/admin/topics/${topic.id}/content`)}
              >
                <Book className="mr-2 h-4 w-4" />
                Manage Content
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleDelete(topic.id)}
                disabled={deletingId === topic.id}
              >
                {deletingId === topic.id ? 
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> :
                  <Trash2 className="mr-2 h-4 w-4" />
                }
                Delete Topic
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {selectedTopics.length > 0 && (
        <div className="flex items-center gap-2">
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleBulkDelete}
            className="flex items-center gap-1"
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected ({selectedTopics.length})
          </Button>
        </div>
      )}
      
      <DataTable 
        columns={columns} 
        data={topics} 
        searchKey="title"
        searchPlaceholder="Search topics..."
        pageSize={25}
        onRowSelection={setSelectedTopics}
      />
    </div>
  );
}
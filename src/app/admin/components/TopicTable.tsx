'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, Unlink, Book, Edit, MoreHorizontal, Clock, Star, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { deleteTopic, removeTopicFromRoadmap, revalidateTopicsPage } from "@/actions/admin.action";
import { bulkDeleteTopics, updateTopic, getTopicEditData, updateTopicRoadmaps, createTopic, getAllRoadmaps } from "@/actions/admin.topic.actions";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { MultiSelect } from "@/components/ui/multi-select";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

interface Topic {
  id: string;
  title: string;
  description?: string;
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

// Form schema for editing topics
const editTopicSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().min(5, "Description must be at least 5 characters"),
  difficulty: z.number().min(1).max(5).nullable(),
  estimatedTime: z.number().min(0).nullable(),
  roadmapIds: z.array(z.string()),
});

type EditTopicFormValues = z.infer<typeof editTopicSchema>;

// Form schema for creating topics
const createTopicSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().min(5, "Description must be at least 5 characters"),
  difficulty: z.number().min(1).max(5).nullable(),
  estimatedTime: z.number().min(0).nullable(),
  roadmapIds: z.array(z.string()),
});

type CreateTopicFormValues = z.infer<typeof createTopicSchema>;

export function TopicTable({ topics }: { topics: Topic[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [unlinkingData, setUnlinkingData] = useState<{topicId: string, roadmapId: string} | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<Topic[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableRoadmaps, setAvailableRoadmaps] = useState<{value: string, label: string}[]>([]);
  const [isLoadingRoadmaps, setIsLoadingRoadmaps] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Initialize edit form
  const editForm = useForm<EditTopicFormValues>({
    resolver: zodResolver(editTopicSchema),
    defaultValues: {
      title: "",
      description: "",
      difficulty: 3,
      estimatedTime: 60,
      roadmapIds: [],
    },
  });

  // Initialize create form
  const createForm = useForm<CreateTopicFormValues>({
    resolver: zodResolver(createTopicSchema),
    defaultValues: {
      title: "",
      description: "",
      difficulty: 3,
      estimatedTime: 60,
      roadmapIds: [],
    },
  });

  // Fetch all roadmaps for create dialog
  const fetchAllRoadmaps = async () => {
    setIsLoadingRoadmaps(true);
    try {
      // Use our getAllRoadmaps function to get all roadmaps
      const result = await getAllRoadmaps();
      
      if (result.success && result.roadmapOptions) {
        console.log("Fetched roadmaps:", result.roadmapOptions);
        setAvailableRoadmaps(result.roadmapOptions);
      } else {
        throw new Error(result.error || "Failed to fetch roadmaps");
      }
    } catch (error) {
      console.error("Error fetching roadmaps:", error);
      toast({
        title: "Error",
        description: "Failed to load roadmap options. Please try again.",
        variant: "destructive"
      });
      setAvailableRoadmaps([]);
    } finally {
      setIsLoadingRoadmaps(false);
    }
  };

  // Open create dialog
  const handleOpenCreateDialog = async () => {
    // Reset form
    createForm.reset({
      title: "",
      description: "",
      difficulty: 3,
      estimatedTime: 60,
      roadmapIds: [],
    });
    
    // Fetch roadmaps
    await fetchAllRoadmaps();
    
    // Show dialog
    setShowCreateDialog(true);
  };

  // Close create dialog
  const handleCloseCreateDialog = () => {
    setShowCreateDialog(false);
    createForm.reset();
  };

  // Submit new topic
  const onSubmitCreate = async (values: CreateTopicFormValues) => {
    try {
      setIsSubmitting(true);
      
      // First create the topic
      const result = await createTopic({
        title: values.title,
        description: values.description,
        difficulty: values.difficulty,
        estimatedTime: values.estimatedTime
      });
      
      if (!result.success || !result.topic) {
        throw new Error(result.error || "Failed to create topic");
      }
      
      // If roadmaps were selected, link them to the topic
      if (values.roadmapIds && values.roadmapIds.length > 0) {
        const roadmapResult = await updateTopicRoadmaps(
          result.topic.id,
          values.roadmapIds
        );
        
        if (!roadmapResult.success) {
          console.warn("Roadmap assignments failed:", roadmapResult.error);
          // We don't throw here because the topic was created successfully
        }
      }
      
      // Success message
      toast({
        title: "Topic created",
        description: "New topic has been successfully created"
      });
      
      // Close dialog and refresh data
      handleCloseCreateDialog();
      await revalidateTopicsPage();
      router.refresh();
    } catch (error) {
      console.error("Error creating topic:", error);
      toast({
        title: "Error",
        description: "Failed to create topic. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle opening edit dialog
  const handleEdit = async (topic: Topic) => {
    setEditingTopic(topic);
    setIsLoadingRoadmaps(true);
    
    try {
      // Fetch topic details and available roadmaps using our new server action
      const result = await getTopicEditData(topic.id);
      
      if (result.success && result.topic && result.roadmapOptions && result.assignedRoadmapIds) {
        setAvailableRoadmaps(result.roadmapOptions);
        
        // Reset form with values from the server
        editForm.reset({
          title: result.topic.title,
          description: result.topic.description || "",
          difficulty: result.topic.difficulty || 3,
          estimatedTime: result.topic.estimatedTime || 60,
          roadmapIds: result.assignedRoadmapIds,
        });
      } else {
        throw new Error(result.error || "Failed to fetch topic data");
      }
    } catch (error) {
      console.error("Error fetching topic data:", error);
      toast({
        title: "Error",
        description: "Failed to load topic data. Please try again.",
        variant: "destructive"
      });
      // Default to basic data if fetch fails
      editForm.reset({
        title: topic.title,
        description: topic.description || "", 
        difficulty: topic.difficulty || 3,
        estimatedTime: topic.estimatedTime || 60,
        roadmapIds: topic.roadmaps.map(r => r.roadmap.id),
      });
    } finally {
      setIsLoadingRoadmaps(false);
    }
  };

  // Close edit dialog
  const handleCloseEdit = () => {
    setEditingTopic(null);
    editForm.reset();
  };

  // Submit topic edit
  const onSubmitEdit = async (values: EditTopicFormValues) => {
    if (!editingTopic) return;
    
    try {
      setIsSubmitting(true);
      
      // Update the topic basic info
      const updateResult = await updateTopic({
        id: editingTopic.id,
        title: values.title,
        description: values.description,
        difficulty: values.difficulty,
        estimatedTime: values.estimatedTime
      });
      
      if (!updateResult.success) {
        throw new Error(updateResult.error || "Failed to update topic");
      }
      
      // Update roadmap assignments
      const roadmapResult = await updateTopicRoadmaps(
        editingTopic.id,
        values.roadmapIds
      );
      
      if (!roadmapResult.success) {
        throw new Error(roadmapResult.error || "Failed to update roadmap assignments");
      }
      
      toast({
        title: "Topic updated",
        description: "Topic has been successfully updated"
      });
      
      // Close dialog and refresh data
      handleCloseEdit();
      await revalidateTopicsPage();
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update topic. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const handleUnlinkFromRoadmap = async (topicId: string, roadmapId: string) => {
    if (!confirm(`Are you sure you want to remove this topic from the roadmap?`)) {
      return;
    }

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
    
    if (!confirm(`Are you sure you want to delete ${selectedTopics.length} topic(s)? This cannot be undone.`)) {
      return;
    }
    
    try {
      setIsBulkDeleting(true);
      const topicIds = selectedTopics.map(topic => topic.id);
      
      const result = await bulkDeleteTopics(topicIds);
      
      if (result.success && result.stats) {
        toast({
          title: "Topics deleted",
          description: `Successfully deleted ${result.stats.success} topic(s)${
            result.stats.failed > 0 ? `, failed to delete ${result.stats.failed} topic(s)` : ''
          }`
        });
        
        setSelectedTopics([]);
        await revalidateTopicsPage();
        router.refresh();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to perform bulk delete. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsBulkDeleting(false);
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
        return (
          <div className="flex flex-wrap gap-1">
            {topic.roadmaps.length > 0 ? (
              topic.roadmaps.map((r) => (
                <Badge key={r.roadmap.id} variant="outline" className="flex items-center gap-1">
                  {r.roadmap.title}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0 rounded-full opacity-70 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnlinkFromRoadmap(topic.id, r.roadmap.id);
                          }}
                          disabled={unlinkingData?.topicId === topic.id && unlinkingData?.roadmapId === r.roadmap.id}
                        >
                          {unlinkingData?.topicId === topic.id && unlinkingData?.roadmapId === r.roadmap.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Unlink className="h-3 w-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Remove from roadmap</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground text-xs">No roadmaps</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "difficulty",
      header: "Difficulty",
      cell: ({ row }) => renderDifficultyStars(row.original.difficulty),
    },
    {
      accessorKey: "estimatedTime",
      header: "Est. Time",
      cell: ({ row }) => {
        const minutes = row.original.estimatedTime;
        if (!minutes) return 'N/A';
        
        return (
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
            <span>{minutes} min</span>
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
            <Book className="h-4 w-4 mr-1 text-muted-foreground" />
            <span>{count}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "_count.UserTopicCompletion",
      header: "Users",
      cell: ({ row }) => row.original._count.UserTopicCompletion,
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
              <DropdownMenuItem onClick={() => handleEdit(topic)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Topic
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

  // Show bulk actions when topics are selected
  const renderBulkActions = () => {
    if (selectedTopics.length === 0) return null;
    
    return (
      <div className="flex items-center gap-2 mb-4">
        <Button 
          variant="destructive" 
          size="sm"
          onClick={handleBulkDelete}
          disabled={isBulkDeleting}
          className="flex items-center gap-1"
        >
          {isBulkDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Delete Selected ({selectedTopics.length})
        </Button>
      </div>
    );
  };

  // Render page actions like "Create Topic" button
  const renderPageActions = () => {
    return (
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Topics</h2>
        <Button
          onClick={handleOpenCreateDialog}
          className="flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          Create Topic
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Page actions */}
      {renderPageActions()}
      
      {/* Bulk actions */}
      {renderBulkActions()}
      
      {/* Topic table */}
      <DataTable
        columns={columns}
        data={topics}
        searchKey="title"
        searchPlaceholder="Search topics..."
        pageSize={25}
        onRowSelection={setSelectedTopics}
      />
      
      {/* Create Topic Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => !open && handleCloseCreateDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Topic</DialogTitle>
            <DialogDescription>
              Add a new topic and assign it to roadmaps
            </DialogDescription>
          </DialogHeader>
          
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <FormField
                    control={createForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={4} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="space-y-4">
                  <FormField
                    control={createForm.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Difficulty (1-5)</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Slider
                              min={1}
                              max={5}
                              step={1}
                              defaultValue={[field.value || 3]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Beginner</span>
                              <span>Advanced</span>
                            </div>
                            <Input
                              type="number"
                              min={1}
                              max={5}
                              value={field.value === null ? '' : field.value}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="estimatedTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Time (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            value={field.value === null ? '' : field.value}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="roadmapIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign to Roadmaps</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={availableRoadmaps}
                            selected={field.value || []}
                            onChange={field.onChange}
                            placeholder="Select roadmaps"
                            loading={isLoadingRoadmaps}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseCreateDialog}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Topic'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Topic Dialog */}
      <Dialog open={!!editingTopic} onOpenChange={(open) => !open && handleCloseEdit()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Topic</DialogTitle>
            <DialogDescription>
              Update topic details and manage roadmap assignments
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <FormField
                    control={editForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={4} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="space-y-4">
                  <FormField
                    control={editForm.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Difficulty (1-5)</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Slider
                              min={1}
                              max={5}
                              step={1}
                              defaultValue={[field.value || 3]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Beginner</span>
                              <span>Advanced</span>
                            </div>
                            <Input
                              type="number"
                              min={1}
                              max={5}
                              value={field.value === null ? '' : field.value}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="estimatedTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Time (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            value={field.value === null ? '' : field.value}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="roadmapIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned Roadmaps</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={availableRoadmaps}
                            selected={field.value || []}
                            onChange={field.onChange}
                            placeholder="Select roadmaps"
                            loading={isLoadingRoadmaps}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseEdit}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
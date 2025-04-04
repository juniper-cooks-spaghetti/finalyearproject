'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Loader2, ExternalLink, Unlink, AlertTriangle, Edit, MoreHorizontal, BookOpen, Plus, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { deleteContent, removeContentFromTopic, revalidateContentPage } from "@/actions/admin.action";
import { createContent, updateContent, bulkDeleteContent, getAvailableTopics } from "@/actions/admin.content.action";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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
import { ContentType } from "@prisma/client";

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

interface Topic {
  id: string;
  title: string;
}

// Update the form schema in ContentTable.tsx
const contentFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  type: z.enum([
    ContentType.VIDEO,
    ContentType.ARTICLE,
    ContentType.TUTORIAL,
    ContentType.COURSE, 
    ContentType.BOOK,
    ContentType.EXERCISE,
    ContentType.DOCUMENTATION,
    ContentType.PODCAST,
    ContentType.OTHER
  ]),
  url: z.string().url("Please enter a valid URL"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  topicId: z.string().optional(),
});

const contentTypes = [
  { value: ContentType.VIDEO, label: "Video" },
  { value: ContentType.ARTICLE, label: "Article" },
  { value: ContentType.TUTORIAL, label: "Tutorial" },
  { value: ContentType.COURSE, label: "Course" },
  { value: ContentType.BOOK, label: "Book" },
  { value: ContentType.EXERCISE, label: "Exercise" },
  { value: ContentType.DOCUMENTATION, label: "Documentation" },
  { value: ContentType.PODCAST, label: "Podcast" },
  { value: ContentType.OTHER, label: "Other" },
];

export function ContentTable({ content, topics = [] }: { content: Content[], topics?: Topic[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [unlinkingData, setUnlinkingData] = useState<{contentId: string, topicId: string} | null>(null);
  const [selectedContent, setSelectedContent] = useState<Content[]>([]);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [availableTopics, setAvailableTopics] = useState<Topic[]>(topics);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);

  // Form for creating/editing content
  const form = useForm<z.infer<typeof contentFormSchema>>({
    resolver: zodResolver(contentFormSchema),
    defaultValues: {
      title: "",
      type: ContentType.ARTICLE, // Use a valid default content type
      url: "",
      description: "",
      topicId: "none",
    },
  });

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
      setIsBulkDeleting(true);
      const contentIds = selectedContent.map(content => content.id);
      const result = await bulkDeleteContent(contentIds);
      
      if (result.success) {
        toast({
          title: `Deleted ${result.stats?.success || 0} content item(s)`,
          description: result.stats?.failed ? `Failed to delete ${result.stats.failed} item(s)` : undefined,
          variant: result.stats?.failed ? "destructive" : "default",
        });
        
        setSelectedContent([]);
        await revalidateContentPage();
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

  // Initialize edit form with content data
  const handleEdit = async (content: Content) => {
    setEditingContent(content);
    setIsLoadingTopics(true);
    
    try {
      // Fetch available topics for this content (topics it's not already linked to)
      const result = await getAvailableTopics(content.id);
      if (result.success && result.topics) {
        setAvailableTopics(result.topics);
      } else {
        setAvailableTopics([]);
      }
    } catch (error) {
      console.error("Error fetching available topics:", error);
      setAvailableTopics([]);
    } finally {
      setIsLoadingTopics(false);
    }
    
    form.reset({
      title: content.title,
      type: content.type as ContentType,
      url: content.url,
      description: content.description || "",
      topicId: "none",
    });
  };

  // Close edit dialog
  const handleCloseEdit = () => {
    setEditingContent(null);
    form.reset();
  };

  // Submit edit form
  const onSubmitEdit = async (values: z.infer<typeof contentFormSchema>) => {
    if (!editingContent) return;
    
    try {
      setIsSubmitting(true);
      const result = await updateContent({
        id: editingContent.id,
        ...values,
        topicId: values.topicId === "none" ? undefined : values.topicId,
      });
      
      if (result.success) {
        toast({
          title: "Content updated",
          description: "Content has been successfully updated"
        });
        
        handleCloseEdit();
        await revalidateContentPage();
        router.refresh();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit create form
  const onSubmitCreate = async (values: z.infer<typeof contentFormSchema>) => {
    try {
      setIsSubmitting(true);
      const result = await createContent({
        ...values,
        topicId: values.topicId === "none" ? undefined : values.topicId,
      });
      
      if (result.success) {
        toast({
          title: "Content created",
          description: "Content has been successfully created"
        });
        
        setShowCreateDialog(false);
        form.reset();
        await revalidateContentPage();
        router.refresh();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add this function to your ContentTable component
  // This should be added around line 340, with the other handler functions

  // When opening create dialog, refresh the available topics list
  const handleOpenCreateDialog = async () => {
    setIsLoadingTopics(true);
    
    try {
      // Fetch all topics for new content
      const result = await getAvailableTopics();
      if (result.success && result.topics) {
        setAvailableTopics(result.topics);
      } else {
        setAvailableTopics(topics); // Fall back to passed topics
      }
    } catch (error) {
      console.error("Error fetching available topics:", error);
      setAvailableTopics(topics); // Fall back to passed topics
    } finally {
      setIsLoadingTopics(false);
    }
    
    setShowCreateDialog(true);
    form.reset({
      title: "",
      type: ContentType.ARTICLE,
      url: "",
      description: "",
      topicId: "none",
    });
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
                onClick={() => handleEdit(content)}
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

  // Create Content button with search bar
  const renderSearchWithActions = (
    <div className="flex items-center justify-between mb-4">
      <div className="flex-1">
        {/* This placeholder will be filled by the DataTable with the search input */}
      </div>
      <div className="flex items-center gap-2">
        <Button 
          size="sm" 
          onClick={handleOpenCreateDialog}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          New Content
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {selectedContent.length > 0 && (
        <div className="flex items-center gap-2">
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleBulkDelete}
            disabled={isBulkDeleting}
            className="flex items-center gap-1"
          >
            {isBulkDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Trash2 className="h-4 w-4 mr-1" />
            )}
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
        searchWithActions={renderSearchWithActions}
      />

      {/* Create Content Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => !open && setShowCreateDialog(false)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Content</DialogTitle>
            <DialogDescription>
              Add new content to be used in topics.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitCreate)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Introduction to React Hooks" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content Type</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select content type" />
                        </SelectTrigger>
                        <SelectContent>
                          {contentTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://example.com/content" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Provide a brief description of the content" 
                        rows={3} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="topicId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Add to Topic (Optional)</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} disabled={isLoadingTopics}>
                        <SelectTrigger>
                          {isLoadingTopics ? (
                            <div className="flex items-center">
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              <span>Loading topics...</span>
                            </div>
                          ) : (
                            <SelectValue placeholder="Select a topic" />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {availableTopics.map((topic) => (
                            <SelectItem key={topic.id} value={topic.id}>
                              {topic.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
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
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Content
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Content Dialog */}
      <Dialog open={!!editingContent} onOpenChange={(open) => !open && handleCloseEdit()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Content</DialogTitle>
            <DialogDescription>
              Update content details and topic association.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitEdit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Introduction to React Hooks" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content Type</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select content type" />
                        </SelectTrigger>
                        <SelectContent>
                          {contentTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://example.com/content" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Provide a brief description of the content" 
                        rows={3} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="topicId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Add to Additional Topic (Optional)</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} disabled={isLoadingTopics}>
                        <SelectTrigger>
                          {isLoadingTopics ? (
                            <div className="flex items-center">
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              <span>Loading topics...</span>
                            </div>
                          ) : (
                            <SelectValue placeholder="Select a topic" />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {availableTopics.map((topic) => (
                            <SelectItem key={topic.id} value={topic.id}>
                              {topic.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
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
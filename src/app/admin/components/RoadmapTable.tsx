'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Scale, Trash2, Loader2, MoreHorizontal, Edit, AlertTriangle, Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { deleteRoadmap, rebalanceRoadmapWeights, revalidateRoadmapsPage, updateRoadmap, rebalanceAllRoadmapWeights } from "@/actions/admin.action";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminCreateRoadmapDialog } from "./AdminCreateRoadmapDialog";

// Same categories from CreateRoadmapDialog.tsx
const CATEGORIES = [
  "Computing",
  "Circuitry",
  "Energy",
  "Physics",
  "Signal Processing",
  "Control Systems",
  "Telecommunications",
  "Power Electronics",
  "Embedded Systems",
  "Microelectronics",
  "RF Engineering",
  "VLSI Design",
  "Photonics",
  "Robotics",
  "Biomedical Electronics",
  "Machine Learning",
  "Electromagnetic Theory",
  "Power Systems",
  "Digital Systems",
  "Wireless Communications"
];

interface Roadmap {
  id: string;
  title: string;
  description: string;
  category: string;
  createdAt: string;
  _count: {
    topics: number;
    userRoadmaps: number;
  }
}

// Form schema for edit roadmap
const editRoadmapSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().min(5, "Description must be at least 5 characters"),
  category: z.string().min(1, "Please select a category"),
});

export function RoadmapTable({ roadmaps }: { roadmaps: Roadmap[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [rebalancingId, setRebalancingId] = useState<string | null>(null);
  const [isRebalancingAll, setIsRebalancingAll] = useState(false);
  const [selectedRoadmaps, setSelectedRoadmaps] = useState<Roadmap[]>([]);
  const [editingRoadmap, setEditingRoadmap] = useState<Roadmap | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Initialize edit form
  const form = useForm<z.infer<typeof editRoadmapSchema>>({
    resolver: zodResolver(editRoadmapSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
    },
  });

  // Open edit dialog and populate form with roadmap data
  const handleEdit = (roadmap: Roadmap) => {
    setEditingRoadmap(roadmap);
    form.reset({
      title: roadmap.title,
      description: roadmap.description,
      category: roadmap.category || "",
    });
  };

  // Close edit dialog
  const handleCloseEdit = () => {
    setEditingRoadmap(null);
    form.reset();
  };

  // Submit roadmap edit
  const onSubmitEdit = async (values: z.infer<typeof editRoadmapSchema>) => {
    if (!editingRoadmap) return;

    try {
      setIsSubmitting(true);
      const result = await updateRoadmap({
        id: editingRoadmap.id,
        ...values
      });

      if (result.success) {
        toast({
          title: "Roadmap updated",
          description: "Roadmap has been successfully updated"
        });
        
        // Close dialog and refresh data
        handleCloseEdit();
        await revalidateRoadmapsPage();
        router.refresh();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update roadmap. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (roadmapId: string) => {
    if (!confirm('Are you sure you want to delete this roadmap?')) {
      return;
    }
    
    try {
      setDeletingId(roadmapId);
      const result = await deleteRoadmap(roadmapId);
      
      if (result.success) {
        toast({
          title: "Roadmap deleted",
          description: "Roadmap has been successfully removed"
        });
        
        // Use Next.js router to refresh data instead of window.location.reload()
        await revalidateRoadmapsPage();
        router.refresh();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete roadmap. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleRebalance = async (roadmapId: string) => {
    try {
      setRebalancingId(roadmapId);
      const result = await rebalanceRoadmapWeights(roadmapId);

      if (result.success) {
        toast({
          title: "Weights Calibrated Successfully",
          description: "Roadmap weights have been rebalanced"
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rebalance weights. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRebalancingId(null);
    }
  };
  
  const handleRebalanceAllWeights = async () => {
    try {
      setIsRebalancingAll(true);
      const result = await rebalanceAllRoadmapWeights();
      
      if (result.success) {
        toast({
          title: "All Weights Calibrated",
          description: "All roadmap weights have been rebalanced"
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rebalance all weights. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRebalancingAll(false);
    }
  };
  
  const handleBulkDelete = async () => {
    if (!selectedRoadmaps.length) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedRoadmaps.length} roadmap(s)?`)) {
      return;
    }
    
    try {
      let success = 0;
      let failed = 0;
      
      for (const roadmap of selectedRoadmaps) {
        try {
          const result = await deleteRoadmap(roadmap.id);
          if (result.success) {
            success++;
          } else {
            failed++;
          }
        } catch (error) {
          failed++;
        }
      }
      
      // Show toast notification
      toast({
        title: `Deleted ${success} roadmap(s)`,
        description: failed > 0 ? `Failed to delete ${failed} roadmap(s)` : undefined,
        variant: failed > 0 ? "destructive" : "default",
      });
      
      // Reset selected roadmaps immediately after operation completes
      setSelectedRoadmaps([]);
      
      // Make sure to revalidate paths
      await revalidateRoadmapsPage();
      
      // Force router refresh
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
  const columns: ColumnDef<Roadmap>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <div className="px-1" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="h-5 w-5"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="px-1" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="h-5 w-5"
          />
        </div>
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
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue("category") || "Uncategorized"}</Badge>
      ),
    },
    {
      accessorKey: "_count.topics",
      header: "Topics",
      cell: ({ row }) => row.original._count.topics,
    },
    {
      accessorKey: "_count.userRoadmaps",
      header: "Users",
      cell: ({ row }) => row.original._count.userRoadmaps,
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
        const roadmap = row.original;
        
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
                onClick={() => handleEdit(roadmap)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Roadmap
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleRebalance(roadmap.id)}
                disabled={rebalancingId === roadmap.id}
              >
                {rebalancingId === roadmap.id ? 
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> :
                  <Scale className="mr-2 h-4 w-4" />
                }
                Calibrate Weights
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleDelete(roadmap.id)}
                disabled={deletingId === roadmap.id}
              >
                {deletingId === roadmap.id ? 
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> :
                  <AlertTriangle className="mr-2 h-4 w-4" />
                }
                Delete Roadmap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Custom search and actions area with create button and rebalance button
  const renderSearchWithActions = (
    <div className="flex items-center justify-between mb-4">
      <div className="flex-1">
        {/* This placeholder will be filled by the DataTable with the search input */}
      </div>
      <div className="flex items-center gap-2">
        <Button 
          variant="outline"
          size="sm" 
          onClick={handleRebalanceAllWeights}
          disabled={isRebalancingAll}
        >
          {isRebalancingAll ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Calibrating...
            </>
          ) : (
            <>
              <Scale className="mr-2 h-4 w-4" />
              Calibrate All Weights
            </>
          )}
        </Button>
        
        <Button 
          size="sm" 
          onClick={() => setShowCreateDialog(true)}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          New Roadmap
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {selectedRoadmaps.length > 0 && (
        <div className="flex items-center gap-2">
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleBulkDelete}
            className="flex items-center gap-1"
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected ({selectedRoadmaps.length})
          </Button>
        </div>
      )}
      
      <DataTable 
        columns={columns} 
        data={roadmaps} 
        searchKey="title"
        searchPlaceholder="Search roadmaps..."
        pageSize={25}
        onRowSelection={setSelectedRoadmaps}
        searchWithActions={renderSearchWithActions}
      />

      {/* Edit Roadmap Dialog */}
      <Dialog open={!!editingRoadmap} onOpenChange={(open) => !open && handleCloseEdit()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Roadmap</DialogTitle>
            <DialogDescription>
              Update the roadmap details. Click save when you're done.
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
                      <Input {...field} />
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
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
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
                    'Save Changes'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Roadmap Dialog */}
      <AdminCreateRoadmapDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onRoadmapCreated={async () => {
          await revalidateRoadmapsPage();
          router.refresh();
        }}
      />
    </div>
  );
}
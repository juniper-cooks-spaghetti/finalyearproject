'use client';

import { useState } from 'react';
import { Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createAdminRoadmap } from "@/actions/admin.action";

// Same categories as in CreateRoadmapDialog.tsx
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

// Form schema for create roadmap
const createRoadmapSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().min(5, "Description must be at least 5 characters"),
  category: z.string().min(1, "Please select a category"),
});

interface AdminCreateRoadmapDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRoadmapCreated: () => void;
}

export function AdminCreateRoadmapDialog({
  isOpen,
  onClose,
  onRoadmapCreated
}: AdminCreateRoadmapDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form
  const form = useForm<z.infer<typeof createRoadmapSchema>>({
    resolver: zodResolver(createRoadmapSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
    },
  });

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof createRoadmapSchema>) => {
    try {
      setIsSubmitting(true);
      
      // Use the admin-specific create roadmap action
      const result = await createAdminRoadmap(values);
      
      if (result.success) {
        toast({
          title: "Roadmap created",
          description: "The roadmap has been successfully created"
        });
        
        // Reset form and close dialog
        form.reset();
        onClose();
        
        // Notify parent component that a roadmap was created
        onRoadmapCreated();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create roadmap. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Roadmap</DialogTitle>
          <DialogDescription>
            Create a new roadmap for users to follow. This roadmap will be available to all users.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Introduction to Machine Learning" />
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
                      placeholder="Provide a brief description of the roadmap" 
                      rows={4}
                    />
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
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Roadmap
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
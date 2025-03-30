'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { addRoadmap, addUserRoadmap } from '@/actions/roadmap.action';
import { searchRoadmaps } from '@/actions/search.action';
import { useDebounce } from "@/hooks/useDebounce";
import { SearchResultCard } from './SearchResultCard';
import { useToast } from "@/hooks/use-toast";

interface RoadmapSearchResult {
  id: string;
  title: string;
  description: string;
  category: string | null;
  topicCount: number;
  createdAt: string;
}

const CATEGORIES = [
  "Computing",
  "Circuitry",
  "Energy",
  "Physics"
];

interface CreateRoadmapDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRoadmapCreated?: () => void;
}

export function CreateRoadmapButton() {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        className="w-full h-[100px] flex flex-col items-center justify-center gap-2"
        onClick={() => setShowDialog(true)}
      >
        <Plus className="h-6 w-6" />
        <span>Create New Roadmap</span>
      </Button>

      <CreateRoadmapDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
      />
    </>
  );
}

export function CreateRoadmapDialog({ isOpen, onClose, onRoadmapCreated }: CreateRoadmapDialogProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RoadmapSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    async function performSearch() {
      if (!debouncedSearch.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const result = await searchRoadmaps(debouncedSearch);
        if (result.success && result.roadmaps) {
          setSearchResults(result.roadmaps);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
        toast({
          title: "Search Failed",
          description: "Failed to fetch roadmaps. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsSearching(false);
      }
    }

    performSearch();
  }, [debouncedSearch, toast]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !category) return;

    try {
      setIsSubmitting(true);
      await addRoadmap({
        title,
        description,
        category,
        isPublic
      });
      
      onRoadmapCreated?.();
      resetForm();
      onClose();
      toast({
        title: "Success",
        description: "Roadmap created successfully"
      });
    } catch (error) {
      console.error('Error creating roadmap:', error);
      toast({
        title: "Error",
        description: "Failed to create roadmap",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearchSelect = async (roadmap: RoadmapSearchResult) => {
    try {
      setIsSubmitting(true);
      await addUserRoadmap(roadmap.id, isPublic);
      
      onRoadmapCreated?.();
      onClose();
      toast({
        title: "Success",
        description: "Roadmap added to your collection"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add roadmap",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setIsPublic(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Roadmap</DialogTitle>
          <DialogDescription>
            Create a new roadmap or use an existing one as template
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="create">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create</TabsTrigger>
            <TabsTrigger value="search">Search Template</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <form onSubmit={handleCreateSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter roadmap title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this roadmap is about"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory} required>
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
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isPublic">Make this roadmap public</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose} type="button">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Roadmap'}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="search">
            <div className="space-y-4">
              <Input
                placeholder="Search for existing roadmaps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="h-[300px] overflow-y-auto">
                {isSearching ? (
                  <div className="flex items-center justify-center h-full">
                    <span>Searching...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="grid gap-3">
                    {searchResults.map((roadmap) => (
                      <SearchResultCard
                        key={roadmap.id}
                        title={roadmap.title}
                        description={roadmap.description}
                        onClick={() => handleSearchSelect(roadmap)}
                      />
                    ))}
                  </div>
                ) : searchQuery ? (
                  <div className="text-center text-muted-foreground py-4">
                    No roadmaps found
                  </div>
                ) : null}
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublicSearch"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isPublicSearch">Make this roadmap public</Label>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { TopicRecommendations } from './TopicRecommendations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTopicRecommendations } from '@/actions/recommendation.action';
import { searchTopics } from "@/actions/search.action";
import { useDebounce } from "@/hooks/useDebounce";
import { RecommendationCard } from './RecommendationCard';
import { SearchResultCard } from './SearchResultCard';
import { useToast } from "@/hooks/use-toast";
import { Topic, UserRoadmapTopic } from "@/types/roadmap"; // Add this import
import { addTopic as addTopicAction } from "@/actions/topics.action"; // Import the action from topics.action.ts

// Define the return type of addTopicAction
interface AddTopicResult {
  success: boolean;
  topic?: UserRoadmapTopic;
  error?: string;
}

interface AddTopicDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newTopic: {
    id?: string;
    title: string;
    description: string;
    difficulty: number;
    estimatedTime: number;
    content?: any[];
    previousTopicId?: string | null;
  }) => Promise<void>;
  userRoadmapId: string;
  roadmapId: string;
  lastTopicId?: string | null; // This can now be null for empty roadmaps
}

export function AddTopicDialog({ 
  isOpen, 
  onClose, 
  onAdd,
  userRoadmapId,
  roadmapId,
  lastTopicId
}: AddTopicDialogProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState(3);
  const [estimatedTime, setEstimatedTime] = useState(60);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Topic[]>([]);
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
        const result = await searchTopics(debouncedSearch, roadmapId);
        if (result.success) {
          setSearchResults(result.topics as Topic[]);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    }

    performSearch();
  }, [debouncedSearch, roadmapId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await addTopicAction({
        title,
        description,
        difficulty,
        estimatedTime,
        userRoadmapId,
        roadmapId,
        previousTopicId: lastTopicId
      }) as AddTopicResult;  // Add type assertion here
      
      if (result.success && result.topic) {
        const transformedTopic = {
          id: result.topic.topic.id,
          title: result.topic.topic.title,
          description: result.topic.topic.description,
          difficulty: result.topic.topic.difficulty ?? 3, // Use nullish coalescing to provide default
          estimatedTime: result.topic.topic.estimatedTime ?? 60, // Use nullish coalescing to provide default
          content: result.topic.topic.contents?.map(c => c.content) || [],
          previousTopicId: lastTopicId
        };
        
        await onAdd(transformedTopic);
        toast({
          title: "Topic added",
          description: `${title} has been added to your roadmap.`
        });
        resetForm();
        onClose();
      } else {
        throw new Error(result.error || "Failed to add topic");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add topic. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSearchSelect = async (topic: Topic) => {
    try {
      if (!topic) {
        throw new Error("Invalid topic selected");
      }
      
      const result = await addTopicAction({
        id: topic.id,
        title: topic.title,
        description: topic.description,
        difficulty: topic.difficulty || 3,
        estimatedTime: topic.estimatedTime || 60,
        userRoadmapId,
        roadmapId,
        previousTopicId: lastTopicId
      }) as AddTopicResult;  // Add type assertion here
      
      if (result.success && result.topic) {
        const transformedTopic = {
          id: result.topic.topic.id,
          title: result.topic.topic.title,
          description: result.topic.topic.description,
          difficulty: result.topic.topic.difficulty ?? 3, // Default if null
          estimatedTime: result.topic.topic.estimatedTime ?? 60, // Default if null
          content: result.topic.topic.contents?.map(c => c.content) || [],
          previousTopicId: lastTopicId
        };
        
        await onAdd(transformedTopic);
        toast({
          title: "Topic added",
          description: `${topic.title} has been added to your roadmap.`
        });
        onClose();
      } else {
        throw new Error(result.error || "Failed to add topic");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add topic. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRecommendationSelect = async (recommendation: any) => {
    console.log("Recommendation received:", recommendation);
    
    try {
      // Check if we received a topic directly instead of a recommendation
      if (!recommendation) {
        console.log("Recommendation is undefined/null");
        throw new Error("Invalid recommendation selected");
      }
      
      // If we received a topic directly (not a recommendation object)
      if (!recommendation.afterTopic && recommendation.id && recommendation.title) {
        console.log("Received a topic directly instead of a recommendation");
        const topic = recommendation;
        
        const result = await addTopicAction({
          id: topic.id,
          title: topic.title || "Untitled Topic",
          description: topic.description || "",
          difficulty: topic.difficulty || 3,
          estimatedTime: topic.estimatedTime || 60,
          content: topic.contents?.map((tc: any) => tc.content) || [],
          userRoadmapId,
          roadmapId,
          previousTopicId: lastTopicId
        }) as AddTopicResult;
        
        if (result.success && result.topic) {
          const transformedTopic = {
            id: result.topic.topic.id,
            title: result.topic.topic.title,
            description: result.topic.topic.description,
            difficulty: result.topic.topic.difficulty ?? 3, // Default if null
            estimatedTime: result.topic.topic.estimatedTime ?? 60, // Default if null 
            content: result.topic.topic.contents?.map(c => c.content) || [],
            previousTopicId: lastTopicId
          };
          
          await onAdd(transformedTopic);
          toast({
            title: "Topic added",
            description: `${topic.title} has been added to your roadmap.`
          });
          onClose();
        } else {
          throw new Error(result.error || "Failed to add recommended topic");
        }
      }
      // Original recommendation handling
      else if (recommendation.afterTopic) {
        console.log("Received a recommendation with afterTopic");
        const topic = recommendation.afterTopic;
        
        const result = await addTopicAction({
          id: topic.id,
          title: topic.title || "Untitled Topic",
          description: topic.description || "",
          difficulty: topic.difficulty || 3,
          estimatedTime: topic.estimatedTime || 60,
          content: topic.contents?.map((tc: any) => tc.content) || [],
          userRoadmapId,
          roadmapId,
          previousTopicId: lastTopicId
        }) as AddTopicResult;
        
        if (result.success && result.topic) {
          const transformedTopic = {
            id: result.topic.topic.id,
            title: result.topic.topic.title,
            description: result.topic.topic.description,
            difficulty: result.topic.topic.difficulty ?? 3, // Default if null
            estimatedTime: result.topic.topic.estimatedTime ?? 60, // Default if null 
            content: result.topic.topic.contents?.map(c => c.content) || [],
            previousTopicId: lastTopicId
          };
          
          await onAdd(transformedTopic);
          toast({
            title: "Topic added",
            description: `${topic.title} has been added to your roadmap.`
          });
          onClose();
        } else {
          throw new Error(result.error || "Failed to add recommended topic");
        }
      } 
      else {
        console.log("Unknown recommendation structure:", recommendation);
        throw new Error("Invalid recommendation format");
      }
    } catch (error) {
      console.error("Error in handleRecommendationSelect:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add recommended topic. Please try again.",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDifficulty(3);
    setEstimatedTime(60);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Topic</DialogTitle>
          <DialogDescription>
            Add a new topic to your roadmap or choose from recommendations.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="recommended">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recommended">Recommended</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="create">Create</TabsTrigger>
          </TabsList>

          {/* Create tab */}
          <TabsContent value="create">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter topic title"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter topic description"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Difficulty (1-5)</Label>
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={[difficulty]}
                  onValueChange={(value) => setDifficulty(value[0])}
                />
                <div className="text-sm text-muted-foreground text-center">
                  {difficulty}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedTime">Estimated Time (hours)</Label>
                <Input
                  id="estimatedTime"
                  type="number"
                  min={1}
                  value={estimatedTime / 60}
                  onChange={(e) => setEstimatedTime(parseInt(e.target.value) * 60)}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit">Add Topic</Button>
              </div>
            </form>
          </TabsContent>

          {/* Search tab */}
          <TabsContent value="search">
            <div className="space-y-4">
              <Input
                placeholder="Search for existing topics..."
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
                    {searchResults.map((topic) => (
                      <SearchResultCard
                        key={topic.id}
                        title={topic.title}
                        description={topic.description}
                        onClick={() => handleSearchSelect(topic)}
                      />
                    ))}
                  </div>
                ) : searchQuery ? (
                  <div className="text-center text-muted-foreground py-4">
                    No topics found
                  </div>
                ) : null}
              </div>
            </div>
          </TabsContent>

          {/* Recommendations tab */}
          <TabsContent value="recommended" className="space-y-4">
            <div className="space-y-4">
              <TopicRecommendations
                currentTopicId={lastTopicId || null} // Explicitly pass null for empty roadmaps
                roadmapId={roadmapId}
                onSelectRecommendation={handleRecommendationSelect}
              />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ExternalLink, Heart, Trash2, Plus } from "lucide-react";
import type { Content } from "@/types/roadmap";
import { TopicRecommendations } from './TopicRecommendations';
import { SuggestContentDialog } from './SuggestContentDialog';
import { RateTopicDialog } from './RateTopicDialog';
import { deleteTopic, getTopicCompletion, updateTopicCompletion } from '@/actions/topics.action';
import { useState, useEffect, useRef, useCallback } from 'react';
import { getTopicContent, toggleContentLike } from "@/actions/content.action";
import { useUser } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";
import { StatusIndicator } from "./StatusIndicator";
import { useToast } from "@/hooks/use-toast";
import { TopicStatus, CompletionState, TopicCompletion } from '@/types/roadmap';

interface TopicContentProps {
  topic: {
    id: string;
    title: string;
    description: string;
    content?: Content[];
  };
  isOpen: boolean;
  onClose: () => void;
  userRoadmapId: string;
  roadmapId: string;
  previousTopicId?: string | null;
  onDelete?: (topicId: string) => void;
  readOnly?: boolean;
  onDataChange?: () => void; // Add this prop to notify about data changes
}

function ContentItem({ 
  item, 
  topicId,
  readOnly,
}: { 
  item: Content; 
  topicId: string;
  readOnly: boolean;
}) {
  const { user } = useUser();
  const [isLiking, setIsLiking] = useState(false);
  
  const [hasLiked, setHasLiked] = useState(
    item.userInteractions?.some(interaction => 
      interaction.topicId === topicId
    ) ?? false
  );

  const [likesCount, setLikesCount] = useState(
    item._count?.userInteractions ?? 0
  );

  const isNew = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return new Date(item.createdAt) > oneWeekAgo;
  };

  const handleLike = async () => {
    if (isLiking || readOnly) return;
    
    try {
      setIsLiking(true);
      const newLikedState = !hasLiked;
      
      setHasLiked(newLikedState);
      setLikesCount(prev => newLikedState ? prev + 1 : prev - 1);
      
      const result = await toggleContentLike(item.id, topicId);
      
      if (result.success) {
        // Dispatch a custom event for content interaction
        window.dispatchEvent(new CustomEvent('topic-content-interaction', { 
          detail: { 
            topicId, 
            contentId: item.id,
            action: newLikedState ? 'like' : 'unlike'
          }
        }));
      } else {
        setHasLiked(!newLikedState);
        setLikesCount(prev => newLikedState ? prev - 1 : prev + 1);
      }
    } catch (error) {
      console.error('Error liking content:', error);
      setHasLiked(!hasLiked);
      setLikesCount(prev => hasLiked ? prev + 1 : prev - 1);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div className="flex items-start justify-between p-3 border rounded-lg">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium">{item.title}</h4>
          {isNew() && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded">
              New
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{item.description}</p>
        <div className="flex gap-2">
          <span className="text-xs bg-secondary px-2 py-1 rounded">
            {item.type}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!readOnly && (
          user ? (
            <Button
              variant="ghost"
              size="sm"
              className={`text-muted-foreground gap-2 ${
                hasLiked ? "text-red-500 hover:text-red-600" : "hover:text-red-500"
              }`}
              onClick={handleLike}
              disabled={isLiking}
            >
              <Heart className={`h-4 w-4 ${hasLiked ? "fill-current" : ""}`} />
              <span>{likesCount}</span>
            </Button>
          ) : (
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm" className="text-muted-foreground gap-2">
                <Heart className="h-4 w-4" />
                <span>{likesCount}</span>
              </Button>
            </SignInButton>
          )
        )}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => window.open(item.url, '_blank')}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// In TopicContent.tsx
export function TopicContent({ 
  isOpen, 
  onClose, 
  topic, 
  userRoadmapId,
  roadmapId,
  previousTopicId = null,
  onDelete,
  readOnly = false,
  onDataChange
}: TopicContentProps) {
  // Add state to track recommendation updates
  const [recommendationsRefreshKey, setRecommendationsRefreshKey] = useState(0);
  
  // Add function to refresh recommendations
  const refreshRecommendations = () => {
    setRecommendationsRefreshKey(prev => prev + 1);
    // Also notify parent
    if (onDataChange) {
      onDataChange();
    }
  };
  
  const { toast } = useToast();
  const [content, setContent] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [completion, setCompletion] = useState<CompletionState>({
    status: 'not_started',
    difficultyRating: null,
    timeSpent: null
  });
  const [showSuggestDialog, setShowSuggestDialog] = useState(false);
  const [showRateDialog, setShowRateDialog] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!isOpen || !topic.id) return;
      
      setIsLoading(true);
      try {
        const [contentResult, completionResult] = await Promise.all([
          getTopicContent(topic.id),
          getTopicCompletion(topic.id)
        ]);

        if (contentResult.success && contentResult.content) {
          // Sort content by: 
          // 1. Like count (descending)
          // 2. Creation date (descending = newest first)
          const sortedContent = [...contentResult.content].sort((a, b) => {
            // First compare by like count
            const likesA = a._count?.userInteractions || 0;
            const likesB = b._count?.userInteractions || 0;
            
            if (likesB !== likesA) {
              return likesB - likesA; // Higher likes first
            }
            
            // If like counts are equal, compare by creation date
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
            return dateB.getTime() - dateA.getTime(); // Newer first
          });
          
          setContent(sortedContent);
        }

        if (completionResult.success && completionResult.completion) {
          const completionData = completionResult.completion as TopicCompletion;
          setCompletion({
            status: completionData.status as TopicStatus,
            difficultyRating: completionData.difficultyRating ?? null,
            timeSpent: completionData.timeSpent ?? null
          });
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [topic.id, isOpen]);

  const handleClose = async () => {
    console.log('Dialog closing');
    try {
      // Notify parent about potential changes before closing
      if (onDataChange) {
        onDataChange();
      }
      onClose();
    } catch (error) {
      console.error('Error in handleClose:', error);
      onClose();
    }
  };

  // Modify the existing handlers to call refreshRecommendations
  const handleStatusChange = async (newStatus: TopicStatus) => {
    try {
      const result = await updateTopicCompletion(topic.id, {
        status: newStatus,
        timeSpent: completion.timeSpent || undefined,
        difficultyRating: completion.difficultyRating || undefined
      });

      if (result.success) {
        setCompletion(prev => ({ ...prev, status: newStatus }));
        toast({
          title: "Status updated",
          description: `Topic marked as ${newStatus.replace('_', ' ')}`,
          variant: "default",
        });
        
        // Notify parent about the data change
        if (onDataChange) {
          onDataChange();
        }
        
        // Dispatch custom event for topic status change
        window.dispatchEvent(new CustomEvent('topic-status-changed', { 
          detail: { 
            topicId: topic.id, 
            status: newStatus,
            userRoadmapId
          }
        }));
        
        refreshRecommendations();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleRecommendationAdded = () => {
    refreshRecommendations();
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove this topic?')) return;
    
    try {
      setIsDeleting(true);
      await deleteTopic(topic.id, userRoadmapId);

      toast({
        title: "Success",
        description: "Topic removed successfully",
        variant: "default",
      });

      if (onDelete) {
        onDelete(topic.id);
      }
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove topic. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleContentAdded = () => {
    // Reload content after a new item is added
    getTopicContent(topic.id).then(contentResult => {
      if (contentResult.success && contentResult.content) {
        // Sort content by likes and date
        const sortedContent = [...contentResult.content].sort((a, b) => {
          const likesA = a._count?.userInteractions || 0;
          const likesB = b._count?.userInteractions || 0;
          
          if (likesB !== likesA) {
            return likesB - likesA;
          }
          
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
        
        setContent(sortedContent);
        
        // Notify parent about content changes
        if (onDataChange) {
          onDataChange();
        }
      }
    });
  };

  const renderDialogTitle = () => (
    <DialogTitle className="flex justify-between items-center">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2" data-topic-id={topic.id}>
          <StatusIndicator 
            status={completion.status} 
            className="status-indicator"
          />
          <span>{topic.title}</span>
        </div>
        {!readOnly && (
          <>
            <select
              value={completion.status}
              onChange={(e) => handleStatusChange(e.target.value as TopicStatus)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            {completion.status === 'completed' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRateDialog(true)}
              >
                Rate Topic
              </Button>
            )}
          </>
        )}
      </div>
      {!readOnly && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      )}
    </DialogTitle>
  );

  const renderContent = () => {
    if (isLoading) {
      return <div>Loading content...</div>;
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Learning Resources</h3>
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSuggestDialog(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Suggest Content
            </Button>
          )}
        </div>
        
        {content.length > 0 ? (
          <div className="grid gap-3">
            {content.map((item) => (
              <ContentItem 
                key={item.id} 
                item={item} 
                topicId={topic.id} 
                readOnly={readOnly} 
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">
            No content available for this topic
          </p>
        )}
        
        {!readOnly && (
          <SuggestContentDialog
            isOpen={showSuggestDialog}
            onClose={() => setShowSuggestDialog(false)}
            topicId={topic.id}
                      />
        )}
      </div>
    );
  };

  // Add this function to TopicContent to handle rating completions 
  const handleTopicRated = (rating: number, timeSpent: number) => {
    // Update local state
    setCompletion(prev => ({
      ...prev,
      difficultyRating: rating,
      timeSpent: timeSpent
    }));
    
    // Notify parent
    if (onDataChange) {
      onDataChange();
    }
    
    // Broadcast the change
    window.dispatchEvent(new CustomEvent('topic-rated', { 
      detail: { 
        topicId: topic.id, 
        rating,
        timeSpent,
        userRoadmapId
      }
    }));
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
          { renderDialogTitle() }
          </DialogHeader>
          <ScrollArea className="h-full max-h-[calc(80vh-120px)] pr-4">
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-muted-foreground">{topic.description}</p>
                <div className="flex text-sm">
                    <span>Resources:&nbsp;</span>
                    <span>{content.length}</span>
                  </div>
                {renderContent()}
              </div>

              {!readOnly && (
                <div className="pt-4 border-t">
                  <TopicRecommendations 
                    currentTopicId={topic.id}
                    roadmapId={roadmapId}
                    userRoadmapId={userRoadmapId} // Add this prop
                    onSelectRecommendation={() => {}}
                    onRecommendationAdded={handleRecommendationAdded}
                    key={recommendationsRefreshKey} // Add this for forcing re-render
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      {!readOnly && (
        <RateTopicDialog
          isOpen={showRateDialog}
          onClose={() => setShowRateDialog(false)}
          topicId={topic.id}
          initialRating={completion.difficultyRating || undefined}
          initialTimeSpent={completion.timeSpent || undefined}
          onRated={handleTopicRated} // Add this prop
        />
      )}
    </>
  );
}
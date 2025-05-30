'use client';

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GripVertical } from "lucide-react";
import { StatusIndicator } from "./StatusIndicator";
import type { UserRoadmapTopic, TopicStatus, TopicCompletion } from "@/types/roadmap";
import { useState, useEffect } from "react";
import { getTopicCompletion } from "@/actions/topics.action";

interface Props {
  userTopic: UserRoadmapTopic;
  onClick: () => void;
  isDraggable?: boolean;
  profileUserId?: string;
  refreshKey?: number; // track refresh events
}

interface CompletionState {
  status: TopicStatus;
  difficultyRating: number | null;
  timeSpent: number | null;
}

export function DraggableTopicCard({ 
  userTopic, 
  onClick, 
  isDraggable = true,
  profileUserId,
  refreshKey = 0 // Default value of 0
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: userTopic.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [completion, setCompletion] = useState<CompletionState>({ 
    status: 'not_started',
    difficultyRating: null,
    timeSpent: null
  });

  // Load completion data with refresh support
  useEffect(() => {
    async function loadCompletion() {
      try {
        const result = await getTopicCompletion(userTopic.topic.id, profileUserId);
        if (result.success && result.completion) {
          setCompletion({
            status: result.completion.status as TopicStatus,
            difficultyRating: result.completion.difficultyRating,
            timeSpent: result.completion.timeSpent
          });
        }
      } catch (error) {
        console.error('Error loading completion:', error);
      }
    }
    
    loadCompletion();
  }, [userTopic.topic.id, profileUserId, refreshKey]); // Add refreshKey as dependency

  // Add new event listeners for topic status changes
  useEffect(() => {
    // Handler for status changes
    const handleStatusChange = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail.topicId === userTopic.topic.id) {
        console.log('Topic status changed event received:', detail);
        setCompletion(prev => ({
          ...prev,
          status: detail.status
        }));
      }
    };
    
    // Handler for topic ratings
    const handleTopicRated = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail.topicId === userTopic.topic.id) {
        console.log('Topic rated event received:', detail);
        setCompletion(prev => ({
          ...prev,
          difficultyRating: detail.rating,
          timeSpent: detail.timeSpent
        }));
      }
    };
    
    // Handler for content interactions (which might affect completion)
    const handleContentInteraction = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail.topicId === userTopic.topic.id) {
        console.log('Content interaction event received:', detail);
        // Refresh the completion data for this topic
        getTopicCompletion(userTopic.topic.id, profileUserId).then(result => {
          if (result.success && result.completion) {
            setCompletion({
              status: result.completion.status as TopicStatus,
              difficultyRating: result.completion.difficultyRating,
              timeSpent: result.completion.timeSpent
            });
          }
        });
      }
    };

    // Add event listeners
    window.addEventListener('topic-status-changed', handleStatusChange);
    window.addEventListener('topic-rated', handleTopicRated);
    window.addEventListener('topic-content-interaction', handleContentInteraction);
    
    // Clean up
    return () => {
      window.removeEventListener('topic-status-changed', handleStatusChange);
      window.removeEventListener('topic-rated', handleTopicRated);
      window.removeEventListener('topic-content-interaction', handleContentInteraction);
    };
  }, [userTopic.topic.id, profileUserId]);

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className="w-[300px] shrink-0 relative group"
    >
      {isDraggable && (
        <div
          className="absolute top-0 left-0 right-0 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity border-b"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      <div onClick={onClick} className="cursor-pointer pt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusIndicator status={completion.status} />
            <span className="truncate">{userTopic.topic.title}</span>
            {userTopic.isSkipped && (
              <Badge variant="secondary">Skipped</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {userTopic.topic.description}
          </p>
          <div className="space-y-2">
            {userTopic.topic.difficulty && (
              <div className="flex justify-between items-center text-sm">
                <span>Difficulty:</span>
                <Progress value={userTopic.topic.difficulty * 20} className="w-24" />
              </div>
            )}
            {userTopic.topic.estimatedTime && (
              <div className="flex justify-between text-sm">
                <span>Est. Time:</span>
                <span>{Math.round(userTopic.topic.estimatedTime / 60)}h</span>
              </div>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
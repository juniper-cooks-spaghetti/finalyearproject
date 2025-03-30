'use client';

import { useRef, useState, useEffect } from 'react';
import type { Topic, UserRoadmapTopic, TopicStatus, Content } from "@/types/roadmap";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { getTopicCompletion } from '@/actions/topics.action';
import { DraggableTopicCard } from "./DraggableTopicCard";
import { AddTopicDialog } from "./AddTopicDialog";
import { TopicContent } from "./TopicContent";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';

interface RoadmapScrollerProps {
  topics: UserRoadmapTopic[];
  userRoadmapId: string;
  roadmapId: string;
  readOnly?: boolean;
  profileUserId?: string; // Add this prop
}

export default function RoadmapScroller({ 
  topics, 
  userRoadmapId, 
  roadmapId, 
  readOnly = false,
  profileUserId // Add this prop
}: RoadmapScrollerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [localTopics, setLocalTopics] = useState<UserRoadmapTopic[]>(topics);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [canScroll, setCanScroll] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const updateCanScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollWidth, clientWidth } = scrollContainerRef.current;
        setCanScroll(scrollWidth > clientWidth);
      }
    };

    updateCanScroll();
    window.addEventListener('resize', updateCanScroll);
    return () => window.removeEventListener('resize', updateCanScroll);
  }, []);

  const sortTopics = (a: UserRoadmapTopic, b: UserRoadmapTopic): number => {
    const orderA = a?.customOrder ?? 0;
    const orderB = b?.customOrder ?? 0;
    return orderA - orderB;
  };

  useEffect(() => {
    const sortedTopics = [...topics].sort(sortTopics);
    setLocalTopics(sortedTopics);
  }, [topics]);

  const getLastTopicId = (): string | null => {
    if (localTopics.length === 0) return null;
    const sortedTopics = [...localTopics].sort(sortTopics);
    return sortedTopics[sortedTopics.length - 1]?.topic?.id ?? null;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      return;
    }
    
    const activeIndex = localTopics.findIndex(item => item.id === active.id);
    const overIndex = localTopics.findIndex(item => item.id === over.id);
    
    if (activeIndex !== -1 && overIndex !== -1) {
      const newTopics = arrayMove(localTopics, activeIndex, overIndex);
      
      const updatedTopics = newTopics.map((topic, index) => ({
        ...topic,
        customOrder: index * 10
      }));
      
      setLocalTopics(updatedTopics);
      
      try {
        const updates = updatedTopics.map(topic => ({
          id: topic.id,
          customOrder: topic.customOrder
        }));
        
        const response = await fetch('/api/topics/reorder', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates })
        });
        
        if (!response.ok) {
          throw new Error('Failed to save topic order');
        }
      } catch (error) {
        console.error('Error updating topic order:', error);
        setLocalTopics([...topics].sort(sortTopics));
      }
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;

    const scrollOptions: ScrollToOptions = {
      left: scrollContainerRef.current.scrollLeft + (direction === 'left' ? -300 : 300),
      behavior: 'smooth'
    };

    scrollContainerRef.current.scrollTo(scrollOptions);
  };

  const canScrollMore = () => {
    if (!scrollContainerRef.current) return false;
    const { scrollWidth, clientWidth } = scrollContainerRef.current;
    return scrollWidth > clientWidth;
  };

  const getTopicStatus = async (topicId: string): Promise<TopicStatus> => {
    const result = await getTopicCompletion(topicId);
    return result.success && result.completion ? 
      result.completion.status as TopicStatus : 
      'not_started';
  };

  const handleTopicClick = (topic: Topic) => {
    setSelectedTopic(topic);
  };

  return (
    <div className="relative group">
      {canScroll && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 
                     shadow-md opacity-0 group-hover:opacity-100 transition-opacity
                     disabled:opacity-0"
            onClick={() => scroll('left')}
            disabled={!scrollContainerRef.current?.scrollLeft}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 
                     shadow-md opacity-0 group-hover:opacity-100 transition-opacity
                     disabled:opacity-0"
            onClick={() => scroll('right')}
            disabled={!canScrollMore()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}

      <ScrollArea className="w-full whitespace-nowrap rounded-md border">
        <div 
          ref={scrollContainerRef}
          className="flex w-max space-x-4 p-4"
        >
          {!readOnly ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={localTopics.map(t => t.id)}>
                {localTopics.map((userTopic) => (
                  <DraggableTopicCard
                    key={userTopic.id}
                    userTopic={userTopic}
                    onClick={() => handleTopicClick(userTopic.topic)}
                    isDraggable={!readOnly}
                    profileUserId={profileUserId} // Pass it down
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            localTopics.map((userTopic) => (
              <DraggableTopicCard
                key={userTopic.id}
                userTopic={userTopic}
                onClick={() => handleTopicClick(userTopic.topic)}
                isDraggable={false}
                profileUserId={profileUserId} // Pass it down
              />
            ))
          )}

          {!readOnly && (
            <Button
              variant="outline"
              className="w-[300px] h-[200px] shrink-0 flex flex-col gap-2"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="h-8 w-8" />
              <span>Add Topic</span>
            </Button>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {showAddDialog && (
        <AddTopicDialog
          isOpen={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onAdd={async (newTopicData) => {
            try {
              // Check if we have a topic property (needed for UserRoadmapTopic)
              if (newTopicData && 'topic' in newTopicData) {
                // Already a UserRoadmapTopic, add directly
                setLocalTopics(prevTopics => {
                  const updatedTopics = [...prevTopics, newTopicData as unknown as UserRoadmapTopic].sort(sortTopics);
                  return updatedTopics;
                });
              } else if (newTopicData) {
                // Convert to UserRoadmapTopic structure
                const userRoadmapTopic: UserRoadmapTopic = {
                  id: newTopicData.id || `temp-${Date.now()}`,
                  customOrder: localTopics.length * 10,
                  isSkipped: false,
                  topic: {
                    id: newTopicData.id || `temp-${Date.now()}`,
                    title: newTopicData.title,
                    description: newTopicData.description,
                    difficulty: newTopicData.difficulty,
                    estimatedTime: newTopicData.estimatedTime,
                    contents: newTopicData.content?.map(c => ({
                      content: c
                    })) || []
                  }
                };
                
                setLocalTopics(prevTopics => {
                  const updatedTopics = [...prevTopics, userRoadmapTopic].sort(sortTopics);
                  return updatedTopics;
                });
              }
            } catch (error) {
              console.error("Error handling new topic:", error);
            }
          }}
          userRoadmapId={userRoadmapId}
          roadmapId={roadmapId}
          lastTopicId={getLastTopicId()}
        />
      )}

      {selectedTopic && (
        <TopicContent
          isOpen={!!selectedTopic}
          onClose={() => setSelectedTopic(null)}
          topic={selectedTopic}
          userRoadmapId={userRoadmapId}
          roadmapId={roadmapId}
          readOnly={readOnly}
          previousTopicId={null} // Add this explicitly
          onDelete={readOnly ? undefined : (topicId) => {
            setLocalTopics(prev => prev.filter(t => t.topic.id !== topicId));
            setSelectedTopic(null);
          }}
        />
      )}
    </div>
  );
}
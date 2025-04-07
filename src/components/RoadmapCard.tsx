'use client';

import { Button } from "@/components/ui/button";
import { Trash2, CheckCircle2, Globe, Lock } from "lucide-react";
import RoadmapScroller from "./RoadmapScroller";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { deleteRoadmap, toggleRoadmapCompletion, toggleRoadmapVisibility } from "@/actions/roadmap.action";

interface RoadmapCardProps {
  userRoadmap: any; // Type this properly based on your prisma types
  onDataChange?: () => void; // This is now used consistently
}

export function RoadmapCard({ userRoadmap, onDataChange }: RoadmapCardProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this roadmap?')) return;
    
    try {
      setIsDeleting(true);
      await deleteRoadmap(userRoadmap.id);
      
      toast({
        title: "Roadmap deleted",
        description: "The roadmap has been successfully deleted.",
      });
      
      // ONLY call onDataChange - remove router.refresh()
      if (onDataChange) onDataChange();
      
      // Dispatch a custom event for broader notification
      window.dispatchEvent(new CustomEvent('roadmap-changed', { 
        detail: { action: 'delete', id: userRoadmap.id }
      }));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete roadmap. Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleComplete = async () => {
    try {
      setIsCompleting(true);
      const result = await toggleRoadmapCompletion(userRoadmap.id);
      
      toast({
        title: result.completed ? "Roadmap completed" : "Roadmap uncompleted",
        description: result.completed 
          ? "Congratulations on completing your roadmap!" 
          : "Roadmap marked as in progress.",
      });
      
      // ONLY call onDataChange - remove router.refresh()
      if (onDataChange) onDataChange();
      
      // Dispatch a custom event for broader notification
      window.dispatchEvent(new CustomEvent('roadmap-changed', { 
        detail: { action: 'update', id: userRoadmap.id }
      }));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update roadmap status. Please try again.",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const handleToggleVisibility = async () => {
    try {
      setIsTogglingVisibility(true);
      const result = await toggleRoadmapVisibility(userRoadmap.id);
      
      toast({
        title: result.public ? "Roadmap made public" : "Roadmap made private",
        description: result.public 
          ? "Others can now view your roadmap" 
          : "Your roadmap is now private",
      });
      
      // ONLY call onDataChange - remove router.refresh()
      if (onDataChange) onDataChange();
      
      // Dispatch a custom event for broader notification
      window.dispatchEvent(new CustomEvent('roadmap-changed', { 
        detail: { action: 'update', id: userRoadmap.id }
      }));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update roadmap visibility. Please try again.",
      });
    } finally {
      setIsTogglingVisibility(false);
    }
  };

  const completionButtonClass = userRoadmap.completed 
    ? "text-green-500 hover:text-green-600" 
    : "hover:text-green-500";

  const visibilityButtonClass = userRoadmap.public 
    ? "text-blue-500 hover:text-blue-600" 
    : "hover:text-blue-500";

  return (
    <div className="p-6 rounded-lg border bg-card shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{userRoadmap.roadmap.title}</h2>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={visibilityButtonClass}
            onClick={handleToggleVisibility}
            disabled={isTogglingVisibility || isDeleting || isCompleting}
          >
            {userRoadmap.public ? (
              <Globe className="h-5 w-5" />
            ) : (
              <Lock className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={completionButtonClass}
            onClick={handleComplete}
            disabled={isCompleting || isDeleting || isTogglingVisibility}
          >
            <CheckCircle2 className={`h-5 w-5 ${userRoadmap.completed ? "text-green-500" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hover:text-destructive"
            onClick={handleDelete}
            disabled={isDeleting || isCompleting || isTogglingVisibility}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <RoadmapScroller 
        topics={userRoadmap.topics} 
        userRoadmapId={userRoadmap.id}
        roadmapId={userRoadmap.roadmapId}
        onDataChange={onDataChange} // Pass the onDataChange to RoadmapScroller too
      />
    </div>
  );
}
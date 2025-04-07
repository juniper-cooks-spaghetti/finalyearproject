'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { updateTopicCompletion } from "@/actions/topics.action";
import { updateTopicStatistics } from "@/actions/topics.action";

// Add the onRated callback to the component props
interface RateTopicDialogProps {
  isOpen: boolean;
  onClose: () => void;
  topicId: string;
  initialRating?: number;
  initialTimeSpent?: number;
  onRated?: (rating: number, timeSpent: number) => void; // Add this prop
}

export function RateTopicDialog({
  isOpen,
  onClose,
  topicId,
  initialRating = 3,
  initialTimeSpent = 60,
  onRated // Include this in the component props
}: RateTopicDialogProps) {
  const { toast } = useToast();
  const [difficultyRating, setDifficultyRating] = useState(initialRating);
  const [timeSpent, setTimeSpent] = useState(initialTimeSpent);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      
      // Add the status parameter to maintain the existing status
      const result = await updateTopicCompletion(topicId, {
        status: "in_progress", // Default status when rating a topic
        difficultyRating,
        timeSpent
      });
      
      if (result.success) {
        // Call the onRated callback if it exists
        if (onRated) {
          onRated(difficultyRating, timeSpent);
        }
        
        toast({
          title: "Rating saved",
          description: "Your topic rating has been saved.",
        });
        
        onClose();
      } else {
        throw new Error(result.error || "Failed to update rating");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save rating. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rate This Topic</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Difficulty Rating</Label>
              <span className="text-sm text-muted-foreground">
                {difficultyRating}
              </span>
            </div>
            <Slider
              min={1}
              max={5}
              step={1}
              value={[difficultyRating]}
              onValueChange={(value) => setDifficultyRating(value[0])}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeSpent">Time Spent (minutes)</Label>
            <Input
              id="timeSpent"
              type="number"
              min={0}
              value={timeSpent}
              onChange={(e) => setTimeSpent(parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Rating"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
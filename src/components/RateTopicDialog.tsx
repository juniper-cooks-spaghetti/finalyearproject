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

interface RateTopicDialogProps {
  isOpen: boolean;
  onClose: () => void;
  topicId: string;
  initialRating?: number;
  initialTimeSpent?: number;
}

export function RateTopicDialog({
  isOpen,
  onClose,
  topicId,
  initialRating = 3,
  initialTimeSpent = 0
}: RateTopicDialogProps) {
  const { toast } = useToast();
  const [difficultyRating, setDifficultyRating] = useState(initialRating);
  const [timeSpent, setTimeSpent] = useState(initialTimeSpent);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // First update the user's completion
      const result = await updateTopicCompletion(topicId, {
        status: 'completed',
        difficultyRating,
        timeSpent
      });

      if (result.success) {
        // Then update topic statistics
        await updateTopicStatistics(topicId);
        
        toast({
          title: "Rating Submitted",
          description: "Thank you for rating this topic!"
        });
        onClose();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit rating. Please try again.",
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
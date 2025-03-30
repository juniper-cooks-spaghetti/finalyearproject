'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Scale } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { rebalanceAllRoadmapWeights } from "@/actions/admin.action";

export function RebalanceButton() {
  const { toast } = useToast();
  const [isRebalancing, setIsRebalancing] = useState(false);

  const handleRebalance = async () => {
    try {
      setIsRebalancing(true);
      const result = await rebalanceAllRoadmapWeights();

      if (result.success) {
        toast({
          title: "Weights Calibrated Successfully",
          description: `Processed ${result.processed} roadmaps`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rebalance weights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRebalancing(false);
    }
  };

  return (
    <Button 
      onClick={handleRebalance} 
      disabled={isRebalancing}
    >
      {isRebalancing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Calibrating...
        </>
      ) : (
        <>
          <Scale className="mr-2 h-4 w-4" />
          Rebalance All Weights
        </>
      )}
    </Button>
  );
}
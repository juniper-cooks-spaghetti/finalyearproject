'use client';

import { useEffect, useState } from 'react';
import { getTopicRecommendations } from '@/actions/recommendation.action';
import { RecommendationCard } from './RecommendationCard';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface TopicRecommendationsProps {
  currentTopicId: string | null;
  roadmapId: string;
  userRoadmapId: string;
  onSelectRecommendation: (topic: any) => void;
  onRecommendationAdded?: () => void;
}

export function TopicRecommendations({ 
  currentTopicId, 
  roadmapId,
  userRoadmapId,
  onSelectRecommendation,
  onRecommendationAdded 
}: TopicRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingTopicId, setProcessingTopicId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        setIsLoading(true);
        console.log(`Fetching recommendations for topic ${currentTopicId} in roadmap ${roadmapId}`);
        const result = await getTopicRecommendations(currentTopicId, roadmapId);
        console.log('Received recommendations:', result);
        setRecommendations(result || []);
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        toast({
          title: "Error loading recommendations",
          description: "Please try again later",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecommendations();
  }, [currentTopicId, roadmapId, toast]);

  const handleSelectTopic = async (topic: any) => {
    try {
      setProcessingTopicId(topic.id);
      
      onSelectRecommendation(topic);
      
      if (onRecommendationAdded) {
        onRecommendationAdded();
      }
    } catch (error) {
      console.error('Error processing topic:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process topic",
        variant: "destructive",
      });
    } finally {
      setProcessingTopicId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold">Recommended Next Topics</h3>
        <div className="flex justify-center items-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Recommended Next Topics</h3>
      {recommendations && recommendations.length > 0 ? (
        <div className="grid gap-3">
          {recommendations.map((rec) => (
            <div key={rec.id} className="border rounded-lg p-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{rec.afterTopic.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">{rec.afterTopic.description}</p>
                  
                  <div className="flex items-center mt-2 text-xs text-muted-foreground">
                    <span className="mr-3">
                      Resources: {rec.afterTopic.contents?.length || 0}
                    </span>
                    <div className="flex items-center">
                      <span className="mr-1">Confidence:</span>
                      <div className="w-16 h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-full bg-primary rounded-full" 
                          style={{ width: `${Math.round(rec.weight * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectTopic(rec.afterTopic)}
                  disabled={processingTopicId === rec.afterTopic.id}
                >
                  {processingTopicId === rec.afterTopic.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : 'Add Topic'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-4">
          No more topics to recommend for this roadmap
        </div>
      )}
    </div>
  );
}
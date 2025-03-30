'use client';

import { useEffect, useState } from 'react';
import { getTopicRecommendations } from '@/actions/recommendation.action';
import { RecommendationCard } from './RecommendationCard';

interface TopicRecommendationsProps {
  currentTopicId: string | null;
  roadmapId: string;
  onSelectRecommendation: (topic: any) => void;
}

export function TopicRecommendations({ 
  currentTopicId, 
  roadmapId,
  onSelectRecommendation 
}: TopicRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const result = await getTopicRecommendations(currentTopicId, roadmapId);
        setRecommendations(result);
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecommendations();
  }, [currentTopicId, roadmapId]);

  if (isLoading) {
    return <div>Loading recommendations...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Recommended Next Topics</h3>
      {recommendations.length > 0 ? (
        <div className="grid gap-3">
          {recommendations.map((rec) => (
            <RecommendationCard
              key={rec.id}
              title={rec.afterTopic.title}
              description={rec.afterTopic.description}
              weight={rec.weight}
              transitionCount={rec.transitionCount}
              onClick={() => onSelectRecommendation(rec.afterTopic)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-4">
          No recommendations available
        </div>
      )}
    </div>
  );
}
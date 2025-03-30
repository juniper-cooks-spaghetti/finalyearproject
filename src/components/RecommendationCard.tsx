import { Book } from 'lucide-react';

interface RecommendationCardProps {
  title: string;
  description: string;
  weight: number;
  transitionCount: number;
  onClick?: () => void;
}

export function RecommendationCard({
  title,
  description,
  weight,
  transitionCount,
  onClick
}: RecommendationCardProps) {
  return (
    <div
      className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <Book className="h-5 w-5 mt-1 text-muted-foreground" />
        <div className="flex-1 space-y-1">
          <h4 className="font-medium">{title}</h4>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
          <div className="flex gap-3 text-sm text-muted-foreground">
            <span>Confidence: {(weight * 100).toFixed(2)}%</span>
            <span>Transitions: {transitionCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
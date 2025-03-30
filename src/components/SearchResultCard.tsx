import { Book } from 'lucide-react';

interface SearchResultCardProps {
  title: string;
  description: string;
  onClick?: () => void;
}

export function SearchResultCard({
  title,
  description,
  onClick
}: SearchResultCardProps) {
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
        </div>
      </div>
    </div>
  );
}
import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: 'not_started' | 'in_progress' | 'completed';
  className?: string;
}

export function StatusIndicator({ status, className = '' }: StatusIndicatorProps) {
  console.log('StatusIndicator rendered with status:', status); // Debug log

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <div 
      className={`h-3 w-3 rounded-full ${getStatusColor(status)} ${className}`}
      title={status.replace(/_/g, ' ').toUpperCase()}
    />
  );
}
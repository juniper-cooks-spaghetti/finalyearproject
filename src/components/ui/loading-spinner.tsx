'use client';

import { Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function LoadingSpinner() {
  const [rotation, setRotation] = useState(0);
  const [dots, setDots] = useState(0);

  useEffect(() => {
    // Rotation animation
    const rotationInterval = setInterval(() => {
      setRotation((prev) => (prev + 1) % 360);
    }, 10);

    // Dots animation
    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev + 1) % 4);
    }, 500);

    return () => {
      clearInterval(rotationInterval);
      clearInterval(dotsInterval);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative w-20 h-20">
        {/* Circuit track */}
        <div className="absolute inset-0 rounded-full border-4 border-dashed border-muted" />
        
        {/* Moving lightning container */}
        <div 
          className="absolute inset-0"
          style={{
            transform: `rotate(${rotation}deg)`,
          }}
        >
          {/* Lightning */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary rounded-full p-1">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
        </div>
      </div>
      <p className="text-lg font-medium text-muted-foreground min-w-[7.5rem] text-center">
        Loading{'.'.repeat(dots)}
      </p>
    </div>
  );
}
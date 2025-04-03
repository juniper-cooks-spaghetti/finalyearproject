'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CreateRoadmapDialog } from './CreateRoadmapDialog';

export function DraggableCreateButton() {
  const [showDialog, setShowDialog] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [wasDragged, setWasDragged] = useState(false);
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);
  const dragThreshold = 5; // Pixels to move before considering it a drag
  const dragStartTime = useRef<number>(0);
  
  // Initialize position at bottom right on mount
  useEffect(() => {
    // Default position in bottom right with some padding
    const x = window.innerWidth - 80; 
    const y = window.innerHeight - 100;
    setPosition({ x, y });
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      // Make sure button stays within viewport when window is resized
      if (buttonRef.current) {
        const buttonWidth = buttonRef.current.offsetWidth;
        const buttonHeight = buttonRef.current.offsetHeight;
        
        // Adjust position if button is outside viewport
        let { x, y } = position;
        if (x + buttonWidth > window.innerWidth) {
          x = window.innerWidth - buttonWidth - 20;
        }
        if (y + buttonHeight > window.innerHeight) {
          y = window.innerHeight - buttonHeight - 20;
        }
        
        setPosition({ x, y });
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent default to avoid text selection during drag
    e.preventDefault();
    
    setIsDragging(true);
    setWasDragged(false);
    dragStartTime.current = Date.now();
    setStartPosition({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setWasDragged(false);
      dragStartTime.current = Date.now();
      setStartPosition({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    // Calculate new position
    const newX = e.clientX - startPosition.x;
    const newY = e.clientY - startPosition.y;
    
    // Apply boundary constraints
    let boundedX = newX;
    let boundedY = newY;
    
    if (buttonRef.current) {
      const buttonWidth = buttonRef.current.offsetWidth;
      const buttonHeight = buttonRef.current.offsetHeight;
      
      // Keep button within viewport
      boundedX = Math.max(0, Math.min(window.innerWidth - buttonWidth, newX));
      boundedY = Math.max(0, Math.min(window.innerHeight - buttonHeight, newY));
    }
    
    setPosition({ x: boundedX, y: boundedY });

    // Check if the button has been dragged beyond the threshold
    if (Math.abs(newX - startPosition.x) > dragThreshold || Math.abs(newY - startPosition.y) > dragThreshold) {
      setWasDragged(true);
    }
  };
  
  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    
    // Calculate new position
    const newX = touch.clientX - startPosition.x;
    const newY = touch.clientY - startPosition.y;
    
    // Apply boundary constraints
    let boundedX = newX;
    let boundedY = newY;
    
    if (buttonRef.current) {
      const buttonWidth = buttonRef.current.offsetWidth;
      const buttonHeight = buttonRef.current.offsetHeight;
      
      // Keep button within viewport
      boundedX = Math.max(0, Math.min(window.innerWidth - buttonWidth, newX));
      boundedY = Math.max(0, Math.min(window.innerHeight - buttonHeight, newY));
    }
    
    setPosition({ x: boundedX, y: boundedY });

    // Check if the button has been dragged beyond the threshold
    if (Math.abs(newX - startPosition.x) > dragThreshold || Math.abs(newY - startPosition.y) > dragThreshold) {
      setWasDragged(true);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Add event listeners for mouse/touch move and up/end events
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  const handleClick = () => {
    // Only open dialog if we're not dragging
    if (!isDragging && !wasDragged) {
      setShowDialog(true);
    }
  };

  return (
    <>
      <div
        ref={buttonRef}
        className="lg:hidden fixed shadow-lg rounded-full"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 50,
          cursor: isDragging ? 'grabbing' : 'grab',
          transition: isDragging ? 'none' : 'box-shadow 0.2s ease-in-out'
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={handleClick}
      >
        <Button
          size="icon"
          className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-700 text-white"
          aria-label="Create roadmap"
        >
          <Plus className="h-8 w-8" />
        </Button>
      </div>

      <CreateRoadmapDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        onRoadmapCreated={() => {
            setShowDialog(false);
        }}
      />
    </>
  );
}
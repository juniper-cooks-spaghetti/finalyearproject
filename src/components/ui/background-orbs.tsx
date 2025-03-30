"use client";

export function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="relative w-full h-full">
        {/* Large orb - top right */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/30 dark:bg-purple-300/20 rounded-full 
          mix-blend-multiply dark:mix-blend-soft-light filter blur-xl animate-blob"/>
        
        {/* Medium orb - center left */}
        <div className="absolute top-1/2 -left-20 w-60 h-60 bg-blue-600/25 dark:bg-purple-200/25 rounded-full 
          mix-blend-multiply dark:mix-blend-soft-light filter blur-xl animate-blob animation-delay-2000"/>
        
        {/* Small orb - bottom center */}
        <div className="absolute -bottom-20 left-1/2 w-40 h-40 bg-blue-500/30 dark:bg-purple-400/20 rounded-full 
          mix-blend-multiply dark:mix-blend-soft-light filter blur-xl animate-blob animation-delay-4000"/>
          
        {/* Extra small orbs scattered */}
        <div className="absolute top-1/4 left-1/4 w-20 h-20 bg-blue-600/25 dark:bg-purple-300/25 rounded-full 
          mix-blend-multiply dark:mix-blend-soft-light filter blur-lg animate-blob animation-delay-1000"/>
        <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-blue-500/30 dark:bg-purple-200/20 rounded-full 
          mix-blend-multiply dark:mix-blend-soft-light filter blur-lg animate-blob animation-delay-3000"/>
      </div>
    </div>
  );
}
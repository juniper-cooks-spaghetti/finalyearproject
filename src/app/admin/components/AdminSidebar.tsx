'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";
import Link from "next/link";
import { 
  BarChart3, 
  Users, 
  Map, 
  BookOpen, 
  FileText,
  ChevronRight,
  ChevronsRight
} from "lucide-react";

const navItems = [
  {
    title: 'Analytics',
    icon: BarChart3,
    href: '/admin',
  },
  {
    title: 'User Management',
    icon: Users,
    href: '/admin/users',
  },
  {
    title: 'Roadmap Management',
    icon: Map,
    href: '/admin/roadmaps',
  },
  {
    title: 'Topic Management',
    icon: BookOpen,
    href: '/admin/topics',
  },
  {
    title: 'Content Management',
    icon: FileText,
    href: '/admin/content',
  },
];

export function AdminSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasHovered, setHasHovered] = useState(false);
  const pathname = usePathname();

  // Auto-collapse sidebar when navigating between pages
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);
  
  // Close the sidebar when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      // Get the sidebar element
      const sidebar = document.getElementById('admin-sidebar');
      const trigger = document.getElementById('admin-sidebar-trigger');
      
      // Check if the click was outside the sidebar and trigger
      if (sidebar && 
          trigger && 
          !sidebar.contains(e.target as Node) && 
          !trigger.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    // Add the event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <>
      {/* Overlay to prevent interactions when sidebar is open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-transparent z-20"
          onClick={() => setIsOpen(false)}
        />
      )}
    
      <div className="fixed inset-y-[64px] left-0 z-30 pointer-events-none">
        {/* Trigger handle - this should remain clickable */}
        <div 
          id="admin-sidebar-trigger"
          className={cn(
            "absolute left-0 top-0 w-4 h-full bg-border/30 hover:bg-accent/40 transition-colors",
            "flex items-center justify-center cursor-pointer pointer-events-auto",
            isOpen && "hidden"
          )}
          onClick={() => {
            setIsOpen(true);
            setHasHovered(true);
          }}
          onMouseEnter={() => {
            setIsOpen(true);
            setHasHovered(true);
          }}
        >
          <ChevronsRight className="w-3 h-3 text-foreground/30" />
        </div>

        {/* Sidebar - only make this clickable when open */}
        <div 
          id="admin-sidebar"
          className={cn(
            "w-64 h-full bg-background border-r shadow-lg transition-all duration-300 transform",
            isOpen ? "translate-x-0 pointer-events-auto" : "-translate-x-[252px]",
            // Only apply pointer-events-none if never hovered (prevents disrupting initial page load interactions)
            !hasHovered && !isOpen && "opacity-0"
          )}
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="flex items-center justify-between p-4">
            <h2 className="font-semibold">Admin Navigation</h2>
            <button 
              onClick={() => setIsOpen(false)}
              className="focus:outline-none hover:bg-accent/40 p-1 rounded-full"
            >
              <ChevronRight className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )} />
            </button>
          </div>

          <nav className="space-y-1 px-2">
            {navItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm rounded-md",
                  "hover:bg-accent hover:text-accent-foreground transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  pathname === item.href && "bg-accent/50 font-medium"
                )}
                onClick={() => setIsOpen(false)}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
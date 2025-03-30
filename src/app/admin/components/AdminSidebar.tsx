'use client';

import { useState } from 'react';
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

  return (
    <div className="fixed inset-y-[64px] left-0 z-40">
      {/* Enhanced hover trigger */}
      <div 
        className={cn(
          "absolute left-0 top-0 w-4 h-full bg-border/30 hover:bg-accent/40 transition-colors",
          "flex items-center justify-center",
          isOpen && "hidden"
        )}
        onMouseEnter={() => setIsOpen(true)}
      >
        <ChevronsRight className="w-3 h-3 text-foreground/30" />
      </div>

      {/* Sidebar */}
      <div 
        className={cn(
          "w-64 h-full bg-background border-r shadow-lg transition-transform duration-300 transform",
          isOpen ? "translate-x-0" : "-translate-x-[252px]"
        )}
        onMouseLeave={() => setIsOpen(false)}
      >
        <div className="flex items-center justify-between p-4">
          <h2 className="font-semibold">Admin Navigation</h2>
          <ChevronRight className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )} />
        </div>

        <nav className="space-y-1 px-2">
          {navItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm rounded-md",
                "hover:bg-accent hover:text-accent-foreground transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { UserTable } from "./UserTable";

interface UserTabsProps {
  users: any[];
}

export function UserTabs({ users }: UserTabsProps) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before rendering tabs
  useEffect(() => {
    setMounted(true);
  }, []);

  // Debug tab change
  const handleTabChange = (value: string) => {
    console.log(`Tab changed to: ${value}`);
    setActiveTab(value);
  };

  // Get the filtered users based on the active tab
  const getFilteredUsers = () => {
    if (activeTab === "all") return users;
    
    // Filter by role
    return users.filter(user => 
      user.role.toLowerCase() === activeTab.toLowerCase()
    );
  };

  // Count users per role
  const adminCount = users.filter(u => u.role === 'ADMIN').length;
  const userCount = users.filter(u => u.role === 'USER').length;

  // Don't render tabs until client-side
  if (!mounted) {
    return <div className="min-h-[200px] flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">User Management</h1>
      </div>
      
      {/* Compact tabs in right corner */}
      <div className="flex justify-end">
        <div className="inline-flex bg-muted rounded-lg p-1">
          <button
            onClick={() => handleTabChange("all")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === "all" 
                ? "bg-background shadow text-foreground" 
                : "hover:bg-muted-foreground/10"
            }`}
          >
            All Users
          </button>
          
          <button
            onClick={() => handleTabChange("admin")}
            className={`px-3 py-1 text-sm rounded-md transition-colors relative ${
              activeTab === "admin" 
                ? "bg-background shadow text-foreground" 
                : "hover:bg-muted-foreground/10"
            }`}
          >
            Admins
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-[10px] rounded-full flex items-center justify-center text-white">
              {adminCount}
            </span>
          </button>
          
          <button
            onClick={() => handleTabChange("user")}
            className={`px-3 py-1 text-sm rounded-md transition-colors relative ${
              activeTab === "user" 
                ? "bg-background shadow text-foreground" 
                : "hover:bg-muted-foreground/10"
            }`}
          >
            Users
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-[10px] rounded-full flex items-center justify-center text-white">
              {userCount}
            </span>
          </button>
        </div>
      </div>
      
      {/* Content area */}
      <div className="w-full">
        <UserTable users={getFilteredUsers()} />
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { DashboardStats } from './components/DashboardStats';
import { UserGraphView } from './components/UserGraphView';
import { RoadmapGraphView } from './components/RoadmapGraphView';
import { TopicGraphView } from './components/TopicGraphView';
import { ContentGraphView } from './components/ContentGraphView';
import { AdminSidebar } from './components/AdminSidebar';

// Enum for active view
enum ActiveView {
  None = 'none',
  Users = 'users',
  Roadmaps = 'roadmaps',
  Topics = 'topics',
  Content = 'content'
}

export default function AdminDashboard() {
  const [activeView, setActiveView] = useState<ActiveView>(ActiveView.Users); // Default to users
  
  return (
    <main className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      
      <DashboardStats 
        onUserCardClick={() => setActiveView(activeView === ActiveView.Users ? ActiveView.None : ActiveView.Users)} 
        onRoadmapCardClick={() => setActiveView(activeView === ActiveView.Roadmaps ? ActiveView.None : ActiveView.Roadmaps)}
        onTopicCardClick={() => setActiveView(activeView === ActiveView.Topics ? ActiveView.None : ActiveView.Topics)}
        onContentCardClick={() => setActiveView(activeView === ActiveView.Content ? ActiveView.None : ActiveView.Content)}
      />
      
      {/* Graph Views */}
      <div className="graph-views-container">
        {activeView === ActiveView.Users && <UserGraphView />}
        {activeView === ActiveView.Roadmaps && <RoadmapGraphView />}
        {activeView === ActiveView.Topics && <TopicGraphView />}
        {activeView === ActiveView.Content && <ContentGraphView />}
      </div>
      
      <AdminSidebar />
    </main>
  );
}
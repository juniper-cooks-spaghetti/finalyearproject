import Sidebar from "@/components/Sidebar";
import UserRoadmaps from "@/components/UserRoadmaps";
import { currentUser } from "@clerk/nextjs/server";
import { CreateRoadmapButton } from "@/components/CreateRoadmapDialog";
import { Toaster } from "@/components/ui/toaster";
import { redirectAdminToAdminDashboard } from "@/adminCheck";
import { DraggableCreateButton } from "@/components/DraggableCreateButton";

export default async function Dashboard() {
  await redirectAdminToAdminDashboard();

  const user = await currentUser();

  return (
    <main className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="hidden lg:flex lg:col-span-3 flex-col gap-6">
            <Sidebar />
            {user && <CreateRoadmapButton />}
          </div>
          <div className="lg:col-span-9">
            {user ? <UserRoadmaps /> : (
              <div className="p-6 rounded-lg border bg-card shadow-sm">
                <h2 className="text-xl font-semibold text-center">Please sign in to view your roadmaps</h2>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Add the draggable floating button for mobile/tablet */}
      {user && <DraggableCreateButton />}
      
      <Toaster />
    </main>
  );
}

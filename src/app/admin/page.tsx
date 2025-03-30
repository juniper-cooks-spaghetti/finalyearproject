import { checkAdmin } from "@/adminCheck";
import { DashboardStats } from "./components/DashboardStats";
import { AdminSidebar } from "./components/AdminSidebar";

export default async function AdminPage() {
  await checkAdmin();

  return (
    <main className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>

      <DashboardStats />
      
      <AdminSidebar />
    </main>
  );
}
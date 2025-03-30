import { checkAdmin } from "@/adminCheck";
import { prisma } from "@/lib/prisma";
import { UserTable } from "@/components/UserTable";
import { AdminSidebar } from "../components/AdminSidebar";

export default async function UsersPage() {
  await checkAdmin();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      clerkId: true,
      email: true,
      username: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          roadmaps: true,
          contentInteractions: true,
          UserTopicCompletion: true,
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const formattedUsers = users.map(user => ({
    ...user,
    createdAt: user.createdAt.toISOString()
  }));

  return (
    <main className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">User Management</h1>
      </div>

      <UserTable users={formattedUsers} />
      <AdminSidebar />
      
    </main>
  );
}
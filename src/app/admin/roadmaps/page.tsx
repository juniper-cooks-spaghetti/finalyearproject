import { checkAdmin } from "@/adminCheck";
import { prisma } from "@/lib/prisma";
import { RoadmapTable } from "../components/RoadmapTable";
import { AdminSidebar } from "../components/AdminSidebar";
import { RebalanceButton } from "@/components/RebalanceButton";

export default async function RoadmapsPage() {
  await checkAdmin();

  const rawRoadmaps = await prisma.roadmap.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      createdAt: true,
      _count: {
        select: {
          topics: true,
          userRoadmaps: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Transform dates and handle null categories
  const roadmaps = rawRoadmaps.map(roadmap => ({
    ...roadmap,
    createdAt: roadmap.createdAt.toISOString(),
    category: roadmap.category || 'Uncategorized' // Provide default value for null categories
  }));

  return (
    <main className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Roadmap Management</h1>
        <RebalanceButton />
      </div>

      <RoadmapTable roadmaps={roadmaps} />
      <AdminSidebar />
    </main>
  );
}
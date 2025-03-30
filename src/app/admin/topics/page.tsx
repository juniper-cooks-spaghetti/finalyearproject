import { checkAdmin } from "@/adminCheck";
import { prisma } from "@/lib/prisma";
import { TopicTable } from "@/components/TopicTable";
import { AdminSidebar } from "../components/AdminSidebar";

export default async function TopicsPage() {
  await checkAdmin();

  const rawTopics = await prisma.topic.findMany({
    select: {
      id: true,
      title: true,
      difficulty: true,
      estimatedTime: true,
      roadmaps: {
        select: {
          roadmap: {
            select: {
              id: true,
              title: true
            }
          }
        }
      },
      createdAt: true,
      _count: {
        select: {
          contents: true,
          UserTopicCompletion: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Transform dates and handle null values
  const topics = rawTopics.map(topic => ({
    ...topic,
    createdAt: topic.createdAt.toISOString(),
    difficulty: topic.difficulty ?? 0,
    estimatedTime: topic.estimatedTime ?? 0
  }));

  return (
    <main className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Topic Management</h1>
      </div>

      <TopicTable topics={topics} />
      <AdminSidebar />
    </main>
  );
}
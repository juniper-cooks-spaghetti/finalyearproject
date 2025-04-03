import { checkAdmin } from "@/adminCheck";
import { prisma } from "@/lib/prisma";
import { AdminSidebar } from "../components/AdminSidebar";
import { TopicTabs } from "../components/TopicTabs";

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
      <TopicTabs topics={topics} />
      <AdminSidebar />
    </main>
  );
}
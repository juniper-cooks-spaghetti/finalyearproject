import { checkAdmin } from "@/adminCheck";
import { prisma } from "@/lib/prisma";
import { AdminSidebar } from "../components/AdminSidebar";
import { ContentTabs } from "../components/ContentTabs";

export default async function ContentPage() {
  await checkAdmin();

  const [rawContent, suggestions] = await Promise.all([
    prisma.content.findMany({
      select: {
        id: true,
        title: true,
        type: true,
        url: true,
        description: true,
        topics: {
          select: {
            topic: {
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
            userInteractions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    }),
    prisma.userContentSuggestion.findMany({
      select: {
        id: true,
        title: true,
        type: true,
        url: true,
        description: true,
        amount: true,
        topic: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        amount: 'desc'
      }
    })
  ]);

  // Transform dates to strings for content
  const content = rawContent.map(item => ({
    ...item,
    createdAt: item.createdAt.toISOString()
  }));

  return (
    <main className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Content Management</h1>
      </div>

      {/* Use the client component for tabs */}
      <ContentTabs content={content} suggestions={suggestions} />

      <AdminSidebar />
    </main>
  );
}
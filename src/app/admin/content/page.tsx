import { ContentTabs } from '../components/ContentTabs';
import { prisma } from '@/lib/prisma';
import { checkAdmin } from '@/adminCheck';
import { AdminSidebar } from '../components/AdminSidebar';

export default async function ContentPage() {
  await checkAdmin();

  const [rawContent, suggestions, topics] = await Promise.all([
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
    }),
    // Fetch topics for dropdown selection
    prisma.topic.findMany({
      select: {
        id: true,
        title: true
      },
      orderBy: {
        title: 'asc'
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
      {/* Use the client component for tabs, passing topics as well */}
      <ContentTabs 
        content={content} 
        suggestions={suggestions} 
        topics={topics}
      />

      <AdminSidebar />
    </main>
  );
}
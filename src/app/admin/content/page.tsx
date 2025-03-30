import { checkAdmin } from "@/adminCheck";
import { prisma } from "@/lib/prisma";
import { ContentTable } from "@/components/ContentTable";
import { ContentSuggestionsTable } from "@/components/ContentSuggestionsTable";
import { AdminSidebar } from "../components/AdminSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="suggestions" className="relative">
            Suggestions
            {suggestions.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-[10px] rounded-full flex items-center justify-center">
                {suggestions.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="content" className="space-y-4">
          <ContentTable content={content} />
        </TabsContent>
        <TabsContent value="suggestions" className="space-y-4">
          <ContentSuggestionsTable suggestions={suggestions} />
        </TabsContent>
      </Tabs>

      <AdminSidebar />
    </main>
  );
}
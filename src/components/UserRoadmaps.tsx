import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCircle2 } from "lucide-react";
import { RoadmapCard } from "./RoadmapCard";

async function getUserRoadmaps() {
  const { userId: clerkUserId } = await auth();
  console.log("Clerk userId:", clerkUserId);
  
  if (!clerkUserId) return null;

  const dbUser = await prisma.user.findUnique({
    where: {
      clerkId: clerkUserId
    }
  });
  
  console.log("Database user:", dbUser);

  if (!dbUser) return null;

  const userRoadmaps = await prisma.userRoadmap.findMany({
    where: {
      userId: dbUser.id,
    },
    include: {
      roadmap: {
        select: {
          id: true,
          title: true,
          description: true,
        }
      },
      topics: {
        include: {
          topic: {
            select: {
              id: true,
              title: true,
              description: true,
              difficulty: true,
              estimatedTime: true,
              contents: {
                include: {
                  content: {
                    select: {
                      id: true,
                      title: true,
                      type: true,
                      url: true,
                      description: true,
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  console.log("Found userRoadmaps:", userRoadmaps.map(ur => ({
    id: ur.id,
    title: ur.roadmap.title
  })));
  return userRoadmaps;
}

export default async function UserRoadmaps() {
  const userRoadmaps = await getUserRoadmaps();

  return (
    <div className="space-y-6">
      
      {(!userRoadmaps || userRoadmaps.length === 0) ? (
        <div className="p-6 rounded-lg border bg-card shadow-sm">
          <h2 className="text-xl font-semibold text-center">No roadmaps found</h2>
          <p className="text-muted-foreground text-center">Start by creating or joining a roadmap.</p>
        </div>
      ) : (
        userRoadmaps.map((userRoadmap) => (
          <RoadmapCard key={userRoadmap.id} userRoadmap={userRoadmap} />
        ))
      )}
    </div>
  );
}
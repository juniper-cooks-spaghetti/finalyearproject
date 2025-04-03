import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: {
        clerkId: clerkUserId
      }
    });
    
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

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
      },
    });

    return NextResponse.json(userRoadmaps);
  } catch (error) {
    console.error("Error fetching user roadmaps:", error);
    return NextResponse.json({ error: "Failed to fetch roadmaps" }, { status: 500 });
  }
}
"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getProfileByUsername(username: string) {
  try {
    const user = await prisma.user.findUnique({
      where: {
        username: username
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        bio: true,
        location: true,
        website: true,
        createdAt: true,
        roadmaps: {
          select: {
            id: true,
            completed: true,
          }
        }
      }
    });

    if (!user) return null;

    const stats = {
      totalRoadmaps: user.roadmaps.length,
      completedRoadmaps: user.roadmaps.filter(r => r.completed).length,
      inProgressRoadmaps: user.roadmaps.filter(r => !r.completed).length,
    };

    return { ...user, stats };
  } catch (error) {
    console.error("Error getting profile by username:", error);
    return null;
  }
}

export async function getInProgressRoadmaps(userId: string) {
  try {
    return await prisma.userRoadmap.findMany({
      where: {
        userId,
        completed: false,
        public: true  // Only return public roadmaps
      },
      include: {
        roadmap: {
          select: {
            title: true,
            description: true,
            category: true
          }
        },
        topics: {
          include: {
            topic: {
              include: {
                contents: {
                  include: {
                    content: {
                      select: {
                        id: true,
                        title: true,
                        type: true,
                        url: true,
                        description: true,
                        userInteractions: true,
                      }
                    }
                  }
                }
              }
            }
          },
          orderBy: {
            customOrder: 'asc'
          }
        }
      }
    });
  } catch (error) {
    console.error("Error getting in-progress roadmaps:", error);
    throw error;
  }
}

export async function getCompletedRoadmaps(userId: string) {
  try {
    return await prisma.userRoadmap.findMany({
      where: {
        userId,
        completed: true,
        public: true  // Only return public roadmaps
      },
      include: {
        roadmap: {
          select: {
            title: true,
            description: true,
            category: true
          }
        },
        topics: {
          include: {
            topic: {
              include: {
                contents: {
                  include: {
                    content: {
                      select: {
                        id: true,
                        title: true,
                        type: true,
                        url: true,
                        description: true,
                        userInteractions: true,
                      }
                    }
                  }
                }
              }
            }
          },
          orderBy: {
            customOrder: 'asc'
          }
        }
      }
    });
  } catch (error) {
    console.error("Error getting completed roadmaps:", error);
    throw error;
  }
}

export async function getUserStats(userId: string) {
  try {
    const userRoadmaps = await prisma.userRoadmap.findMany({
      where: {
        userId,
        public: true  // Only count public roadmaps
      },
      select: {
        completed: true
      }
    });

    const stats = {
      totalRoadmaps: userRoadmaps.length,
      completedRoadmaps: userRoadmaps.filter(r => r.completed).length,
      inProgressRoadmaps: userRoadmaps.filter(r => !r.completed).length,
      completionRate: userRoadmaps.length > 0 
        ? (userRoadmaps.filter(r => r.completed).length / userRoadmaps.length) * 100 
        : 0
    };

    return stats;
  } catch (error) {
    console.error("Error getting user stats:", error);
    return null;
  }
}

export async function updateProfile(formData: FormData) {
    try {
      const { userId: clerkId } = await auth();
      if (!clerkId) throw new Error("Unauthorized");
  
      const name = formData.get("name") as string;
      const bio = formData.get("bio") as string;
      const location = formData.get("location") as string;
      const website = formData.get("website") as string;
      const profileImage = formData.get("profileImage") as File;
      
      let imageUrl = null;

      if (profileImage && profileImage.size > 0) {
        const arrayBuffer = await profileImage.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const blob = new Blob([buffer], { type: profileImage.type });
  
        const clerk = await clerkClient();
        const uploadedImage = await clerk.users.updateUserProfileImage(clerkId, {
          file: blob
        });
  
        imageUrl = uploadedImage.imageUrl;
      }
      
      const user = await prisma.user.update({
        where: { clerkId },
        data: {
          name,
          bio,
          location,
          website,
          ...(imageUrl && { image: imageUrl }),
        },
      });
  
      revalidatePath("/profile");
      return { 
        success: true, 
        user,
        ...(imageUrl && { imageUrl }) 
       };
    } catch (error) {
      console.error("Error updating profile:", error);
      return { success: false, error: "Failed to update profile" };
    }
  }


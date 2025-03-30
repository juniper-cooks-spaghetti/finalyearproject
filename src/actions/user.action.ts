"use server";

import { prisma } from "@/lib/prisma";
import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";

export async function syncUser() {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) return;

    const existingUser = await prisma.user.findUnique({
      where: {
        clerkId: userId,
      },
    });

    if (existingUser) return existingUser;

    const dbUser = await prisma.user.create({
      data: {
        clerkId: userId,
        name: `${user.firstName || ""} ${user.lastName || ""}`,
        username: user.username ?? user.emailAddresses[0].emailAddress.split("@")[0],
        email: user.emailAddresses[0].emailAddress,
        image: user.imageUrl,
      },
    });

    return dbUser;
  } catch (error) {
    console.log("Error in syncUser", error);
  }
}

export async function getUserByClerkId(clerkId: string) {
  return prisma.user.findUnique({
    where: {
      clerkId
    },
    include: {
      _count: {
        select: {
          roadmaps: true
        }
      }
    }
  });
}

// Webhook handling: Clerk -> Database
export async function syncUserById(userId: string, userData?: any) {
  try {
    console.log('Syncing user by ID:', userId);
    
    if (!userId) {
      console.error('Invalid userId provided');
      return null;
    }

    // Extract user data from the webhook payload
    const firstName = userData?.first_name || "";
    const lastName = userData?.last_name || "";
    const name = `${firstName} ${lastName}`.trim() || "New User";
    
    const email = userData?.email_addresses && userData.email_addresses.length > 0
      ? userData.email_addresses[0].email_address
      : null;
    
    // Construct the username from email or use the provided username
    const username = userData?.username || (email ? email.split("@")[0] : `user_${userId.substring(0, 8)}`);
    
    // Get image URL
    const image = userData?.image_url || "";

    // Prepare data for database operation
    const userDataForDb = {
      name,
      username,
      email: email || "",
      image,
    };

    console.log('User data for database:', userDataForDb);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    if (existingUser) {
      console.log('Updating existing user:', existingUser.id);
      const updatedUser = await prisma.user.update({
        where: { clerkId: userId },
        data: userDataForDb
      });
      console.log('User updated:', updatedUser.id);
      return updatedUser;
    }

    // Create new user
    console.log('Creating new user');
    const newUser = await prisma.user.create({
      data: {
        ...userDataForDb,
        clerkId: userId,
      }
    });
    console.log('New user created:', newUser.id);
    return newUser;
  } catch (error) {
    console.error('Error in syncUserById:', error);
    return null;
  }
}


export async function handleUserDelete(userId: string) {
  try {
    if (!userId) {
      console.error('Invalid userId for deletion');
      return;
    }
    
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: userId }
    });
    
    if (!existingUser) {
      console.log(`No user found with clerkId ${userId} to delete`);
      return;
    }
    
    console.log(`Deleting user with clerkId: ${userId}`);
    await prisma.user.delete({
      where: { clerkId: userId }
    });
    console.log('User deleted successfully');
  } catch (error) {
    console.error('Error deleting user:', error);
    return;
  }
}

export async function getDbUserId() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const user = await getUserByClerkId(clerkId);

  if (!user) throw new Error("User not found");

  return user.id;
}
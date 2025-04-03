import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

// Original function - checks if user is admin, redirects if not
export async function checkAdmin() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: {
      clerkId: userId,
    },
    select: {
      role: true
    }
  });

  if (!user || user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return true;
}

// New function - checks if user is admin, redirects TO admin if they are
export async function redirectAdminToAdminDashboard() {
  try {
    const { userId } = await auth();
    
    // Only proceed if user is logged in
    if (!userId) {
      return false;
    }

    const user = await prisma.user.findUnique({
      where: {
        clerkId: userId,
      },
      select: {
        role: true
      }
    });
    
    // If user is admin, redirect to admin dashboard
    if (user?.role === "ADMIN") {
      redirect("/admin");
    }
    
    return false;
  } catch (error) {
    // Specifically handle NEXT_REDIRECT errors (these are expected)
    if (error && typeof error === 'object' && 'digest' in error && 
        String(error.digest).startsWith('NEXT_REDIRECT')) {
      // This is an expected redirect error, just throw it to let Next.js handle it
      throw error;
    }
    
    // For all other errors, log and continue
    console.error("Error checking admin status:", error);
    return false;
  }
}
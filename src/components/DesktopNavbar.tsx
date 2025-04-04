import { BellIcon, HomeIcon, UserIcon, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SignInButton, UserButton } from "@clerk/nextjs";
import ModeToggle from "./ModeToggle";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

async function DesktopNavbar() {
  const user = await currentUser();
  const dbUser = user
    ? await prisma.user.findUnique({
        where: { clerkId: user.id },
        select: { role: true },
      })
    : null;

  const isAdmin = dbUser?.role === "ADMIN";

  return (
    <div className="hidden md:flex items-center space-x-4">
      <ModeToggle />



      {isAdmin && (
        <Button variant="ghost" className="flex items-center gap-2" asChild>
          <Link href="/admin">
            <Shield className="w-4 h-4" />
            <span className="hidden lg:inline">Admin</span>
          </Link>
        </Button>
      )}
      {user ? (
        <>
          <Button variant="ghost" className="flex items-center gap-2" asChild>
            <Link href="/dashboard">
              <HomeIcon className="w-4 h-4" />
              <span className="hidden lg:inline">Dashboard</span>
            </Link>
          </Button>
          <Button variant="ghost" className="flex items-center gap-2" asChild>
            <Link
              href={`/profile/${
                user.username ?? user.emailAddresses[0].emailAddress.split("@")[0]
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span className="hidden lg:inline">Profile</span>
            </Link>
          </Button>
          <UserButton />
        </>
      ) : (
        <SignInButton mode="modal">
          <Button variant="default">Sign In</Button>
        </SignInButton>
      )}
    </div>
  );
}
export default DesktopNavbar;
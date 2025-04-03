'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { deleteUser } from "@/actions/admin.action";

interface User {
  id: string;
  clerkId: string;
  email: string;
  username: string;
  role: string;
  createdAt: string;
  _count: {
    roadmaps: number;
    contentInteractions: number;
    UserTopicCompletion: number;
  }
}

export function UserTable({ users }: { users: User[] }) {
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (userId: string, clerkId: string) => {
    try {
      setDeletingId(userId);
      const result = await deleteUser(clerkId);
      
      if (result.success) {
        toast({
          title: "User deleted",
          description: "User has been successfully removed"
        });
        window.location.reload();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Join Date</TableHead>
            <TableHead>Roadmaps</TableHead>
            <TableHead>Content Interactions</TableHead>
            <TableHead>Completed Topics</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.username}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.role}</TableCell>
              <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>{user._count.roadmaps}</TableCell>
              <TableCell>{user._count.contentInteractions}</TableCell>
              <TableCell>{user._count.UserTopicCompletion}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(user.id, user.clerkId)}
                  disabled={deletingId === user.id}
                >
                  {deletingId === user.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-destructive" />
                  )}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
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
import { Scale, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { deleteRoadmap, rebalanceRoadmapWeights } from "@/actions/admin.action";

interface Roadmap {
  id: string;
  title: string;
  description: string;
  category: string;
  createdAt: string;
  _count: {
    topics: number;
    userRoadmaps: number;
  }
}

export function RoadmapTable({ roadmaps }: { roadmaps: Roadmap[] }) {
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [rebalancingId, setRebalancingId] = useState<string | null>(null);

  const handleDelete = async (roadmapId: string) => {
    try {
      setDeletingId(roadmapId);
      const result = await deleteRoadmap(roadmapId);
      
      if (result.success) {
        toast({
          title: "Roadmap deleted",
          description: "Roadmap has been successfully removed"
        });
        window.location.reload();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete roadmap. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleRebalance = async (roadmapId: string) => {
    try {
      setRebalancingId(roadmapId);
      const result = await rebalanceRoadmapWeights(roadmapId);

      if (result.success) {
        toast({
          title: "Weights Calibrated Successfully",
          description: "Roadmap weights have been rebalanced"
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rebalance weights. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRebalancingId(null);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Topics</TableHead>
            <TableHead>Users</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roadmaps.map((roadmap) => (
            <TableRow key={roadmap.id}>
              <TableCell className="font-medium">{roadmap.title}</TableCell>
              <TableCell>{roadmap.category}</TableCell>
              <TableCell>{roadmap._count.topics}</TableCell>
              <TableCell>{roadmap._count.userRoadmaps}</TableCell>
              <TableCell>{new Date(roadmap.createdAt).toLocaleDateString()}</TableCell>
              <TableCell className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRebalance(roadmap.id)}
                  disabled={rebalancingId === roadmap.id}
                >
                  {rebalancingId === roadmap.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Scale className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(roadmap.id)}
                  disabled={deletingId === roadmap.id}
                >
                  {deletingId === roadmap.id ? (
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
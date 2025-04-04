'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, MoreHorizontal, Shield, User as UserIcon, Ban, Edit, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { deleteUser, revalidateUsersPage, updateUserRole, updateUserDetails, bulkDeleteUsers } from "@/actions/admin.action";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

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

// Form schema for edit user
const editUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  email: z.string().email("Please enter a valid email address"),
});

export function UserTable({ users }: { users: User[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [processingRoleId, setProcessingRoleId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [rowSelectionState, setRowSelectionState] = useState({});

  // Initialize form
  const form = useForm<z.infer<typeof editUserSchema>>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: "",
      email: "",
    },
  });

  // Open edit dialog and populate form
  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.reset({
      username: user.username,
      email: user.email,
    });
  };

  // Close edit dialog
  const handleCloseEdit = () => {
    setEditingUser(null);
    form.reset();
  };

  // Submit edit form
  const onSubmit = async (values: z.infer<typeof editUserSchema>) => {
    if (!editingUser) return;
    
    try {
      setIsSubmitting(true);
      const result = await updateUserDetails(editingUser.id, values);
      
      if (result.success) {
        toast({
          title: "User updated",
          description: "User details have been successfully updated"
        });
        handleCloseEdit();
        await revalidateUsersPage();
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update user details",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (userId: string, clerkId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      setDeletingId(userId);
      const result = await deleteUser(clerkId);
      
      if (result.success) {
        toast({
          title: "User deleted",
          description: "User has been successfully removed"
        });
        
        // Use Next.js router to refresh data
        await revalidateUsersPage();
        router.refresh();
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
  
  const handleRoleChange = async (userId: string, newRole: 'USER' | 'ADMIN') => {
    try {
      setProcessingRoleId(userId);
      const result = await updateUserRole(userId, newRole);
      
      if (result.success) {
        toast({
          title: "Role updated",
          description: `User has been ${newRole === 'ADMIN' ? 'promoted to admin' : 'demoted to regular user'}`
        });
        
        await revalidateUsersPage();
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update user role",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setProcessingRoleId(null);
    }
  };
  
  const handleBulkDelete = async () => {
    if (!selectedUsers.length) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedUsers.length} user(s)? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setIsBulkDeleting(true);
      const userIds = selectedUsers.map(user => user.id);
      const result = await bulkDeleteUsers(userIds);
      
      if (result.success) {
        toast({
          title: "Users deleted",
          description: `Successfully deleted ${result.stats?.success} user(s)${
            result.stats?.failed ? `, failed to delete ${result.stats.failed} user(s)` : ''
          }`
        });
        
        await revalidateUsersPage();
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete users",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to perform bulk delete. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // This function correctly handles selection changes from the table
  const handleRowSelectionChange = (selectedRows: User[]) => {
    console.log("Selection changed:", selectedRows.length, "users selected");
    setSelectedUsers(selectedRows);
  };
  
  // Properly reset selection when users data changes
  useEffect(() => {
    setSelectedUsers([]);
    setRowSelectionState({});
  }, [users]);

  // Define columns for the DataTable
  const columns: ColumnDef<User>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <div className="px-1" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="h-5 w-5"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div 
          className="px-1" 
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => {
              row.toggleSelected(!!value);
            }}
            aria-label="Select row"
            className="h-5 w-5"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "username",
      header: "Username",
      cell: ({ row }) => <div className="font-medium">{row.getValue("username")}</div>,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <div className="whitespace-nowrap">{row.getValue("email")}</div>,
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const role = row.getValue("role") as string;
        return (
          <Badge variant={role === 'ADMIN' ? "default" : "secondary"}>
            {role === 'ADMIN' ? (
              <Shield className="mr-1 h-3 w-3" />
            ) : (
              <UserIcon className="mr-1 h-3 w-3" />
            )}
            {role}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Join Date",
      cell: ({ row }) => new Date(row.getValue("createdAt")).toLocaleDateString(),
    },
    {
      accessorKey: "_count.roadmaps",
      header: "Roadmaps",
      cell: ({ row }) => row.original._count.roadmaps,
    },
    {
      accessorKey: "_count.contentInteractions",
      header: "Interactions",
      cell: ({ row }) => row.original._count.contentInteractions,
    },
    {
      accessorKey: "_count.UserTopicCompletion",
      header: "Completed",
      cell: ({ row }) => row.original._count.UserTopicCompletion,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const user = row.original;
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.push(`/profile/${user.username}`)}
              >
                <UserIcon className="mr-2 h-4 w-4" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEdit(user)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Details
              </DropdownMenuItem>
              {user.role !== 'ADMIN' && (
                <DropdownMenuItem
                  onClick={() => handleRoleChange(user.id, 'ADMIN')}
                  disabled={processingRoleId === user.id}
                >
                  {processingRoleId === user.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="mr-2 h-4 w-4" />
                  )}
                  Make Admin
                </DropdownMenuItem>
              )}
              {user.role === 'ADMIN' && (
                <DropdownMenuItem
                  onClick={() => handleRoleChange(user.id, 'USER')}
                  disabled={processingRoleId === user.id}
                >
                  {processingRoleId === user.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Ban className="mr-2 h-4 w-4" />
                  )}
                  Remove Admin
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleDelete(user.id, user.clerkId)}
                disabled={deletingId === user.id}
              >
                {deletingId === user.id ? 
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> :
                  <Trash2 className="mr-2 h-4 w-4" />
                }
                Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {selectedUsers.length > 0 && (
        <div className="flex items-center gap-2">
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleBulkDelete}
            disabled={isBulkDeleting}
            className="flex items-center gap-1"
          >
            {isBulkDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete Selected ({selectedUsers.length})
          </Button>
        </div>
      )}
      
      <DataTable 
        columns={columns} 
        data={users} 
        searchKey="username"
        searchPlaceholder="Search users..."
        pageSize={25}
        onRowSelection={handleRowSelectionChange}
      />

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && handleCloseEdit()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update the user's information. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseEdit}
                  className="gap-1"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="gap-1"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
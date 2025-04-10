'use client';

import * as React from 'react';
import { 
  ColumnDef, 
  flexRender, 
  getCoreRowModel, 
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable
} from '@tanstack/react-table';
import { ChevronDown, ExternalLink, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SearchResult {
  title: string;
  url: string;
  description: string;
  type: string;
  source: string;
}

interface SearchResultsTableProps {
  results: SearchResult[];
  topicId?: string;
  runId?: string;
  onCacheDeleted?: () => void;
}

export function SearchResultsTable({ 
  results, 
  topicId,
  runId,
  onCacheDeleted
}: SearchResultsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [addedContent, setAddedContent] = useState<Record<string, boolean>>({});
  
  const handleAddContent = async (result: SearchResult, index: number) => {
    if (!topicId) {
      toast({
        title: 'Error',
        description: 'No topic selected to add content to',
        variant: 'destructive',
      });
      return;
    }
    
    // Set loading state for this specific item
    setLoading(prev => ({ ...prev, [index]: true }));
    
    try {
      const response = await fetch('/api/admin/content/add-from-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicId,
          content: {
            title: result.title,
            url: result.url,
            description: result.description,
            type: result.type.toUpperCase(),
          },
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Mark this content as added
        setAddedContent(prev => ({ ...prev, [index]: true }));
        
        toast({
          title: 'Content added',
          description: data.message || 'Content has been added to the topic successfully',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Failed to add content',
          description: data.error || 'An error occurred',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error adding content:', error);
      toast({
        title: 'Error',
        description: 'Failed to add content to topic',
        variant: 'destructive',
      });
    } finally {
      // Clear loading state
      setLoading(prev => ({ ...prev, [index]: false }));
    }
  };
  
  const handleAddAllContent = async () => {
    if (!topicId) {
      toast({
        title: 'Error',
        description: 'No topic selected to add content to',
        variant: 'destructive',
      });
      return;
    }
    
    // Set global loading state
    setLoading(prev => ({ ...prev, all: true }));
    
    try {
      const response = await fetch('/api/admin/content/add-bulk-from-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicId,
          contents: results.map(result => ({
            title: result.title,
            url: result.url,
            description: result.description,
            type: result.type.toUpperCase(),
          })),
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Mark all content as added
        const allAdded: Record<string, boolean> = {};
        results.forEach((_, index) => {
          allAdded[index] = true;
        });
        setAddedContent(allAdded);
        
        toast({
          title: 'All content added',
          description: `${data.added} items were added to the topic successfully`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Failed to add content',
          description: data.error || 'An error occurred',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error adding all content:', error);
      toast({
        title: 'Error',
        description: 'Failed to add content to topic',
        variant: 'destructive',
      });
    } finally {
      // Clear loading state
      setLoading(prev => ({ ...prev, all: false }));
    }
  };
  
  const handleDeleteCache = async () => {
    if (!runId) {
      toast({
        title: 'Error',
        description: 'No cache entry to delete',
        variant: 'destructive',
      });
      return;
    }
    
    // Set loading state
    setLoading(prev => ({ ...prev, deleteCache: true }));
    
    try {
      const response = await fetch(`/api/admin/scraper/delete-cache?runId=${runId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Cache deleted',
          description: data.message || 'Cache entry has been deleted successfully',
          variant: 'default',
        });
        
        // Call the callback to refresh UI
        if (onCacheDeleted) {
          onCacheDeleted();
        }
      } else {
        toast({
          title: 'Failed to delete cache',
          description: data.error || 'An error occurred',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting cache:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete cache entry',
        variant: 'destructive',
      });
    } finally {
      // Clear loading state
      setLoading(prev => ({ ...prev, deleteCache: false }));
    }
  };
  
  // Define columns for the table
  const columns: ColumnDef<SearchResult>[] = [
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <div 
          className="flex items-center cursor-pointer"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </div>
      ),
      cell: ({ row }) => {
        const title = row.getValue('title') as string;
        const url = row.original.url;
        
        return (
          <div className="flex flex-col">
            <div className="font-medium line-clamp-2">{title}</div>
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-xs text-blue-500 hover:underline flex items-center mt-1 w-fit"
            >
              {url.length > 50 ? url.substring(0, 50) + '...' : url}
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </div>
        );
      },
    },
    {
      accessorKey: 'description',
      header: "Description",
      cell: ({ row }) => {
        const description = row.getValue('description') as string;
        return (
          <div className="line-clamp-2 text-sm">
            {description || "No description available"}
          </div>
        );
      },
    },
    {
      accessorKey: 'type',
      header: ({ column }) => (
        <div 
          className="flex items-center cursor-pointer"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Type
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </div>
      ),
      cell: ({ row }) => {
        const type = row.getValue('type') as string;
        
        // Define badge variants based on type
        let variant: 'default' | 'secondary' | 'outline' | 'destructive' = 'secondary';
        
        switch(type) {
          case 'COURSE':
            variant = 'default';
            break;
          case 'VIDEO':
            variant = 'outline';
            break;
          case 'ARTICLE':
            variant = 'secondary';
            break;
          default:
            variant = 'outline';
        }
        
        return <Badge variant={variant}>{type}</Badge>;
      },
      size: 100,
    },
    {
      accessorKey: 'source',
      header: ({ column }) => (
        <div 
          className="flex items-center cursor-pointer"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Source
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </div>
      ),
      cell: ({ row }) => {
        const source = row.getValue('source') as string;
        return <div className="text-sm">{source}</div>;
      },
      size: 120,
    },
    {
      id: 'actions',
      header: "Actions",
      cell: ({ row }) => {
        const rowIndex = row.index;
        const isLoading = loading[rowIndex];
        const isAdded = addedContent[rowIndex];
        
        return (
          <div className="flex items-center justify-end space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0"
                    onClick={() => window.open(row.original.url, '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span className="sr-only">Open</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Open in new tab</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant={isAdded ? "outline" : "default"}
                    className="h-8 p-0 px-2"
                    onClick={() => handleAddContent(row.original, rowIndex)}
                    disabled={isLoading || isAdded || !topicId}
                  >
                    <PlusCircle className="h-4 w-4 mr-1" />
                    {isAdded ? "Added" : "Add"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isAdded ? "Content added to topic" : "Add content to topic"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
      size: 100,
    },
  ];

  const table = useReactTable({
    data: results,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} style={{ width: header.getSize() }}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} result(s) found.
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium mx-2">
                Page {table.getState().pagination.pageIndex + 1} of{' '}
                {table.getPageCount()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
      
      {/* Footer with bulk actions */}
      {table.getRowModel().rows?.length > 0 && (
        <CardFooter className="border-t p-4 flex justify-between">
          <div className="flex space-x-2">
            {topicId && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleAddAllContent}
                disabled={loading.all || Object.keys(addedContent).length === results.length}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add All to Topic
              </Button>
            )}
          </div>
          
          {runId && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDeleteCache}
              disabled={loading.deleteCache}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Cache Entry
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
"use client";

import * as React from "react";
import { Plus, RefreshCw, Loader2, Search, X } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export type RoadmapOption = {
  value: string;
  label: string;
};

interface AvailableRoadmapsDialogProps {
  availableRoadmaps: RoadmapOption[];
  onSelectRoadmap: (roadmapId: string) => void;
  onRefresh: () => Promise<void>;
  loading?: boolean;
  className?: string;
}

export function AvailableRoadmapsDialog({
  availableRoadmaps,
  onSelectRoadmap,
  onRefresh,
  loading = false,
  className,
}: AvailableRoadmapsDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");

  // Log available roadmaps for debugging
  React.useEffect(() => {
    console.log("Available unlinked roadmaps:", availableRoadmaps);
  }, [availableRoadmaps]);

  const handleRefresh = async () => {
    console.log("Refresh button clicked");
    setIsRefreshing(true);
    try {
      await onRefresh();
      console.log("Refreshed available roadmaps");
    } catch (error) {
      console.error("Failed to refresh roadmaps:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredRoadmaps = availableRoadmaps.filter((roadmap) =>
    roadmap.label.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleAdd = (roadmapId: string) => {
    console.log("Selected roadmap:", roadmapId);
    onSelectRoadmap(roadmapId);
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn("w-full justify-start gap-1", className)}
        onClick={() => setOpen(true)}
        disabled={loading}
      >
        <Plus className="h-4 w-4" />
        <span>
          Add Roadmap {availableRoadmaps.length > 0 && `(${availableRoadmaps.length} available)`}
        </span>
        {loading && <Loader2 className="h-4 w-4 ml-auto animate-spin" />}
      </Button>

      <Dialog open={open} onOpenChange={(isOpen) => {
        console.log("Dialog open state changing to:", isOpen);
        setOpen(isOpen);
        if (isOpen) {
          setSearchValue("");
        }
      }}>
        <DialogContent className="sm:max-w-[525px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Add Roadmaps</DialogTitle>
            <DialogDescription>
              Select roadmaps to link to this topic.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center border rounded-md px-3 py-1 mb-2">
            <Search className="h-4 w-4 mr-2 text-muted-foreground" />
            <input
              className="flex-1 bg-transparent outline-none text-sm"
              placeholder="Search roadmaps..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            {searchValue && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setSearchValue("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-sm text-muted-foreground">
              Available roadmaps ({filteredRoadmaps.length})
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs flex items-center gap-1"
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              type="button"
            >
              {isRefreshing ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Refresh
            </Button>
          </div>

          {loading || isRefreshing ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading roadmaps...</span>
            </div>
          ) : filteredRoadmaps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchValue ? "No matching roadmaps found" : "No roadmaps available to link"}
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-1">
                {filteredRoadmaps.map((roadmap) => (
                  <div
                    key={roadmap.value}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent cursor-pointer"
                    onClick={() => handleAdd(roadmap.value)}
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-muted-foreground" />
                      <span>{roadmap.label}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdd(roadmap.value);
                      }}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface LinkedRoadmapsSelectProps {
  linkedRoadmaps: RoadmapOption[];
  selectedRoadmapIds: string[];
  onRemoveRoadmap: (roadmapId: string) => void;
  placeholder?: string;
  className?: string;
}

export function LinkedRoadmapsSelect({
  linkedRoadmaps,
  selectedRoadmapIds,
  onRemoveRoadmap,
  placeholder = "No roadmaps linked",
  className
}: LinkedRoadmapsSelectProps) {
  // Log linked roadmaps for debugging
  React.useEffect(() => {
    console.log("Linked roadmaps:", linkedRoadmaps);
    console.log("Selected roadmap IDs:", selectedRoadmapIds);
  }, [linkedRoadmaps, selectedRoadmapIds]);

  // Filter to only show selected roadmaps with proper label
  const displayedRoadmaps = linkedRoadmaps.filter(roadmap => 
    selectedRoadmapIds.includes(roadmap.value)
  );

  return (
    <div 
      className={cn(
        "min-h-10 w-full rounded-md border border-input bg-background px-3 py-2", 
        className
      )}
    >
      <div className="flex gap-1 flex-wrap">
        {displayedRoadmaps.length === 0 && (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        {displayedRoadmaps.map((roadmap) => (
          <div
            key={roadmap.value}
            className="flex items-center gap-1 bg-secondary text-secondary-foreground rounded-md px-2 py-1 text-sm"
          >
            {roadmap.label}
            <button
              onClick={() => onRemoveRoadmap(roadmap.value)}
              className="text-secondary-foreground/70 hover:text-secondary-foreground"
              type="button"
            >
              <span className="sr-only">Remove</span>
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

interface RoadmapSelectorProps {
  allRoadmaps: RoadmapOption[];
  selectedRoadmapIds: string[];
  onChange: (selected: string[]) => void;
  onRefresh: () => Promise<void>;
  loading?: boolean;
  className?: string;
}

export function RoadmapSelector({
  allRoadmaps,
  selectedRoadmapIds,
  onChange,
  onRefresh,
  loading = false,
  className,
}: RoadmapSelectorProps) {
  // Separate roadmaps into linked and available
  const linkedRoadmaps = React.useMemo(() => 
    allRoadmaps.filter(roadmap => 
      selectedRoadmapIds.includes(roadmap.value)
    ), [allRoadmaps, selectedRoadmapIds]
  );
  
  const availableRoadmaps = React.useMemo(() => 
    allRoadmaps.filter(roadmap => 
      !selectedRoadmapIds.includes(roadmap.value)
    ), [allRoadmaps, selectedRoadmapIds]
  );

  React.useEffect(() => {
    console.log("RoadmapSelector - All roadmaps:", allRoadmaps);
    console.log("RoadmapSelector - Selected IDs:", selectedRoadmapIds);
    console.log("RoadmapSelector - Available roadmaps:", availableRoadmaps);
    console.log("RoadmapSelector - Linked roadmaps:", linkedRoadmaps);
  }, [allRoadmaps, selectedRoadmapIds, availableRoadmaps, linkedRoadmaps]);

  const handleAddRoadmap = (roadmapId: string) => {
    console.log("Adding roadmap:", roadmapId);
    onChange([...selectedRoadmapIds, roadmapId]);
  };

  const handleRemoveRoadmap = (roadmapId: string) => {
    console.log("Removing roadmap:", roadmapId);
    onChange(selectedRoadmapIds.filter(id => id !== roadmapId));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <LinkedRoadmapsSelect
        linkedRoadmaps={linkedRoadmaps}
        selectedRoadmapIds={selectedRoadmapIds}
        onRemoveRoadmap={handleRemoveRoadmap}
      />
      <AvailableRoadmapsDialog
        availableRoadmaps={availableRoadmaps}
        onSelectRoadmap={handleAddRoadmap}
        onRefresh={onRefresh}
        loading={loading}
      />
    </div>
  );
}
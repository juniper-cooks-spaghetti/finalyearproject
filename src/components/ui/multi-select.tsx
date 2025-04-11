"use client";

import * as React from "react";
import { X, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type OptionType = {
  value: string;
  label: string;
};

interface MultiSelectProps {
  options: OptionType[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  loading?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options",
  className,
  loading = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  // Debug logging
  React.useEffect(() => {
    console.log("MultiSelect options:", options);
    console.log("MultiSelect selected:", selected);
  }, [options, selected]);

  const handleUnselect = (item: string) => {
    console.log("Unselecting item:", item);
    onChange(selected.filter((i) => i !== item));
  };

  const handleSelect = (value: string) => {
    console.log("Selecting/toggling item:", value);
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  // Find selected item labels
  const selectedLabels = selected.map((value) => {
    const option = options.find((option) => option.value === value);
    return option?.label || value;
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("min-h-10 w-full justify-between", className)}
          onClick={() => {
            console.log("Popover trigger clicked");
            setOpen(!open);
          }}
          disabled={loading}
        >
          <div className="flex gap-1 flex-wrap">
            {selected.length === 0 && placeholder}
            {selectedLabels.map((label) => (
              <Badge
                variant="secondary"
                key={label}
                className="mr-1 mb-1"
                onClick={(e) => {
                  e.stopPropagation();
                  const value = options.find((option) => option.label === label)?.value;
                  if (value) handleUnselect(value);
                }}
              >
                {label}
                <button
                  className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const value = options.find((option) => option.label === label)?.value;
                      if (value) handleUnselect(value);
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const value = options.find((option) => option.label === label)?.value;
                    if (value) handleUnselect(value);
                  }}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            ))}
          </div>
          {loading ? (
            <Loader2 className="h-4 w-4 shrink-0 opacity-50 animate-spin" />
          ) : (
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search options..." />
          <CommandEmpty>No options found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {options.map((option) => (
              <CommandItem
                key={option.value}
                onSelect={() => {
                  console.log("Item selected from dropdown:", option.value);
                  handleSelect(option.value);
                  // Don't close the popover after selection for multi-select behavior
                  // Just prevent the default CommandItem behavior
                  setTimeout(() => setOpen(true), 0);
                }}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      selected.includes(option.value) ? "bg-primary text-primary-foreground" : "opacity-50"
                    )}
                  >
                    {selected.includes(option.value) && <Check className="h-3 w-3" />}
                  </div>
                  {option.label}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
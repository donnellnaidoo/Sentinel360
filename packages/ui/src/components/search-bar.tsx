"use client";

import { cn } from "@Sentinel360/ui/lib/utils";
import { Filter, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface SearchFilter {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  filters?: SearchFilter[];
  activeFilters?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  onClear?: () => void;
  debounceMs?: number;
  className?: string;
}

function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  filters,
  activeFilters = {},
  onFilterChange,
  onClear,
  debounceMs = 300,
  className,
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  const [showFilters, setShowFilters] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(localValue);
    }, debounceMs);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [localValue, onChange, debounceMs]);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div data-slot="search-bar" className={cn("relative", className)} ref={filterRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={placeholder}
          className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-8 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
          aria-label={placeholder}
        />
        {localValue && (
          <button
            type="button"
            onClick={() => {
              setLocalValue("");
              onClear?.();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {filters && filters.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "mt-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors",
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {Object.keys(activeFilters).length > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                {Object.keys(activeFilters).length}
              </span>
            )}
          </button>
          {showFilters && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border bg-popover p-3 shadow-lg">
              <div className="space-y-3">
                {filters.map((filter) => (
                  <div key={filter.key}>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      {filter.label}
                    </label>
                    <select
                      value={activeFilters[filter.key] || ""}
                      onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus-visible:border-ring"
                    >
                      <option value="">All</option>
                      {filter.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export { SearchBar, type SearchFilter };

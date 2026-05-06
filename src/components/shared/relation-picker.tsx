"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RelationOption {
  id: string;
  label: string;
  sublabel?: string;
  tag?: string;
}

interface RelationPickerProps {
  value: string | null;
  onChange: (id: string | null) => void;
  options: RelationOption[];
  placeholder?: string;
  loading?: boolean;
  className?: string;
  onAdd?: (name: string) => Promise<RelationOption | null>;
  addLabel?: string;
  onSearch?: (query: string) => Promise<RelationOption[]>;
  selectedLabel?: string;
}

interface MultiRelationPickerProps {
  value: string[];
  onChange: (ids: string[]) => void;
  options: RelationOption[];
  placeholder?: string;
  loading?: boolean;
  className?: string;
  onAdd?: (name: string) => Promise<RelationOption | null>;
  addLabel?: string;
}

export function RelationPicker({
  value,
  onChange,
  options,
  placeholder = "Select...",
  loading,
  className,
  onAdd,
  addLabel = "Add",
  onSearch,
  selectedLabel,
}: RelationPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [asyncResults, setAsyncResults] = useState<RelationOption[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Stable ref for onSearch so the effect doesn't re-fire on function identity changes
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  // Async search effect
  useEffect(() => {
    if (!onSearchRef.current || !open) return;
    if (!query || query.length < 2) {
      setAsyncResults([]);
      return;
    }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await onSearchRef.current!(query);
        setAsyncResults(results);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(searchTimeout.current);
  }, [query, open]);

  const isAsync = !!onSearch;
  const filtered = isAsync
    ? asyncResults
    : options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          o.sublabel?.toLowerCase().includes(query.toLowerCase())
      );

  const selected = options.find((o) => o.id === value);
  const displayLabel = selected?.label || selectedLabel;

  return (
    <div ref={ref} className={cn("relative", open && "z-50", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-left hover:border-zinc-300 transition-colors"
      >
        <span className={displayLabel ? "text-black" : "text-zinc-400"}>
          {displayLabel || placeholder}
        </span>
        {value ? (
          <X
            className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-600"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
          />
        ) : null}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[280px] rounded-md border border-zinc-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-zinc-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {loading || searching ? (
              <p className="px-3 py-2 text-xs text-zinc-400">{searching ? "Searching..." : "Loading..."}</p>
            ) : isAsync && query.length < 2 ? (
              <p className="px-3 py-2 text-xs text-zinc-400">Type at least 2 characters to search...</p>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-2">
                <p className="text-xs text-zinc-400">No results</p>
                {onAdd && query.trim() && (
                  <button
                    type="button"
                    disabled={adding}
                    onClick={async () => {
                      setAdding(true);
                      try {
                        const result = await onAdd(query.trim());
                        if (result) {
                          onChange(result.id);
                          setOpen(false);
                          setQuery("");
                        }
                      } finally {
                        setAdding(false);
                      }
                    }}
                    className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  >
                    {adding ? "Adding..." : `${addLabel} "${query.trim()}"`}
                  </button>
                )}
              </div>
            ) : (
              <>
                {filtered.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      onChange(o.id);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-zinc-50 transition-colors",
                      o.id === value && "bg-zinc-50"
                    )}
                  >
                    <span className="flex-1 text-left">
                      <span className="text-black">{o.label}</span>
                      {o.tag && (
                        <span className="ml-1.5 inline-flex rounded bg-amber-100 px-1.5 py-0.5 text-2xs font-medium text-amber-700">
                          {o.tag}
                        </span>
                      )}
                      {o.sublabel && (
                        <span className="ml-2 text-xs text-zinc-400">
                          {o.sublabel}
                        </span>
                      )}
                    </span>
                    {o.id === value && (
                      <Check className="h-3.5 w-3.5 text-black" />
                    )}
                  </button>
                ))}
                {onAdd && query.trim() && !filtered.some((o) => o.label.toLowerCase() === query.trim().toLowerCase()) && (
                  <button
                    type="button"
                    disabled={adding}
                    onClick={async () => {
                      setAdding(true);
                      try {
                        const result = await onAdd(query.trim());
                        if (result) {
                          onChange(result.id);
                          setOpen(false);
                          setQuery("");
                        }
                      } finally {
                        setAdding(false);
                      }
                    }}
                    className="flex w-full items-center gap-2 border-t border-zinc-100 px-3 py-2 text-sm font-medium text-black hover:bg-zinc-50 transition-colors"
                  >
                    <span className="text-xs">+ {addLabel} &ldquo;{query.trim()}&rdquo;</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function MultiRelationPicker({
  value,
  onChange,
  options,
  placeholder = "Select...",
  loading,
  className,
  onAdd,
  addLabel = "Create",
}: MultiRelationPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(query.toLowerCase()) ||
      o.sublabel?.toLowerCase().includes(query.toLowerCase())
  );

  const selectedItems = options.filter((o) => value.includes(o.id));

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  }

  return (
    <div ref={ref} className={cn("relative", open && "z-50", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full min-h-[34px] flex-wrap items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-left hover:border-zinc-300 transition-colors"
      >
        {selectedItems.length > 0 ? (
          selectedItems.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-black"
            >
              {item.label}
              <X
                className="h-3 w-3 text-zinc-400 hover:text-zinc-600"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(item.id);
                }}
              />
            </span>
          ))
        ) : (
          <span className="text-zinc-400 px-1">{placeholder}</span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[280px] rounded-md border border-zinc-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-zinc-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {loading ? (
              <p className="px-3 py-2 text-xs text-zinc-400">Loading...</p>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-2">
                <p className="text-xs text-zinc-400">No results</p>
                {onAdd && query.trim() && (
                  <button
                    type="button"
                    disabled={adding}
                    onClick={async () => {
                      setAdding(true);
                      try {
                        const result = await onAdd(query.trim());
                        if (result) {
                          onChange([...value, result.id]);
                          setQuery("");
                        }
                      } finally {
                        setAdding(false);
                      }
                    }}
                    className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  >
                    {adding ? "Creating..." : `${addLabel} "${query.trim()}"`}
                  </button>
                )}
              </div>
            ) : (
              <>
                {filtered.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggle(o.id)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-zinc-50 transition-colors",
                      value.includes(o.id) && "bg-zinc-50"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                        value.includes(o.id)
                          ? "border-black bg-black"
                          : "border-zinc-300"
                      )}
                    >
                      {value.includes(o.id) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <span className="flex-1 text-left">
                      <span className="text-black">{o.label}</span>
                      {o.sublabel && (
                        <span className="ml-2 text-xs text-zinc-400">
                          {o.sublabel}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
                {onAdd && query.trim() && !filtered.some((o) => o.label.toLowerCase() === query.trim().toLowerCase()) && (
                  <button
                    type="button"
                    disabled={adding}
                    onClick={async () => {
                      setAdding(true);
                      try {
                        const result = await onAdd(query.trim());
                        if (result) {
                          onChange([...value, result.id]);
                          setQuery("");
                        }
                      } finally {
                        setAdding(false);
                      }
                    }}
                    className="flex w-full items-center gap-2 border-t border-zinc-100 px-3 py-2 text-sm font-medium text-black hover:bg-zinc-50 transition-colors"
                  >
                    <span className="text-xs">+ {addLabel} &ldquo;{query.trim()}&rdquo;</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

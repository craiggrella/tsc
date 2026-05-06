"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { invalidatePicklistCache } from "@/lib/picklists";

interface PicklistSelectProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  /** Picklist table name (e.g., "list_contact_types"). Enables inline add + delete. */
  manageTable?: string;
  className?: string;
  disabled?: boolean;
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

/**
 * Drop-in replacement for the native <select>. When `manageTable` is set, the
 * dropdown also includes:
 *   - a search/filter input
 *   - an inline "+ Create" affordance when the typed label has no match
 *   - a delete affordance on each option (only visible after the user starts typing)
 *
 * Empty picklists open straight to the search/add input — no scrolling required
 * even on huge lists, because the add option only appears when the user types.
 */
export function PicklistSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  manageTable,
  className,
  disabled,
}: PicklistSelectProps) {
  const [open, setOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setPendingDelete(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleAdd() {
    const trimmed = newLabel.trim();
    if (!trimmed || !manageTable) return;
    const slug = slugify(trimmed);
    if (!slug) {
      setAddError("Invalid label.");
      return;
    }
    if (options.some((o) => o.value === slug)) {
      setAddError("Already exists.");
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      const maxOrder = options.length;
      const { error } = await supabase
        .from(manageTable)
        .insert({ value: slug, label: trimmed, sort_order: maxOrder });
      if (error) {
        setAddError(error.message);
        return;
      }
      invalidatePicklistCache(manageTable);
      onChange(slug);
      setNewLabel("");
      setOpen(false);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(opt: { value: string; label: string }) {
    if (!manageTable) return;
    if (pendingDelete !== opt.value) {
      setPendingDelete(opt.value);
      return;
    }
    // Second click — actually delete
    const { error } = await supabase
      .from(manageTable)
      .delete()
      .eq("value", opt.value);
    if (error) {
      setAddError(error.message);
      return;
    }
    invalidatePicklistCache(manageTable);
    if (value === opt.value) onChange(null);
    setPendingDelete(null);
  }

  const selected = options.find((o) => o.value === value);
  const filtered = newLabel.trim()
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(newLabel.toLowerCase().trim())
      )
    : options;
  const showAddOption =
    manageTable &&
    newLabel.trim().length > 0 &&
    !options.some((o) => o.label.toLowerCase() === newLabel.trim().toLowerCase());
  // Show inline edit/delete affordance only when user has typed (or list is empty)
  const showRowDelete = !!manageTable && !!newLabel.trim();

  return (
    <div ref={ref} className={cn("relative", open && "z-50", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm outline-none hover:border-zinc-300 focus:border-zinc-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left",
          selected ? "text-black" : "text-zinc-400"
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <span className="flex items-center gap-1 flex-shrink-0 ml-2">
          {selected && !disabled && (
            <X
              className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-700"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
            />
          )}
          <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
        </span>
      </button>
      {open && (
        <div className="absolute left-0 z-50 mt-1 min-w-full w-max max-w-[360px] rounded-md border border-zinc-200 bg-white shadow-lg flex flex-col">
          {manageTable && (
            <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2">
              <input
                autoFocus
                type="text"
                value={newLabel}
                onChange={(e) => {
                  setNewLabel(e.target.value);
                  setAddError(null);
                  setPendingDelete(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && showAddOption && !adding) {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                placeholder={
                  options.length === 0 ? "Type to add the first option..." : "Type to search or add..."
                }
                className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
              />
            </div>
          )}
          {filtered.length > 0 && (
            <div className="flex-1 overflow-y-auto py-1 max-h-72">
              {filtered.map((opt) => (
                <div
                  key={opt.value}
                  className={cn(
                    "group flex items-center hover:bg-zinc-50",
                    opt.value === value && "bg-zinc-50"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setNewLabel("");
                      setOpen(false);
                    }}
                    className={cn(
                      "flex-1 flex items-center px-3 py-1.5 text-sm text-left truncate",
                      opt.value === value ? "text-black font-medium" : "text-zinc-700"
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                  </button>
                  {showRowDelete && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(opt);
                      }}
                      title={
                        pendingDelete === opt.value
                          ? "Click again to confirm"
                          : "Delete from picklist"
                      }
                      className={cn(
                        "px-2 py-1.5 transition-colors",
                        pendingDelete === opt.value
                          ? "text-red-600"
                          : "text-zinc-300 hover:text-red-500"
                      )}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {showAddOption && (
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding}
              className="flex w-full items-center gap-1.5 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 hover:text-black border-t border-zinc-200 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5 text-zinc-500" />
              <span>
                {adding ? "Adding..." : `Create "${newLabel.trim()}"`}
              </span>
            </button>
          )}
          {addError && (
            <p className="px-3 py-1.5 text-xs text-red-500 border-t border-zinc-200">
              {addError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PicklistSelectProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  /** Picklist table name (e.g., "list_contact_types"). Enables the "Manage list" footer. */
  manageTable?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Drop-in replacement for the native <select> for picklist-backed dropdowns.
 * Renders a custom popover so we can include a "Manage list" footer that links
 * to the settings page with the relevant picklist auto-expanded.
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm outline-none hover:border-zinc-300 focus:border-zinc-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left",
          selected ? "text-black" : "text-zinc-400",
          className
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0 ml-2" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 rounded-md border border-zinc-200 bg-white shadow-lg py-1 max-h-72 overflow-y-auto">
          {placeholder && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center px-3 py-1.5 text-sm hover:bg-zinc-50 text-left",
                !selected ? "text-black font-medium" : "text-zinc-400"
              )}
            >
              {placeholder}
            </button>
          )}
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center px-3 py-1.5 text-sm hover:bg-zinc-50 text-left",
                opt.value === value ? "text-black font-medium bg-zinc-50" : "text-zinc-700"
              )}
            >
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
          {manageTable && (
            <>
              <div className="my-1 mx-auto w-[90%] border-t border-zinc-200" />
              <Link
                href={`/settings?tab=picklists&picklist=${manageTable}`}
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50 hover:text-black"
              >
                <Settings2 className="h-3 w-3" />
                Manage list
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}

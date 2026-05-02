"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

interface MultiFilterDropdownProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}

export function MultiFilterDropdown({
  label,
  options,
  selected,
  onChange,
}: MultiFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const display =
    selected.length === 0
      ? `${label}: All`
      : `${label}: ${selected.length}`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:border-zinc-300 transition-colors whitespace-nowrap"
      >
        {display} <span className="ml-1 text-zinc-400">&#9662;</span>
      </button>
      {open && (
        <div className="absolute left-0 z-50 mt-1 w-48 rounded-md border border-zinc-200 bg-white shadow-lg py-1 max-h-72 overflow-y-auto">
          <button
            onClick={() => onChange([])}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-zinc-50 ${
              selected.length === 0 ? "text-black font-medium" : "text-zinc-500"
            }`}
          >
            All
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(
                  selected.includes(opt.value)
                    ? selected.filter((v) => v !== opt.value)
                    : [...selected, opt.value]
                );
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-zinc-50 text-left"
            >
              <div
                className={`h-3.5 w-3.5 rounded border flex-shrink-0 ${
                  selected.includes(opt.value)
                    ? "border-black bg-black"
                    : "border-zinc-300"
                } flex items-center justify-center`}
              >
                {selected.includes(opt.value) && (
                  <Check className="h-2.5 w-2.5 text-white" />
                )}
              </div>
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

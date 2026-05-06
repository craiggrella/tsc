"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PicklistSelect } from "./picklist-select";

interface DetailPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  width?: "md" | "lg" | "xl";
}

const widthMap = {
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

export function DetailPanel({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  width = "lg",
}: DetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-zinc-200 bg-white shadow-xl",
          widthMap[width],
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <h2 className="text-base font-semibold text-black">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-zinc-200 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}

// Reusable form field wrapper
interface FieldProps {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, children, className }: FieldProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <label className="block text-xs font-medium text-zinc-500">
        {label}
      </label>
      {children}
    </div>
  );
}

// Standard text input for forms
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-black outline-none placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-400 transition-colors",
        className
      )}
      {...props}
    />
  );
}

// Standard select for forms
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
  placeholder?: string;
  /** When set, renders a custom dropdown with inline search + add. */
  manageTable?: string;
}

export function Select({
  options,
  placeholder,
  className,
  manageTable,
  value,
  onChange,
  disabled,
  ...props
}: SelectProps) {
  // Picklist-backed → render PicklistSelect with onChange shim so existing
  // event-style consumers keep working unchanged.
  if (manageTable) {
    return (
      <PicklistSelect
        value={(value as string | undefined) ?? null}
        onChange={(v) => {
          onChange?.({
            target: { value: v ?? "" },
            currentTarget: { value: v ?? "" },
          } as unknown as React.ChangeEvent<HTMLSelectElement>);
        }}
        options={options}
        placeholder={placeholder}
        manageTable={manageTable}
        className={className}
        disabled={disabled}
      />
    );
  }
  return (
    <select
      className={cn(
        "w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-black outline-none hover:border-zinc-300 focus:border-zinc-400 transition-colors",
        className
      )}
      value={value}
      onChange={onChange}
      disabled={disabled}
      {...props}
    >
      {placeholder && (
        <option value="">{placeholder}</option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// Textarea for forms
interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-black outline-none placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-400 transition-colors resize-y",
        className
      )}
      rows={3}
      {...props}
    />
  );
}

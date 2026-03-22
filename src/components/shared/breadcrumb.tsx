"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";

interface BreadcrumbProps {
  fallbackHref: string;
  fallbackLabel: string;
  currentLabel: string;
}

export function Breadcrumb({
  fallbackHref,
  fallbackLabel,
  currentLabel,
}: BreadcrumbProps) {
  const searchParams = useSearchParams();
  const fromHref = searchParams.get("from");
  const fromLabel = searchParams.get("fromLabel");

  return (
    <div className="flex items-center gap-1.5 text-sm mb-4">
      <Link
        href={fromHref || fallbackHref}
        className="inline-flex items-center gap-1 text-zinc-500 hover:text-black transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {fromLabel || fallbackLabel}
      </Link>
      <ChevronRight className="h-3 w-3 text-zinc-300" />
      <span className="text-zinc-700 font-medium truncate max-w-[300px]">
        {currentLabel}
      </span>
    </div>
  );
}

// Helper to build a "from" query string for cross-entity links
export function buildFromParams(currentPath: string, currentLabel: string): string {
  return `from=${encodeURIComponent(currentPath)}&fromLabel=${encodeURIComponent(currentLabel)}`;
}

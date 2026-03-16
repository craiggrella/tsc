"use client";

import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  // Call statuses
  to_call: "bg-amber-50 text-amber-700 border-amber-200",
  incoming: "bg-blue-50 text-blue-700 border-blue-200",
  left_word: "bg-orange-50 text-orange-700 border-orange-200",
  returning: "bg-purple-50 text-purple-700 border-purple-200",
  connected: "bg-emerald-50 text-emerald-700 border-emerald-200",

  // Submission statuses
  need_to_send: "bg-amber-50 text-amber-700 border-amber-200",
  sent: "bg-blue-50 text-blue-700 border-blue-200",

  // Meeting statuses
  need_to_set: "bg-amber-50 text-amber-700 border-amber-200",
  need_to_reschedule: "bg-orange-50 text-orange-700 border-orange-200",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-zinc-50 text-zinc-500 border-zinc-200",

  // Project statuses
  rumored: "bg-zinc-50 text-zinc-500 border-zinc-200",
  development: "bg-amber-50 text-amber-700 border-amber-200",
  pilot: "bg-blue-50 text-blue-700 border-blue-200",
  picked_up: "bg-emerald-50 text-emerald-700 border-emerald-200",
  current: "bg-emerald-50 text-emerald-700 border-emerald-200",
  on_the_bubble: "bg-orange-50 text-orange-700 border-orange-200",

  // Material statuses
  not_yet_reviewed: "bg-zinc-50 text-zinc-500 border-zinc-200",
  in_review: "bg-blue-50 text-blue-700 border-blue-200",
  coverage_available: "bg-purple-50 text-purple-700 border-purple-200",
  notes_given: "bg-amber-50 text-amber-700 border-amber-200",
  editing: "bg-orange-50 text-orange-700 border-orange-200",
  final_draft: "bg-emerald-50 text-emerald-700 border-emerald-200",

  // Priority
  high: "bg-red-50 text-red-700 border-red-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-zinc-50 text-zinc-500 border-zinc-200",

  // Response
  love: "bg-emerald-50 text-emerald-700 border-emerald-200",
  like: "bg-blue-50 text-blue-700 border-blue-200",
  meh: "bg-amber-50 text-amber-700 border-amber-200",
  hate: "bg-red-50 text-red-700 border-red-200",
};

const LABELS: Record<string, string> = {
  to_call: "To Call",
  incoming: "Incoming",
  left_word: "Left Word",
  returning: "Returning",
  connected: "Connected",
  need_to_send: "Need to Send",
  sent: "Sent",
  need_to_set: "Need to Set",
  need_to_reschedule: "Reschedule",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  rumored: "Rumored",
  development: "Development",
  pilot: "Pilot",
  picked_up: "Picked Up",
  current: "Current",
  on_the_bubble: "On the Bubble",
  not_yet_reviewed: "Not Reviewed",
  in_review: "In Review",
  coverage_available: "Coverage Available",
  notes_given: "Notes Given",
  editing: "Editing",
  final_draft: "Final Draft",
  high: "High",
  medium: "Medium",
  low: "Low",
  love: "Love",
  like: "Like",
  meh: "Meh",
  hate: "Hate",
};

interface StatusBadgeProps {
  status: string | null;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  if (!status) return null;

  const colors = STATUS_COLORS[status] || "bg-zinc-50 text-zinc-500 border-zinc-200";
  const label = LABELS[status] || status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        colors,
        className
      )}
    >
      {label}
    </span>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Loader2, Undo2, Check, AlertCircle } from "lucide-react";

interface SavedIndicatorProps {
  saving: boolean;
  savedAt: Date | null;
  error?: string | null;
  hasUndo: boolean;
  onUndo: () => void;
}

function formatRelative(date: Date | null) {
  if (!date) return "";
  const ms = Date.now() - date.getTime();
  const s = Math.floor(ms / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return date.toLocaleString();
}

const SAVED_VISIBLE_MS = 5_000;

export function SavedIndicator({ saving, savedAt, error, hasUndo, onUndo }: SavedIndicatorProps) {
  // Hide the "Saved …" line a few seconds after the last save.
  const [showSaved, setShowSaved] = useState(false);
  useEffect(() => {
    if (!savedAt) return;
    setShowSaved(true);
    const t = setTimeout(() => setShowSaved(false), SAVED_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [savedAt]);

  return (
    <div className="flex items-center gap-3 min-h-[28px]">
      {hasUndo && (
        <button
          onClick={onUndo}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
          title="Undo last change (⌘Z)"
        >
          <Undo2 className="h-3.5 w-3.5" />
          Undo
        </button>
      )}
      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
        {error ? (
          <>
            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
            <span className="text-red-600 truncate" title={error}>{error}</span>
          </>
        ) : saving ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Saving…
          </>
        ) : showSaved && savedAt ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-500" />
            Saved {formatRelative(savedAt)}
          </>
        ) : null}
      </div>
    </div>
  );
}

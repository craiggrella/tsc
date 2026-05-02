"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface UseAutoSaveOptions<T> {
  /** Stable id of the record being edited; only used for server-side undo fallback. */
  recordId: string;
  /** Postgres table name; only used for server-side undo fallback. */
  tableName: string;
  /** Full mutable state to track. Save fires when this changes. */
  state: T;
  /** Setter that restores `state` (used by Undo). */
  restore: (snapshot: T) => void;
  /** Persist the given snapshot. Should write the main row + any sub-records. */
  save: (snapshot: T) => Promise<void>;
  /** Skip auto-save until ready (e.g., while initial load is running). */
  enabled?: boolean;
  /** Idle ms before auto-save fires after the last state change. */
  debounceMs?: number;
  /** How many snapshots to keep for undo. */
  stackSize?: number;
}

export interface UseAutoSaveResult {
  saving: boolean;
  savedAt: Date | null;
  error: string | null;
  hasUndo: boolean;
  undo: () => Promise<void>;
}

const DEFAULT_DEBOUNCE = 600;
const DEFAULT_STACK = 10;

export function useAutoSave<T>({
  recordId,
  tableName,
  state,
  restore,
  save,
  enabled = true,
  debounceMs = DEFAULT_DEBOUNCE,
  stackSize = DEFAULT_STACK,
}: UseAutoSaveOptions<T>): UseAutoSaveResult {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasUndo, setHasUndo] = useState(false);

  // Snapshot stack: previous saved states, oldest first.
  const stackRef = useRef<T[]>([]);
  // The snapshot we last successfully persisted — pushed to the stack on the *next* save.
  const lastSavedRef = useRef<T | null>(null);
  // Initialize once we know the page is enabled (i.e., loaded).
  const initializedRef = useRef(false);
  // Debounce timer.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True while we're applying an undo (suppresses pushing the reverted snapshot to the stack).
  const undoingRef = useRef(false);

  const persist = useCallback(
    async (snapshot: T) => {
      setSaving(true);
      setError(null);
      try {
        await save(snapshot);
        // After a successful save, push the *previous* saved snapshot onto the stack.
        if (!undoingRef.current && lastSavedRef.current !== null) {
          stackRef.current = [...stackRef.current, lastSavedRef.current].slice(-stackSize);
          setHasUndo(true);
        }
        lastSavedRef.current = snapshot;
        setSavedAt(new Date());
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSaving(false);
        undoingRef.current = false;
      }
    },
    [save, stackSize]
  );

  // Watch state — debounce-save on every change after init.
  useEffect(() => {
    if (!enabled) return;
    if (!initializedRef.current) {
      lastSavedRef.current = state;
      initializedRef.current = true;
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void persist(state);
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, enabled]);

  const undo = useCallback(async () => {
    // 1) In-memory stack first.
    if (stackRef.current.length > 0) {
      const previous = stackRef.current[stackRef.current.length - 1];
      stackRef.current = stackRef.current.slice(0, -1);
      setHasUndo(stackRef.current.length > 0);
      undoingRef.current = true;
      restore(previous);
      // Note: restore() updates state, which will trigger the watcher → save will fire.
      return;
    }

    // 2) Server-side fallback (48-hour log).
    setSaving(true);
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc("restore_field_undo", {
        p_table: tableName,
        p_id: recordId,
      });
      if (rpcErr) throw rpcErr;
      if (data) {
        // The server snapshot is the entire previous row as JSONB. The page's `restore`
        // is responsible for translating that into form/sub-record state.
        undoingRef.current = true;
        restore(data as T);
      } else {
        setError("Nothing to undo.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [restore, supabase, tableName, recordId]);

  // Cmd+Z / Ctrl+Z — only while this hook is mounted.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        // Only intercept when focus isn't inside an input/textarea/contentEditable
        // (browser native undo handles those).
        const t = e.target as HTMLElement | null;
        const tag = t?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || t?.isContentEditable) return;
        e.preventDefault();
        void undo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo]);

  return { saving, savedAt, error, hasUndo, undo };
}

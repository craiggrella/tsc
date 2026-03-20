"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Send, Filter } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/shared/status-badge";
import type { SubmissionStatus } from "@/types/database";

interface SubmissionRow {
  id: string;
  description: string;
  status: SubmissionStatus;
  reason: string[];
  response: "love" | "like" | "meh" | "hate" | null;
  submission_date: string | null;
  set_meeting: boolean;
  notes: string | null;
  created_at: string;
}

interface SubmissionsClientProps {
  userId: string;
}

const STATUSES: { value: SubmissionStatus; label: string }[] = [
  { value: "need_to_send", label: "Need to Send" },
  { value: "sent", label: "Sent" },
  { value: "connected", label: "Connected" },
];

export function SubmissionsClient({ userId }: SubmissionsClientProps) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | "">("");

  const [relationCache, setRelationCache] = useState<
    Record<string, { clientNames: string[]; personNames: string[] }>
  >({});

  useEffect(() => {
    async function load() {
      const { data: subsData } = await supabase
        .from("submissions")
        .select("*")
        .order("submission_date", { ascending: false, nullsFirst: false });
      setSubmissions(subsData || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!statusFilter) return submissions;
    return submissions.filter((s) => s.status === statusFilter);
  }, [submissions, statusFilter]);

  // Load relations for visible submissions
  useMemo(() => {
    const ids = filtered.map((s) => s.id).filter((id) => !relationCache[id]);
    if (ids.length === 0) return;

    Promise.all([
      supabase
        .from("submission_clients")
        .select("submission_id, client:clients(full_name)")
        .in("submission_id", ids),
      supabase
        .from("submission_people")
        .select("submission_id, person:people(full_name)")
        .in("submission_id", ids),
    ]).then(([{ data: sc }, { data: sp }]) => {
      const cache: typeof relationCache = {};
      for (const id of ids) {
        cache[id] = { clientNames: [], personNames: [] };
      }
      for (const row of sc || []) {
        const r = row as unknown as { submission_id: string; client: { full_name: string } | null };
        if (r.client && cache[r.submission_id]) {
          cache[r.submission_id].clientNames.push(r.client.full_name);
        }
      }
      for (const row of sp || []) {
        const r = row as unknown as { submission_id: string; person: { full_name: string } | null };
        if (r.person && cache[r.submission_id]) {
          cache[r.submission_id].personNames.push(r.person.full_name);
        }
      }
      setRelationCache((prev) => ({ ...prev, ...cache }));
    });
  }, [filtered, supabase]);

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-zinc-400">Loading...</p></div>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-black">Submissions</h1>
          <p className="mt-1 text-sm text-zinc-500">Track material submissions to contacts.</p>
        </div>
        <button
          onClick={() => router.push("/submissions/new")}
          className="inline-flex items-center gap-1.5 rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Submission
        </button>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-zinc-400" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SubmissionStatus | "")}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 outline-none hover:border-zinc-300"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        {statusFilter && (
          <button onClick={() => setStatusFilter("")} className="text-xs text-zinc-400 hover:text-zinc-600">Clear</button>
        )}
        <span className="ml-auto text-xs text-zinc-400">
          {filtered.length} submission{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/50">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Clients</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">People</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Status</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Reason</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Response</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-sm text-zinc-400">
                  <Send className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
                  No submissions found.
                </td>
              </tr>
            ) : (
              filtered.map((sub) => {
                const rel = relationCache[sub.id];
                return (
                  <tr
                    key={sub.id}
                    onClick={() => router.push(`/submissions/${sub.id}`)}
                    className="border-b border-zinc-100 last:border-0 cursor-pointer hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="px-3 py-2.5 text-zinc-700 text-xs whitespace-nowrap">
                      {rel?.clientNames.join(", ") || "\u2014"}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-700 text-xs whitespace-nowrap">
                      {rel?.personNames.join(", ") || "\u2014"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {sub.reason.length > 0
                          ? sub.reason.map((r) => (
                              <span key={r} className="inline-flex items-center rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
                                {r.replace(/_/g, " ")}
                              </span>
                            ))
                          : "\u2014"}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <StatusBadge status={sub.response} />
                    </td>
                    <td className="px-3 py-2.5 text-zinc-500 text-xs">
                      {sub.submission_date
                        ? new Date(sub.submission_date).toLocaleDateString()
                        : "\u2014"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

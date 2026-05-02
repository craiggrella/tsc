"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/shared/status-badge";

interface SubmissionRow {
  id: string;
  status: string | null;
  submission_date: string | null;
  reason: string[] | null;
  notes: string | null;
}

interface SubmissionItemRow {
  id: string;
  submission_id: string;
  client: { full_name: string } | null;
  person: { full_name: string } | null;
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "need_to_send", label: "Need to Send" },
  { value: "sent", label: "Sent" },
  { value: "connected", label: "Connected" },
];

interface SubmissionsClientProps {
  userId: string;
}

export function SubmissionsClient({ userId }: SubmissionsClientProps) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [items, setItems] = useState<SubmissionItemRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const [{ data: subs }, { data: subItems }] = await Promise.all([
        supabase
          .from("submissions")
          .select("*")
          .order("submission_date", { ascending: false }),
        supabase
          .from("submission_items")
          .select("id, submission_id, client:clients!client_id(full_name), person:people!person_id(full_name)"),
      ]);
      setSubmissions(subs || []);
      setItems((subItems || []) as unknown as SubmissionItemRow[]);
      setLoading(false);
    }
    load();
  }, []);

  const itemsBySubmission = useMemo(() => {
    const map = new Map<string, SubmissionItemRow[]>();
    for (const item of items) {
      const arr = map.get(item.submission_id) || [];
      arr.push(item);
      map.set(item.submission_id, arr);
    }
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    let result = submissions;
    if (statusFilter) {
      result = result.filter((s) => s.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((s) => {
        const subItems = itemsBySubmission.get(s.id) || [];
        const clientNames = subItems.map((i) => i.client?.full_name || "").join(" ").toLowerCase();
        const personNames = subItems.map((i) => i.person?.full_name || "").join(" ").toLowerCase();
        const reasons = (s.reason || []).join(" ").toLowerCase();
        return clientNames.includes(q) || personNames.includes(q) || reasons.includes(q);
      });
    }
    return result;
  }, [submissions, statusFilter, search, itemsBySubmission]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-black">Submissions</h1>
        <button
          onClick={() => router.push("/submissions/new")}
          className="inline-flex items-center gap-1.5 rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New Submission
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients, people, reasons..."
            className="w-full rounded-md border border-zinc-200 bg-white pl-9 pr-3 py-1.5 text-sm outline-none placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-400 transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 outline-none hover:border-zinc-300 transition-colors"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-400 py-12 text-center">No submissions found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/50">
                <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Date</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Status</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Clients</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">People</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Reason</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub) => {
                const subItems = itemsBySubmission.get(sub.id) || [];
                const clients = [...new Set(subItems.map((i) => i.client?.full_name).filter(Boolean))];
                const people = [...new Set(subItems.map((i) => i.person?.full_name).filter(Boolean))];
                return (
                  <tr
                    key={sub.id}
                    onClick={() => router.push(`/submissions/${sub.id}`)}
                    className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap text-zinc-700">
                      {sub.submission_date
                        ? new Date(sub.submission_date + "T00:00:00").toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "\u2014"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="px-3 py-2.5 text-xs text-zinc-700 max-w-[200px] truncate">
                      {clients.length > 0 ? clients.join(", ") : "\u2014"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-zinc-700 max-w-[200px] truncate">
                      {people.length > 0 ? people.join(", ") : "\u2014"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-zinc-700 max-w-[200px] truncate">
                      {sub.reason && sub.reason.length > 0 ? sub.reason.join(", ") : "\u2014"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

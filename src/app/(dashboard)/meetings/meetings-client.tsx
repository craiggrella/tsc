"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Calendar, Filter } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/shared/status-badge";
import type { MeetingStatus } from "@/types/database";

interface MeetingRow {
  id: string;
  title: string;
  meeting_status: MeetingStatus;
  meeting_at: string | null;
  location_link: string | null;
  response: "love" | "like" | "meh" | "hate" | null;
  notes: string | null;
  created_at: string;
}

interface MeetingsClientProps {
  userId: string;
}

const MEETING_STATUSES: { value: MeetingStatus; label: string }[] = [
  { value: "need_to_set", label: "Need to Set" },
  { value: "need_to_reschedule", label: "Reschedule" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

type ViewMode = "all" | "to_set";

export function MeetingsClient({ userId }: MeetingsClientProps) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [statusFilter, setStatusFilter] = useState<MeetingStatus | "">("");

  // Relation display cache: meeting_id -> { clients, people, attendees }
  const [relationCache, setRelationCache] = useState<
    Record<string, { clientNames: string[]; personNames: string[]; attendeeNames: string[] }>
  >({});

  useEffect(() => {
    async function load() {
      const { data: meetingsData } = await supabase
        .from("meetings")
        .select("*")
        .order("meeting_at", { ascending: true, nullsFirst: false });
      setMeetings(meetingsData || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = [...meetings];
    if (viewMode === "to_set") {
      list = list.filter(
        (m) =>
          m.meeting_status === "need_to_set" ||
          m.meeting_status === "need_to_reschedule"
      );
    } else if (statusFilter) {
      list = list.filter((m) => m.meeting_status === statusFilter);
    }
    return list;
  }, [meetings, viewMode, statusFilter]);

  // Load relations for visible meetings (batch)
  useMemo(() => {
    const ids = filtered
      .map((m) => m.id)
      .filter((id) => !relationCache[id]);
    if (ids.length === 0) return;

    Promise.all([
      supabase
        .from("meeting_clients")
        .select("meeting_id, client:clients(full_name)")
        .in("meeting_id", ids),
      supabase
        .from("meeting_people")
        .select("meeting_id, person:people(full_name)")
        .in("meeting_id", ids),
      supabase
        .from("meeting_attendees")
        .select("meeting_id, profile:profiles(full_name)")
        .in("meeting_id", ids),
    ]).then(([{ data: mc }, { data: mp }, { data: ma }]) => {
      const cache: typeof relationCache = {};
      for (const id of ids) {
        cache[id] = { clientNames: [], personNames: [], attendeeNames: [] };
      }
      for (const row of mc || []) {
        const r = row as unknown as { meeting_id: string; client: { full_name: string } | null };
        if (r.client && cache[r.meeting_id]) {
          cache[r.meeting_id].clientNames.push(r.client.full_name);
        }
      }
      for (const row of mp || []) {
        const r = row as unknown as { meeting_id: string; person: { full_name: string } | null };
        if (r.person && cache[r.meeting_id]) {
          cache[r.meeting_id].personNames.push(r.person.full_name);
        }
      }
      for (const row of ma || []) {
        const r = row as unknown as { meeting_id: string; profile: { full_name: string } | null };
        if (r.profile && cache[r.meeting_id]) {
          cache[r.meeting_id].attendeeNames.push(r.profile.full_name);
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
          <h1 className="text-xl font-semibold tracking-tight text-black">Meetings</h1>
          <p className="mt-1 text-sm text-zinc-500">Schedule and track client meetings.</p>
        </div>
        <button
          onClick={() => router.push("/meetings/new")}
          className="inline-flex items-center gap-1.5 rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Meeting
        </button>
      </div>

      {/* View toggle + filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-zinc-200 overflow-hidden">
          <button
            onClick={() => { setViewMode("all"); setStatusFilter(""); }}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              viewMode === "all" ? "bg-black text-white" : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setViewMode("to_set")}
            className={`px-3 py-1 text-xs font-medium border-l border-zinc-200 transition-colors ${
              viewMode === "to_set" ? "bg-black text-white" : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            To Set
          </button>
        </div>

        {viewMode === "all" && (
          <>
            <Filter className="h-3.5 w-3.5 text-zinc-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as MeetingStatus | "")}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 outline-none hover:border-zinc-300"
            >
              <option value="">All Statuses</option>
              {MEETING_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </>
        )}

        <span className="ml-auto text-xs text-zinc-400">
          {filtered.length} meeting{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/50">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">Client(s)</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">Meeting With</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">Our Team</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">Status</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Date & Time</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Location</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Response</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center text-sm text-zinc-400">
                  <Calendar className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
                  No meetings found.
                </td>
              </tr>
            ) : (
              filtered.map((meeting) => {
                const rel = relationCache[meeting.id];
                return (
                  <tr
                    key={meeting.id}
                    onClick={() => router.push(`/meetings/${meeting.id}`)}
                    className="border-b border-zinc-100 last:border-0 cursor-pointer hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="px-3 py-2.5 text-zinc-700 text-xs whitespace-nowrap">
                      {rel?.clientNames.join(", ") || "\u2014"}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-700 text-xs whitespace-nowrap">
                      {rel?.personNames.join(", ") || "\u2014"}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-700 text-xs whitespace-nowrap">
                      {rel?.attendeeNames.join(", ") || "\u2014"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <StatusBadge status={meeting.meeting_status} />
                    </td>
                    <td className="px-3 py-2.5 text-zinc-500 text-xs">
                      {meeting.meeting_at
                        ? new Date(meeting.meeting_at).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "\u2014"}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-500 text-xs max-w-[150px] truncate">
                      {meeting.location_link || "\u2014"}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={meeting.response} />
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

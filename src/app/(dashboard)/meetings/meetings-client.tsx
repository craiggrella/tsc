"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Calendar, Filter } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  MultiRelationPicker,
  type RelationOption,
} from "@/components/shared/relation-picker";
import {
  DetailPanel,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/shared/detail-panel";
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
  initialMeetings: MeetingRow[];
  clients: { id: string; full_name: string }[];
  people: { id: string; full_name: string }[];
  projects: { id: string; name: string }[];
}

const MEETING_STATUSES: { value: MeetingStatus; label: string }[] = [
  { value: "need_to_set", label: "Need to Set" },
  { value: "need_to_reschedule", label: "Reschedule" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const RESPONSES = [
  { value: "love", label: "Love" },
  { value: "like", label: "Like" },
  { value: "meh", label: "Meh" },
  { value: "hate", label: "Hate" },
];

type ViewMode = "all" | "to_set";

const emptyForm = {
  title: "",
  meeting_status: "need_to_set" as MeetingStatus,
  meeting_at: null as string | null,
  location_link: null as string | null,
  response: null as "love" | "like" | "meh" | "hate" | null,
  notes: null as string | null,
  client_ids: [] as string[],
  person_ids: [] as string[],
  project_ids: [] as string[],
};

export function MeetingsClient({
  initialMeetings,
  clients,
  people,
  projects,
}: MeetingsClientProps) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasAutoOpened = useRef(false);
  const [meetings, setMeetings] = useState<MeetingRow[]>(initialMeetings);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [statusFilter, setStatusFilter] = useState<MeetingStatus | "">("");

  // Relation display cache: meeting_id → { clients, people }
  const [relationCache, setRelationCache] = useState<
    Record<string, { clientNames: string[]; personNames: string[] }>
  >({});

  // Auto-open specific meeting from URL
  useEffect(() => {
    const openId = searchParams.get("open");
    if (openId && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      const meeting = meetings.find((m) => m.id === openId);
      if (meeting) openEdit(meeting);
      router.replace("/meetings", { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const clientOptions: RelationOption[] = useMemo(
    () => clients.map((c) => ({ id: c.id, label: c.full_name })),
    [clients]
  );
  const personOptions: RelationOption[] = useMemo(
    () => people.map((p) => ({ id: p.id, label: p.full_name })),
    [people]
  );
  const [projectList, setProjectList] = useState(projects);
  const projectOptions: RelationOption[] = useMemo(
    () => projectList.map((p) => ({ id: p.id, label: p.name })),
    [projectList]
  );

  const createProject = useCallback(async (name: string): Promise<RelationOption | null> => {
    const { data, error } = await supabase
      .from("projects")
      .insert({ name, status: "development" })
      .select("id, name")
      .single();
    if (error || !data) return null;
    setProjectList((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return { id: data.id, label: data.name };
  }, [supabase]);

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
    ]).then(([{ data: mc }, { data: mp }]) => {
      const cache: typeof relationCache = {};
      for (const id of ids) {
        cache[id] = { clientNames: [], personNames: [] };
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
      setRelationCache((prev) => ({ ...prev, ...cache }));
    });
  }, [filtered, supabase]);

  function openNew() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setPanelOpen(true);
  }

  async function openEdit(meeting: MeetingRow) {
    setEditingId(meeting.id);

    // Load join table IDs
    const [{ data: mc }, { data: mp }, { data: mpr }] = await Promise.all([
      supabase
        .from("meeting_clients")
        .select("client_id")
        .eq("meeting_id", meeting.id),
      supabase
        .from("meeting_people")
        .select("person_id")
        .eq("meeting_id", meeting.id),
      supabase
        .from("meeting_projects")
        .select("project_id")
        .eq("meeting_id", meeting.id),
    ]);

    setForm({
      title: meeting.title,
      meeting_status: meeting.meeting_status,
      meeting_at: meeting.meeting_at,
      location_link: meeting.location_link,
      response: meeting.response,
      notes: meeting.notes,
      client_ids: (mc || []).map((r) => r.client_id),
      person_ids: (mp || []).map((r) => r.person_id),
      project_ids: (mpr || []).map((r) => r.project_id),
    });
    setPanelOpen(true);
  }

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Auto-generate title from clients + people
      const clientNames = form.client_ids.map((id) => clientOptions.find((c) => c.id === id)?.label).filter(Boolean);
      const personNames = form.person_ids.map((id) => personOptions.find((p) => p.id === id)?.label).filter(Boolean);
      const autoTitle = [clientNames.join(", "), personNames.join(", ")].filter(Boolean).join(" — ") || "Meeting";

      const payload = {
        title: autoTitle,
        meeting_status: form.meeting_status,
        meeting_at: form.meeting_at || null,
        location_link: form.location_link || null,
        response: form.response,
        notes: form.notes || null,
      };

      let meetingId = editingId;

      if (editingId) {
        await supabase.from("meetings").update(payload).eq("id", editingId);
      } else {
        const { data } = await supabase
          .from("meetings")
          .insert(payload)
          .select("*")
          .single();
        if (data) meetingId = data.id;
      }

      if (meetingId) {
        // Sync join tables
        await Promise.all([
          supabase.from("meeting_clients").delete().eq("meeting_id", meetingId),
          supabase.from("meeting_people").delete().eq("meeting_id", meetingId),
          supabase.from("meeting_projects").delete().eq("meeting_id", meetingId),
        ]);
        await Promise.all([
          form.client_ids.length > 0
            ? supabase.from("meeting_clients").insert(
                form.client_ids.map((id) => ({
                  meeting_id: meetingId!,
                  client_id: id,
                }))
              )
            : Promise.resolve(),
          form.person_ids.length > 0
            ? supabase.from("meeting_people").insert(
                form.person_ids.map((id) => ({
                  meeting_id: meetingId!,
                  person_id: id,
                }))
              )
            : Promise.resolve(),
          form.project_ids.length > 0
            ? supabase.from("meeting_projects").insert(
                form.project_ids.map((id) => ({
                  meeting_id: meetingId!,
                  project_id: id,
                }))
              )
            : Promise.resolve(),
        ]);

        // Refresh
        const { data: updated } = await supabase
          .from("meetings")
          .select("*")
          .eq("id", meetingId)
          .single();
        if (updated) {
          setMeetings((prev) => {
            const existing = prev.findIndex((m) => m.id === meetingId);
            if (existing >= 0) {
              const copy = [...prev];
              copy[existing] = updated as MeetingRow;
              return copy;
            }
            return [...prev, updated as MeetingRow];
          });
        }
        // Clear relation cache for this meeting
        setRelationCache((prev) => {
          const copy = { ...prev };
          delete copy[meetingId!];
          return copy;
        });
      }

      setPanelOpen(false);
    } finally {
      setSaving(false);
    }
  }, [form, editingId, supabase]);

  const handleDelete = useCallback(async () => {
    if (!editingId || !confirm("Delete this meeting?")) return;
    setDeleting(true);
    try {
      await supabase.from("meetings").delete().eq("id", editingId);
      setMeetings((prev) => prev.filter((m) => m.id !== editingId));
      setPanelOpen(false);
    } finally {
      setDeleting(false);
    }
  }, [editingId, supabase]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-black">Meetings</h1>
          <p className="mt-1 text-sm text-zinc-500">Schedule and track client meetings.</p>
        </div>
        <button
          onClick={openNew}
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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/50">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Client(s)</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Meeting With</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Status</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Date & Time</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Location</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Response</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-sm text-zinc-400">
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
                    onClick={() => openEdit(meeting)}
                    className="border-b border-zinc-100 last:border-0 cursor-pointer hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="px-3 py-2.5 text-zinc-700 text-xs">
                      {rel?.clientNames.join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-700 text-xs">
                      {rel?.personNames.join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2.5">
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
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-500 text-xs max-w-[150px] truncate">
                      {meeting.location_link || "—"}
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

      {/* Detail Panel */}
      <DetailPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editingId ? "Edit Meeting" : "New Meeting"}
        footer={
          <div className="flex items-center justify-between">
            <div>
              {editingId && (
                <button onClick={handleDelete} disabled={deleting} className="text-xs text-red-500 hover:text-red-700 transition-colors">
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPanelOpen(false)} className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Client">
            <MultiRelationPicker
              value={form.client_ids}
              onChange={(ids) => setForm({ ...form, client_ids: ids })}
              options={clientOptions}
              placeholder="Select clients..."
            />
          </Field>
          <Field label="Meeting With">
            <MultiRelationPicker
              value={form.person_ids}
              onChange={(ids) => setForm({ ...form, person_ids: ids })}
              options={personOptions}
              placeholder="Search contacts..."
            />
          </Field>
          <Field label="Projects">
            <MultiRelationPicker
              value={form.project_ids}
              onChange={(ids) => setForm({ ...form, project_ids: ids })}
              options={projectOptions}
              placeholder="Select projects..."
              onAdd={createProject}
              addLabel="Create project"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <Select
                value={form.meeting_status}
                onChange={(e) => setForm({ ...form, meeting_status: e.target.value as MeetingStatus })}
                options={MEETING_STATUSES}
              />
            </Field>
            <Field label="Response">
              <Select
                value={form.response || ""}
                onChange={(e) => setForm({ ...form, response: (e.target.value || null) as typeof form.response })}
                options={RESPONSES}
                placeholder="None"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date & Time">
              <Input
                type="datetime-local"
                value={form.meeting_at?.slice(0, 16) || ""}
                onChange={(e) => setForm({ ...form, meeting_at: e.target.value || null })}
              />
            </Field>
            <Field label="Location / Link">
              <Input value={form.location_link || ""} onChange={(e) => setForm({ ...form, location_link: e.target.value || null })} placeholder="Office, Zoom link, etc." />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} placeholder="Meeting notes..." />
          </Field>
        </div>
      </DetailPanel>
    </div>
  );
}

"use client";

import { useState, useMemo, useCallback } from "react";
import { Plus, Send, Filter } from "lucide-react";
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
  initialSubmissions: SubmissionRow[];
  clients: { id: string; full_name: string }[];
  people: { id: string; full_name: string }[];
  projects: { id: string; name: string }[];
}

const STATUSES: { value: SubmissionStatus; label: string }[] = [
  { value: "need_to_send", label: "Need to Send" },
  { value: "sent", label: "Sent" },
  { value: "connected", label: "Connected" },
];

const RESPONSES = [
  { value: "love", label: "Love" },
  { value: "like", label: "Like" },
  { value: "meh", label: "Meh" },
  { value: "hate", label: "Hate" },
];

const REASONS = [
  "general",
  "meeting",
  "staffing",
  "at_their_request",
  "spec_script",
  "development",
];

const emptyForm = {
  description: "",
  status: "need_to_send" as SubmissionStatus,
  reason: [] as string[],
  response: null as "love" | "like" | "meh" | "hate" | null,
  submission_date: null as string | null,
  set_meeting: false,
  notes: null as string | null,
  client_ids: [] as string[],
  person_ids: [] as string[],
  project_ids: [] as string[],
};

export function SubmissionsClient({
  initialSubmissions,
  clients,
  people,
  projects,
}: SubmissionsClientProps) {
  const supabase = createClient();
  const [submissions, setSubmissions] = useState<SubmissionRow[]>(initialSubmissions);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | "">("");

  const [relationCache, setRelationCache] = useState<
    Record<string, { clientNames: string[]; personNames: string[] }>
  >({});

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

  function openNew() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setPanelOpen(true);
  }

  async function openEdit(sub: SubmissionRow) {
    setEditingId(sub.id);

    const [{ data: sc }, { data: sp }, { data: spr }] = await Promise.all([
      supabase.from("submission_clients").select("client_id").eq("submission_id", sub.id),
      supabase.from("submission_people").select("person_id").eq("submission_id", sub.id),
      supabase.from("submission_projects").select("project_id").eq("submission_id", sub.id),
    ]);

    setForm({
      description: sub.description,
      status: sub.status,
      reason: sub.reason,
      response: sub.response,
      submission_date: sub.submission_date,
      set_meeting: sub.set_meeting,
      notes: sub.notes,
      client_ids: (sc || []).map((r) => r.client_id),
      person_ids: (sp || []).map((r) => r.person_id),
      project_ids: (spr || []).map((r) => r.project_id),
    });
    setPanelOpen(true);
  }

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        description: form.description,
        status: form.status,
        reason: form.reason,
        response: form.response,
        submission_date: form.submission_date || null,
        set_meeting: form.set_meeting,
        notes: form.notes || null,
      };

      let subId = editingId;

      if (editingId) {
        await supabase.from("submissions").update(payload).eq("id", editingId);
      } else {
        const { data } = await supabase
          .from("submissions")
          .insert(payload)
          .select("*")
          .single();
        if (data) subId = data.id;
      }

      if (subId) {
        await Promise.all([
          supabase.from("submission_clients").delete().eq("submission_id", subId),
          supabase.from("submission_people").delete().eq("submission_id", subId),
          supabase.from("submission_projects").delete().eq("submission_id", subId),
        ]);
        await Promise.all([
          form.client_ids.length > 0
            ? supabase.from("submission_clients").insert(
                form.client_ids.map((id) => ({ submission_id: subId!, client_id: id }))
              )
            : Promise.resolve(),
          form.person_ids.length > 0
            ? supabase.from("submission_people").insert(
                form.person_ids.map((id) => ({ submission_id: subId!, person_id: id }))
              )
            : Promise.resolve(),
          form.project_ids.length > 0
            ? supabase.from("submission_projects").insert(
                form.project_ids.map((id) => ({ submission_id: subId!, project_id: id }))
              )
            : Promise.resolve(),
        ]);

        const { data: updated } = await supabase
          .from("submissions")
          .select("*")
          .eq("id", subId)
          .single();
        if (updated) {
          setSubmissions((prev) => {
            const idx = prev.findIndex((s) => s.id === subId);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = updated as SubmissionRow;
              return copy;
            }
            return [updated as SubmissionRow, ...prev];
          });
        }
        setRelationCache((prev) => {
          const copy = { ...prev };
          delete copy[subId!];
          return copy;
        });
      }

      setPanelOpen(false);
    } finally {
      setSaving(false);
    }
  }, [form, editingId, supabase]);

  const handleDelete = useCallback(async () => {
    if (!editingId || !confirm("Delete this submission?")) return;
    setDeleting(true);
    try {
      await supabase.from("submissions").delete().eq("id", editingId);
      setSubmissions((prev) => prev.filter((s) => s.id !== editingId));
      setPanelOpen(false);
    } finally {
      setDeleting(false);
    }
  }, [editingId, supabase]);

  function toggleReason(r: string) {
    setForm((prev) => ({
      ...prev,
      reason: prev.reason.includes(r)
        ? prev.reason.filter((x) => x !== r)
        : [...prev.reason, r],
    }));
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-black">Submissions</h1>
          <p className="mt-1 text-sm text-zinc-500">Track material submissions to contacts.</p>
        </div>
        <button
          onClick={openNew}
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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/50">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Description</th>
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
                <td colSpan={7} className="px-3 py-12 text-center text-sm text-zinc-400">
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
                    onClick={() => openEdit(sub)}
                    className="border-b border-zinc-100 last:border-0 cursor-pointer hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="px-3 py-2.5 font-medium text-black max-w-[200px] truncate">
                      {sub.description || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-700 text-xs">
                      {rel?.clientNames.join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-700 text-xs">
                      {rel?.personNames.join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {sub.reason.length > 0
                          ? sub.reason.map((r) => (
                              <span key={r} className="inline-flex items-center rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
                                {r.replace(/_/g, " ")}
                              </span>
                            ))
                          : "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={sub.response} />
                    </td>
                    <td className="px-3 py-2.5 text-zinc-500 text-xs">
                      {sub.submission_date
                        ? new Date(sub.submission_date).toLocaleDateString()
                        : "—"}
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
        title={editingId ? "Edit Submission" : "New Submission"}
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
          <Field label="Description">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Submission description" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as SubmissionStatus })}
                options={STATUSES}
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
          <Field label="Reason">
            <div className="flex flex-wrap gap-1.5">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleReason(r)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    form.reason.includes(r)
                      ? "border-black bg-black text-white"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
                  }`}
                >
                  {r.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Submission Date">
            <Input
              type="date"
              value={form.submission_date || ""}
              onChange={(e) => setForm({ ...form, submission_date: e.target.value || null })}
            />
          </Field>
          <Field label="Set Meeting">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.set_meeting}
                onChange={(e) => setForm({ ...form, set_meeting: e.target.checked })}
                className="accent-black"
              />
              <span className="text-sm text-zinc-600">Schedule a meeting</span>
            </label>
          </Field>
          <Field label="Clients">
            <MultiRelationPicker
              value={form.client_ids}
              onChange={(ids) => setForm({ ...form, client_ids: ids })}
              options={clientOptions}
              placeholder="Select clients..."
            />
          </Field>
          <Field label="People">
            <MultiRelationPicker
              value={form.person_ids}
              onChange={(ids) => setForm({ ...form, person_ids: ids })}
              options={personOptions}
              placeholder="Select people..."
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
          <Field label="Notes">
            <Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} placeholder="Notes..." />
          </Field>
        </div>
      </DetailPanel>
    </div>
  );
}

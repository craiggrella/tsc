"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  MultiRelationPicker,
  type RelationOption,
} from "@/components/shared/relation-picker";
import { Field, Input, Select, Textarea } from "@/components/shared/detail-panel";
import type { SubmissionStatus } from "@/types/database";

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

const DEFAULT_REASONS = [
  "General",
  "Meeting",
  "Staffing",
  "At Their Request",
  "Spec Script",
  "Development",
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

interface NewSubmissionProps {
  userId: string;
}

export function NewSubmission({ userId }: NewSubmissionProps) {
  const supabase = createClient();
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [clients, setClients] = useState<{ id: string; full_name: string }[]>([]);
  const [people, setPeople] = useState<{ id: string; full_name: string }[]>([]);
  const [projectList, setProjectList] = useState<{ id: string; name: string }[]>([]);
  const [reasonList, setReasonList] = useState(DEFAULT_REASONS);

  // Materials state
  const [materials, setMaterials] = useState<{ id: string; title: string }[]>([]);
  const [allMaterials, setAllMaterials] = useState<{ id: string; title: string }[]>([]);
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("clients").select("id, full_name").order("full_name"),
      supabase.from("people").select("id, full_name").order("full_name"),
      supabase.from("projects").select("id, name").order("name"),
    ]).then(([{ data: c }, { data: p }, { data: pr }]) => {
      setClients(c || []);
      setPeople(p || []);
      setProjectList(pr || []);
    });
  }, []);

  const clientOptions: RelationOption[] = useMemo(
    () => clients.map((c) => ({ id: c.id, label: c.full_name })),
    [clients]
  );
  const personOptions: RelationOption[] = useMemo(
    () => people.map((p) => ({ id: p.id, label: p.full_name })),
    [people]
  );
  const reasonOptions: RelationOption[] = useMemo(
    () => reasonList.map((r) => ({ id: r, label: r })),
    [reasonList]
  );
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

  const createReason = useCallback(async (name: string): Promise<RelationOption | null> => {
    setReasonList((prev) => [...prev, name]);
    return { id: name, label: name };
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Auto-generate description from clients + people
      const clientNames = form.client_ids.map((id) => clientOptions.find((c) => c.id === id)?.label).filter(Boolean);
      const personNames = form.person_ids.map((id) => personOptions.find((p) => p.id === id)?.label).filter(Boolean);
      const autoDesc = [clientNames.join(", "), personNames.join(", ")].filter(Boolean).join(" — ") || "Submission";

      const payload = {
        description: autoDesc,
        status: form.status,
        reason: form.reason,
        response: form.response,
        submission_date: form.submission_date || null,
        set_meeting: form.set_meeting,
        notes: form.notes || null,
      };

      const { data } = await supabase
        .from("submissions")
        .insert(payload)
        .select("id")
        .single();

      if (data) {
        const subId = data.id;

        await Promise.all([
          form.client_ids.length > 0
            ? supabase.from("submission_clients").insert(
                form.client_ids.map((id) => ({ submission_id: subId, client_id: id }))
              )
            : Promise.resolve(),
          form.person_ids.length > 0
            ? supabase.from("submission_people").insert(
                form.person_ids.map((id) => ({ submission_id: subId, person_id: id }))
              )
            : Promise.resolve(),
          form.project_ids.length > 0
            ? supabase.from("submission_projects").insert(
                form.project_ids.map((id) => ({ submission_id: subId, project_id: id }))
              )
            : Promise.resolve(),
          materials.length > 0
            ? supabase.from("submission_materials").insert(
                materials.map((m) => ({ submission_id: subId, material_id: m.id }))
              )
            : Promise.resolve(),
        ]);

        router.push(`/submissions/${subId}`);
      }
    } finally {
      setSaving(false);
    }
  }, [form, supabase, materials, clientOptions, personOptions, router]);

  return (
    <div className="mx-auto max-w-4xl">
      {/* Back link */}
      <Link
        href="/submissions"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-black transition-colors mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Submissions
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-black">New Submission</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Create Submission"}
        </button>
      </div>

      {/* Form */}
      <div className="space-y-5">
        <Field label="Client">
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

        <div className="grid grid-cols-2 gap-4">
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
          <MultiRelationPicker
            value={form.reason}
            onChange={(ids) => setForm({ ...form, reason: ids })}
            options={reasonOptions}
            placeholder="Select reasons..."
            onAdd={createReason}
            addLabel="Add reason"
          />
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

        {/* Materials */}
        <Field label="Materials">
          <div className="space-y-2">
            {materials.map((mat) => (
              <div key={mat.id} className="rounded-md border border-zinc-200 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-black">{mat.title}</span>
                  <button
                    onClick={() => setMaterials((prev) => prev.filter((m) => m.id !== mat.id))}
                    className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            {showMaterialPicker ? (
              <div className="space-y-1">
                <select
                  onChange={(e) => {
                    const matId = e.target.value;
                    if (!matId) return;
                    const mat = allMaterials.find((m) => m.id === matId);
                    if (mat && !materials.find((m) => m.id === matId)) {
                      setMaterials((prev) => [...prev, mat]);
                    }
                    setShowMaterialPicker(false);
                  }}
                  className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 outline-none"
                  defaultValue=""
                >
                  <option value="" disabled>Select a material...</option>
                  {allMaterials
                    .filter((m) => !materials.find((em) => em.id === m.id))
                    .map((m) => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                </select>
                <button onClick={() => setShowMaterialPicker(false)} className="text-xs text-zinc-400 hover:text-zinc-600">Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (allMaterials.length === 0) {
                    supabase.from("client_materials").select("id, title").order("title").then(({ data }) => {
                      setAllMaterials(data || []);
                    });
                  }
                  setShowMaterialPicker(true);
                }}
                className="text-xs text-zinc-500 hover:text-black transition-colors"
              >
                + Add Material
              </button>
            )}
          </div>
        </Field>

        <Field label="Notes">
          <Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} placeholder="Notes..." />
        </Field>
      </div>
    </div>
  );
}

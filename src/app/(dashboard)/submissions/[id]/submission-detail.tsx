"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
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

interface SubmissionDetailProps {
  submissionId: string;
  userId: string;
}

export function SubmissionDetail({ submissionId, userId }: SubmissionDetailProps) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [clients, setClients] = useState<{ id: string; full_name: string }[]>([]);
  const [people, setPeople] = useState<{ id: string; full_name: string }[]>([]);
  const [projectList, setProjectList] = useState<{ id: string; name: string }[]>([]);
  const [reasonList, setReasonList] = useState(DEFAULT_REASONS);

  // Materials state
  const [materials, setMaterials] = useState<{ id: string; title: string }[]>([]);
  const [materialResponses, setMaterialResponses] = useState<Record<string, Record<string, string>>>({});
  const [allMaterials, setAllMaterials] = useState<{ id: string; title: string }[]>([]);
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);

  useEffect(() => {
    async function load() {
      const [
        { data: sub },
        { data: clientsData },
        { data: peopleData },
        { data: projectsData },
        { data: sc },
        { data: sp },
        { data: spr },
        { data: smData },
        { data: allMatsData },
      ] = await Promise.all([
        supabase.from("submissions").select("*").eq("id", submissionId).single(),
        supabase.from("clients").select("id, full_name").order("full_name"),
        supabase.from("people").select("id, full_name").order("full_name"),
        supabase.from("projects").select("id, name").order("name"),
        supabase.from("submission_clients").select("client_id").eq("submission_id", submissionId),
        supabase.from("submission_people").select("person_id").eq("submission_id", submissionId),
        supabase.from("submission_projects").select("project_id").eq("submission_id", submissionId),
        supabase.from("submission_materials").select("material:client_materials(id, title)").eq("submission_id", submissionId),
        supabase.from("client_materials").select("id, title").order("title"),
      ]);

      if (!sub) {
        router.replace("/submissions");
        return;
      }

      setClients(clientsData || []);
      setPeople(peopleData || []);
      setProjectList(projectsData || []);
      setAllMaterials(allMatsData || []);

      // Add any reasons from this record that aren't in our list
      if (sub.reason) {
        setReasonList((prev) => {
          const set = new Set(prev);
          (sub.reason as string[]).forEach((r: string) => { if (!set.has(r)) set.add(r); });
          return [...set];
        });
      }

      const mats = (smData || [])
        .map((r: Record<string, unknown>) => r.material as { id: string; title: string } | null)
        .filter(Boolean) as { id: string; title: string }[];
      setMaterials(mats);

      // Fetch material responses
      const matIds = mats.map((m) => m.id);
      if (matIds.length > 0) {
        const { data: respData } = await supabase
          .from("material_responses")
          .select("material_id, person_id, response")
          .in("material_id", matIds);
        const respMap: Record<string, Record<string, string>> = {};
        for (const r of respData || []) {
          if (!respMap[r.material_id]) respMap[r.material_id] = {};
          respMap[r.material_id][r.person_id] = r.response;
        }
        setMaterialResponses(respMap);
      } else {
        setMaterialResponses({});
      }

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

      setLoading(false);
    }
    load();
  }, [submissionId]);

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

      await supabase.from("submissions").update(payload).eq("id", submissionId);

      // Sync join tables
      await Promise.all([
        supabase.from("submission_clients").delete().eq("submission_id", submissionId),
        supabase.from("submission_people").delete().eq("submission_id", submissionId),
        supabase.from("submission_projects").delete().eq("submission_id", submissionId),
      ]);
      await Promise.all([
        form.client_ids.length > 0
          ? supabase.from("submission_clients").insert(
              form.client_ids.map((id) => ({ submission_id: submissionId, client_id: id }))
            )
          : Promise.resolve(),
        form.person_ids.length > 0
          ? supabase.from("submission_people").insert(
              form.person_ids.map((id) => ({ submission_id: submissionId, person_id: id }))
            )
          : Promise.resolve(),
        form.project_ids.length > 0
          ? supabase.from("submission_projects").insert(
              form.project_ids.map((id) => ({ submission_id: submissionId, project_id: id }))
            )
          : Promise.resolve(),
      ]);

      // Sync submission_materials
      await supabase.from("submission_materials").delete().eq("submission_id", submissionId);
      if (materials.length > 0) {
        await supabase.from("submission_materials").insert(
          materials.map((m) => ({ submission_id: submissionId, material_id: m.id }))
        );
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }, [form, submissionId, supabase, materials, clientOptions, personOptions]);

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this submission?")) return;
    setDeleting(true);
    try {
      await supabase.from("submissions").delete().eq("id", submissionId);
      router.push("/submissions");
    } finally {
      setDeleting(false);
    }
  }, [submissionId, supabase, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

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
        <h1 className="text-xl font-semibold tracking-tight text-black">
          {form.description || "Untitled Submission"}
        </h1>
        <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "Saved \u2713" : "Save"}
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
                {form.person_ids.length > 0 && (
                  <div className="mt-1.5 space-y-1">
                    {form.person_ids.map((pid) => {
                      const personName = personOptions.find((p) => p.id === pid)?.label || "Unknown";
                      const resp = materialResponses[mat.id]?.[pid] || "";
                      return (
                        <div key={pid} className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500 w-32 truncate">{personName}</span>
                          {resp ? (
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                              resp === "love" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              resp === "like" ? "bg-blue-50 text-blue-700 border-blue-200" :
                              resp === "meh" ? "bg-amber-50 text-amber-700 border-amber-200" :
                              "bg-red-50 text-red-700 border-red-200"
                            }`}>
                              {resp.charAt(0).toUpperCase() + resp.slice(1)}
                            </span>
                          ) : null}
                          <select
                            value={resp}
                            onChange={async (e) => {
                              const val = e.target.value;
                              if (val) {
                                await supabase.from("material_responses").upsert(
                                  { material_id: mat.id, person_id: pid, response: val },
                                  { onConflict: "material_id,person_id" }
                                );
                              } else {
                                await supabase.from("material_responses")
                                  .delete()
                                  .eq("material_id", mat.id)
                                  .eq("person_id", pid);
                              }
                              setMaterialResponses((prev) => {
                                const copy = { ...prev };
                                if (!copy[mat.id]) copy[mat.id] = {};
                                if (val) {
                                  copy[mat.id] = { ...copy[mat.id], [pid]: val };
                                } else {
                                  const inner = { ...copy[mat.id] };
                                  delete inner[pid];
                                  copy[mat.id] = inner;
                                }
                                return copy;
                              });
                            }}
                            className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] text-zinc-600 outline-none"
                          >
                            <option value="">&mdash;</option>
                            <option value="love">Love</option>
                            <option value="like">Like</option>
                            <option value="meh">Meh</option>
                            <option value="hate">Hate</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
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
      {/* Danger Zone */}
      <div className="mt-12 border-t border-zinc-200 pt-6">
        <p className="text-xs text-zinc-400 mb-3">Danger Zone</p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete this submission"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, ExternalLink, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  RelationPicker,
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

const DEFAULT_REASONS = [
  "General",
  "Meeting",
  "Staffing",
  "At Their Request",
  "Spec Script",
  "Development",
];

function genKey() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function todayDate() {
  return new Date().toISOString().split("T")[0];
}

interface MaterialRow {
  key: string;
  clientId: string;
  materialId: string;
  personId: string;
  response: string;
  projectId: string;
}

const emptyForm = {
  description: "",
  status: "need_to_send" as SubmissionStatus,
  reason: [] as string[],
  submission_date: null as string | null,
  set_meeting: false,
  notes: null as string | null,
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

  const [people, setPeople] = useState<{ id: string; full_name: string }[]>([]);
  const [projectList, setProjectList] = useState<{ id: string; name: string }[]>([]);
  const [reasonList, setReasonList] = useState(DEFAULT_REASONS);

  // Materials table state
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([]);
  const [allClients, setAllClients] = useState<{ id: string; full_name: string }[]>([]);
  const [allMaterialsByClient, setAllMaterialsByClient] = useState<Record<string, { id: string; title: string }[]>>({});
  const [allMaterialsFlat, setAllMaterialsFlat] = useState<{ id: string; title: string }[]>([]);


  useEffect(() => {
    async function load() {
      const [
        { data: sub },
        { data: clientsData },
        { data: peopleData },
        { data: projectsData },
        { data: sp },
        { data: spr },
        { data: smData },
        { data: allMatsData },
      ] = await Promise.all([
        supabase.from("submissions").select("*").eq("id", submissionId).single(),
        supabase.from("clients").select("id, full_name").order("full_name"),
        supabase.from("people").select("id, full_name").order("full_name"),
        supabase.from("projects").select("id, name").order("name"),
        supabase.from("submission_people").select("person_id").eq("submission_id", submissionId),
        supabase.from("submission_projects").select("project_id").eq("submission_id", submissionId),
        supabase.from("submission_materials").select("material:client_materials(id, title, client_id, client:clients!client_id(full_name))").eq("submission_id", submissionId),
        supabase.from("client_materials").select("id, title, client_id").order("title"),
      ]);

      if (!sub) {
        router.replace("/submissions");
        return;
      }

      setAllClients(clientsData || []);
      setPeople(peopleData || []);
      setProjectList(projectsData || []);

      // Build allMaterialsByClient and allMaterialsFlat
      const byClient: Record<string, { id: string; title: string }[]> = {};
      const flat: { id: string; title: string }[] = [];
      for (const m of allMatsData || []) {
        const item = { id: m.id as string, title: m.title as string };
        flat.push(item);
        const cid = m.client_id as string;
        if (cid) {
          if (!byClient[cid]) byClient[cid] = [];
          byClient[cid].push(item);
        }
      }
      setAllMaterialsByClient(byClient);
      setAllMaterialsFlat(flat);

      // Add any reasons from this record that aren't in our list
      if (sub.reason) {
        setReasonList((prev) => {
          const set = new Set(prev);
          (sub.reason as string[]).forEach((r: string) => { if (!set.has(r)) set.add(r); });
          return [...set];
        });
      }

      let personIds = (sp || []).map((r) => r.person_id);
      const submissionDate = sub.submission_date || todayDate();
      const savedProjectIds = (spr || []).map((r) => r.project_id);
      const defaultProjectId = savedProjectIds.length > 0 ? savedProjectIds[0] : "";

      // Build materialRows from existing submission_materials + responses
      const mats = (smData || [])
        .map((r: Record<string, unknown>) => {
          const mat = r.material as { id: string; title: string; client_id: string; client: { full_name: string } | null } | null;
          if (!mat) return null;
          return { id: mat.id, title: mat.title, clientId: mat.client_id || "", clientName: mat.client?.full_name || "" };
        })
        .filter(Boolean) as { id: string; title: string; clientId: string; clientName: string }[];

      const matIds = mats.map((m) => m.id);
      let respData: { material_id: string; person_id: string; response: string }[] = [];
      if (matIds.length > 0) {
        const { data } = await supabase
          .from("material_responses")
          .select("material_id, person_id, response")
          .in("material_id", matIds);
        respData = data || [];
      }

      const rows: MaterialRow[] = [];
      for (const mat of mats) {
        const matResps = respData.filter((r) => r.material_id === mat.id);
        if (matResps.length > 0) {
          for (const resp of matResps) {
            rows.push({
              key: genKey(),
              clientId: mat.clientId,
              materialId: mat.id,
              personId: resp.person_id,
              response: resp.response || "",
              projectId: defaultProjectId,
            });
          }
        } else {
          rows.push({
            key: genKey(),
            clientId: mat.clientId,
            materialId: mat.id,
            personId: "",
            response: "",
            projectId: defaultProjectId,
          });
        }
      }
      setMaterialRows(rows);

      // Sync person_ids to include everyone from material responses
      const allPersonIdsFromRows = rows.map((r) => r.personId).filter(Boolean);
      for (const pid of allPersonIdsFromRows) {
        if (!personIds.includes(pid)) {
          personIds = [...personIds, pid];
        }
      }

      setForm({
        description: sub.description,
        status: sub.status,
        reason: sub.reason,
        submission_date: sub.submission_date || todayDate(),
        set_meeting: sub.set_meeting,
        notes: sub.notes,
        person_ids: personIds,
        project_ids: (spr || []).map((r) => r.project_id),
      });

      setLoading(false);
    }
    load();
  }, [submissionId]);

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

  const searchPeople = useCallback(async (query: string): Promise<RelationOption[]> => {
    const { data } = await supabase
      .from("people")
      .select("id, full_name")
      .ilike("full_name", `%${query}%`)
      .order("full_name")
      .limit(15);
    return (data || []).map((p) => ({ id: p.id, label: p.full_name }));
  }, [supabase]);

  const addNewPerson = useCallback(async (name: string): Promise<RelationOption | null> => {
    const parts = name.split(" ");
    const first_name = parts[0] || name;
    const last_name = parts.slice(1).join(" ") || null;
    const { data, error } = await supabase
      .from("people")
      .insert({ full_name: name, first_name, last_name, department: [] })
      .select("id, full_name")
      .single();
    if (error || !data) return null;
    setPeople((prev) => [...prev, { id: data.id, full_name: data.full_name }].sort((a, b) => a.full_name.localeCompare(b.full_name)));
    return { id: data.id, label: data.full_name };
  }, [supabase]);

  function updateRow(idx: number, patch: Partial<MaterialRow>) {
    setMaterialRows((prev) => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  }

  function removeRow(idx: number) {
    const row = materialRows[idx];
    // Delete response from DB if person was set (regardless of response value)
    if (row.materialId && row.personId) {
      supabase.from("material_responses").delete().eq("material_id", row.materialId).eq("person_id", row.personId);
    }
    setMaterialRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function addMaterialRow() {
    // Auto-fill person if only 1 person currently in material rows
    const currentPeople = [...new Set(materialRows.map((r) => r.personId).filter(Boolean))];
    const autoPersonId = currentPeople.length === 1 ? currentPeople[0] : "";
    setMaterialRows((prev) => [
      ...prev,
      {
        key: genKey(),
        clientId: "",
        materialId: "",
        personId: autoPersonId,
        response: "",
        projectId: "",
      },
    ]);
  }

  function addPersonRow(materialId: string) {
    const existing = materialRows.find((r) => r.materialId === materialId);
    setMaterialRows((prev) => [
      ...prev,
      {
        key: genKey(),
        clientId: existing?.clientId || "",
        materialId,
        personId: "",
        response: "",
        projectId: existing?.projectId || "",
      },
    ]);
  }

  async function handlePersonSelect(idx: number, personId: string | null) {
    if (!personId) { updateRow(idx, { personId: "" }); return; }
    updateRow(idx, { personId });
    // Immediately save this person assignment to material_responses so it persists on reload
    const row = materialRows[idx];
    if (row.materialId && personId) {
      await supabase.from("material_responses").upsert(
        { material_id: row.materialId, person_id: personId, response: row.response || null },
        { onConflict: "material_id,person_id" }
      );
    }
  }

  async function handleResponseChange(idx: number, value: string) {
    const row = materialRows[idx];
    updateRow(idx, { response: value });
    if (row.materialId && row.personId) {
      if (value) {
        const { error } = await supabase.from("material_responses").upsert(
          { material_id: row.materialId, person_id: row.personId, response: value },
          { onConflict: "material_id,person_id" }
        );
        if (error) console.error("Response upsert error:", error);
      } else {
        const { error } = await supabase.from("material_responses")
          .update({ response: null })
          .eq("material_id", row.materialId).eq("person_id", row.personId);
        if (error) console.error("Response clear error:", error);
      }
    }
  }

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Derive client_ids and person_ids from materialRows
      const clientIds = [...new Set(materialRows.map((r) => r.clientId).filter(Boolean))];
      const materialIds = [...new Set(materialRows.map((r) => r.materialId).filter(Boolean))];
      const derivedPersonIds = [...new Set(materialRows.map((r) => r.personId).filter(Boolean))];

      // Auto-generate description from client names + people names
      const clientNames = clientIds.map((id) => allClients.find((c) => c.id === id)?.full_name).filter(Boolean);
      const personNames = derivedPersonIds.map((id) => personOptions.find((p) => p.id === id)?.label || people.find((p) => p.id === id)?.full_name).filter(Boolean);
      const autoDesc = [clientNames.join(", "), personNames.join(", ")].filter(Boolean).join(" — ") || "Submission";

      const payload = {
        description: autoDesc,
        status: form.status,
        reason: form.reason,
        submission_date: form.submission_date || null,
        set_meeting: form.set_meeting,
        notes: form.notes || null,
      };

      const { error: updateError } = await supabase.from("submissions").update(payload).eq("id", submissionId);
      if (updateError) { console.error("Save error:", updateError); return; }

      // Sync join tables — delete all then re-insert
      const [delC, delP, delPr, delM] = await Promise.all([
        supabase.from("submission_clients").delete().eq("submission_id", submissionId),
        supabase.from("submission_people").delete().eq("submission_id", submissionId),
        supabase.from("submission_projects").delete().eq("submission_id", submissionId),
        supabase.from("submission_materials").delete().eq("submission_id", submissionId),
      ]);
      if (delC.error) console.error("Delete clients error:", delC.error);
      if (delP.error) console.error("Delete people error:", delP.error);
      if (delPr.error) console.error("Delete projects error:", delPr.error);
      if (delM.error) console.error("Delete materials error:", delM.error);

      if (clientIds.length > 0)
        await supabase.from("submission_clients").insert(clientIds.map((id) => ({ submission_id: submissionId, client_id: id })));
      if (derivedPersonIds.length > 0)
        await supabase.from("submission_people").insert(derivedPersonIds.map((id) => ({ submission_id: submissionId, person_id: id })));
      const derivedProjectIds = [...new Set(materialRows.map((r) => r.projectId).filter(Boolean))];
      if (derivedProjectIds.length > 0)
        await supabase.from("submission_projects").insert(derivedProjectIds.map((id) => ({ submission_id: submissionId, project_id: id })));
      if (materialIds.length > 0)
        await supabase.from("submission_materials").insert(materialIds.map((id) => ({ submission_id: submissionId, material_id: id })));

      // Clean up material_responses: delete responses for materials no longer on this submission
      // Get all material IDs that were previously on this submission (from DB) vs what's currently in materialRows
      // The safest approach: for each material×person combo in materialRows, those stay. Everything else for these materials gets cleaned.
      // Actually, material_responses are global (not per-submission), so we only delete responses
      // for material×person combos that were explicitly removed by the user via removeRow
      // The removeRow function already handles deleting individual responses.
      // But if an entire material is removed (all its rows deleted), we should also clean up.

      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }, [form, submissionId, supabase, materialRows, allClients, personOptions, people]);

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

  // Check if a row is the last row for its materialId (to show "+ Add Person")
  function isLastRowForMaterial(idx: number): boolean {
    const row = materialRows[idx];
    if (!row.materialId) return false;
    for (let i = materialRows.length - 1; i >= 0; i--) {
      if (materialRows[i].materialId === row.materialId) return i === idx;
    }
    return false;
  }

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
        {/* 1. Status + Date + Reason — compact row */}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as SubmissionStatus })}
              options={STATUSES}
            />
          </Field>
          <Field label="Date">
            <Input
              type="date"
              value={form.submission_date || ""}
              onChange={(e) => setForm({ ...form, submission_date: e.target.value || null })}
            />
          </Field>
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
        </div>

        {/* 3. Materials Submitted — THE MAIN TABLE */}
        <Field label="Materials Submitted">
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-md border border-zinc-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left">
                    <th className="px-3 py-2 font-medium text-zinc-500 text-xs">Client</th>
                    <th className="px-3 py-2 font-medium text-zinc-500 text-xs">Material</th>
                    <th className="px-3 py-2 font-medium text-zinc-500 text-xs">Project</th>
                    <th className="px-3 py-2 font-medium text-zinc-500 text-xs">Person</th>
                    <th className="px-3 py-2 font-medium text-zinc-500 text-xs">Response</th>
                    <th className="px-3 py-2 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {materialRows.map((row, idx) => (
                    <tr key={row.key} className="border-b border-zinc-100 last:border-0">
                      <td className="px-3 py-2">
                        <select
                          value={row.clientId}
                          onChange={(e) => updateRow(idx, { clientId: e.target.value, materialId: "" })}
                          className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-xs text-zinc-600 outline-none w-full"
                        >
                          <option value="">Select client...</option>
                          {allClients.map((c) => (
                            <option key={c.id} value={c.id}>{c.full_name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={row.materialId}
                          onChange={(e) => updateRow(idx, { materialId: e.target.value })}
                          className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-xs text-zinc-600 outline-none w-full"
                        >
                          <option value="">Select material...</option>
                          {(allMaterialsByClient[row.clientId] || allMaterialsFlat).map((m) => (
                            <option key={m.id} value={m.id}>{m.title}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={row.projectId}
                          onChange={(e) => updateRow(idx, { projectId: e.target.value })}
                          className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-xs text-zinc-600 outline-none"
                        >
                          <option value="">—</option>
                          {projectOptions.map((p) => (
                            <option key={p.id} value={p.id}>{p.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <div className="flex-1 min-w-[140px]">
                            <RelationPicker
                              value={row.personId || null}
                              onChange={(id) => handlePersonSelect(idx, id)}
                              options={[...new Set(materialRows.map((r) => r.personId).filter(Boolean))].map((pid) => ({
                                id: pid,
                                label: personOptions.find((p) => p.id === pid)?.label || people.find((p) => p.id === pid)?.full_name || "",
                              }))}
                              onSearch={searchPeople}
                              onAdd={addNewPerson}
                              addLabel="Add contact"
                              selectedLabel={row.personId ? (personOptions.find((p) => p.id === row.personId)?.label || people.find((p) => p.id === row.personId)?.full_name) : undefined}
                              placeholder="Search people..."
                            />
                          </div>
                          {row.personId && (
                            <Link href={`/contacts/${row.personId}`} className="shrink-0 text-zinc-400 hover:text-black transition-colors" title="View contact">
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={row.response}
                          onChange={(e) => handleResponseChange(idx, e.target.value)}
                          className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-xs text-zinc-600 outline-none"
                        >
                          <option value="">&mdash;</option>
                          <option value="love">Love</option>
                          <option value="like">Like</option>
                          <option value="meh">Meh</option>
                          <option value="hate">Hate</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <button onClick={() => removeRow(idx)} className="text-zinc-400 hover:text-red-500 transition-colors">
                            ✕
                          </button>
                          {row.materialId && isLastRowForMaterial(idx) && (
                            <button
                              onClick={() => addPersonRow(row.materialId)}
                              className="inline-flex items-center gap-0.5 text-[11px] text-zinc-400 hover:text-black transition-colors whitespace-nowrap"
                            >
                              <Plus className="h-3 w-3" />
                              Person
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {materialRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center text-xs text-zinc-400">
                        No materials added yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <button
              onClick={addMaterialRow}
              className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-black transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Material
            </button>
          </div>
        </Field>

        {/* 5. Notes */}
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

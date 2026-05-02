"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, X } from "lucide-react";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  RelationPicker,
  MultiRelationPicker,
  type RelationOption,
} from "@/components/shared/relation-picker";
import { Field, Input, Select, Textarea } from "@/components/shared/detail-panel";
import { useAutoSave } from "@/hooks/use-auto-save";
import { SavedIndicator } from "@/components/shared/saved-indicator";

const STATUS_OPTIONS = [
  { value: "need_to_send", label: "Need to Send" },
  { value: "sent", label: "Sent" },
  { value: "connected", label: "Connected" },
];

const RESPONSE_OPTIONS = [
  { value: "", label: "" },
  { value: "love", label: "Love" },
  { value: "like", label: "Like" },
  { value: "meh", label: "Meh" },
  { value: "hate", label: "Hate" },
];

interface SubmissionItem {
  id: string | null;
  clientId: string;
  materialId: string;
  personId: string;
  response: string;
  notes: string;
  projectIds: string[];
  // display helpers
  personLabel?: string;
}

interface SubmissionDetailProps {
  submissionId: string;
  userId: string;
}

export function SubmissionDetail({ submissionId, userId }: SubmissionDetailProps) {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Submission fields
  const [status, setStatus] = useState("need_to_send");
  const [submissionDate, setSubmissionDate] = useState("");
  const [reason, setReason] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  // Items
  const [items, setItems] = useState<SubmissionItem[]>([]);
  const [origItemIds, setOrigItemIds] = useState<Set<string>>(new Set());

  // Reference data
  const [clients, setClients] = useState<{ id: string; full_name: string }[]>([]);
  const [materialsByClient, setMaterialsByClient] = useState<Map<string, { id: string; title: string }[]>>(new Map());
  const [projects, setProjects] = useState<RelationOption[]>([]);
  const [reasonOptions, setReasonOptions] = useState<RelationOption[]>([]);

  useEffect(() => {
    async function load() {
      const [
        { data: submission },
        { data: clientsData },
        { data: allMaterials },
        { data: projectsData },
        { data: subItems },
      ] = await Promise.all([
        supabase.from("submissions").select("*").eq("id", submissionId).single(),
        supabase.from("clients").select("id, full_name").order("full_name"),
        supabase.from("client_materials").select("id, title, client_id"),
        supabase.from("projects").select("id, name").order("name"),
        supabase
          .from("submission_items")
          .select(
            "*, client:clients!client_id(full_name), material:client_materials!material_id(id, title), person:people!person_id(id, full_name)"
          )
          .eq("submission_id", submissionId),
      ]);

      if (!submission) {
        router.replace("/submissions");
        return;
      }

      setStatus(submission.status || "need_to_send");
      setSubmissionDate(submission.submission_date || "");
      setReason(Array.isArray(submission.reason) ? submission.reason : []);
      setNotes(submission.notes || "");
      setClients(clientsData || []);

      // Group materials by client_id
      const matMap = new Map<string, { id: string; title: string }[]>();
      for (const m of allMaterials || []) {
        if (!m.client_id) continue;
        const arr = matMap.get(m.client_id) || [];
        arr.push({ id: m.id, title: m.title });
        matMap.set(m.client_id, arr);
      }
      setMaterialsByClient(matMap);

      setProjects((projectsData || []).map((p) => ({ id: p.id, label: p.name })));

      // Build reason options from current values
      const reasonArr: string[] = Array.isArray(submission.reason) ? submission.reason : [];
      setReasonOptions(reasonArr.map((r: string) => ({ id: r, label: r })));

      // Load items with their projects
      const loadedItems: SubmissionItem[] = [];
      const ids = new Set<string>();
      for (const si of subItems || []) {
        const item = si as unknown as {
          id: string;
          client_id: string;
          material_id: string;
          person_id: string;
          response: string | null;
          notes: string | null;
          person: { id: string; full_name: string } | null;
        };
        ids.add(item.id);

        // Fetch projects for this item
        const { data: itemProjects } = await supabase
          .from("submission_item_projects")
          .select("project_id")
          .eq("submission_item_id", item.id);

        loadedItems.push({
          id: item.id,
          clientId: item.client_id || "",
          materialId: item.material_id || "",
          personId: item.person_id || "",
          response: item.response || "",
          notes: item.notes || "",
          projectIds: (itemProjects || []).map((p) => p.project_id),
          personLabel: item.person?.full_name || undefined,
        });
      }
      setItems(loadedItems);
      setOrigItemIds(ids);
      setLoading(false);
    }
    load();
  }, [submissionId]);

  const clientOptions = useMemo(
    () => clients.map((c) => ({ id: c.id, label: c.full_name })),
    [clients]
  );

  const updateItem = useCallback((index: number, patch: Partial<SubmissionItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { id: null, clientId: "", materialId: "", personId: "", response: "", notes: "", projectIds: [] },
    ]);
  }, []);

  const searchPeople = useCallback(
    async (query: string): Promise<RelationOption[]> => {
      const { data } = await supabase
        .from("people")
        .select("id, full_name")
        .ilike("full_name", `%${query}%`)
        .limit(20);
      return (data || []).map((p) => ({ id: p.id, label: p.full_name }));
    },
    [supabase]
  );

  const addPerson = useCallback(
    async (name: string): Promise<RelationOption | null> => {
      const parts = name.trim().split(/\s+/);
      const first = parts[0] || "";
      const last = parts.slice(1).join(" ") || "";
      const { data, error } = await supabase
        .from("people")
        .insert({ first_name: first, last_name: last, full_name: name.trim() })
        .select("id, full_name")
        .single();
      if (error || !data) return null;
      return { id: data.id, label: data.full_name };
    },
    [supabase]
  );

  const addProject = useCallback(
    async (name: string): Promise<RelationOption | null> => {
      const { data, error } = await supabase
        .from("projects")
        .insert({ name: name.trim() })
        .select("id, name")
        .single();
      if (error || !data) return null;
      const opt = { id: data.id, label: data.name };
      setProjects((prev) => [...prev, opt]);
      return opt;
    },
    [supabase]
  );

  const addReason = useCallback(
    async (name: string): Promise<RelationOption | null> => {
      const opt = { id: name.trim(), label: name.trim() };
      setReasonOptions((prev) => [...prev, opt]);
      return opt;
    },
    []
  );

  const handleResponseChange = useCallback(
    async (index: number, newResponse: string) => {
      updateItem(index, { response: newResponse });
      const item = items[index];
      if (!item) return;
      const materialId = item.materialId;
      const personId = item.personId;
      if (newResponse && materialId && personId) {
        await supabase.from("material_responses").upsert(
          { material_id: materialId, person_id: personId, response: newResponse },
          { onConflict: "material_id,person_id" }
        );
      }
    },
    [items, supabase, updateItem]
  );

  type SubmissionAutoSaveSnapshot = {
    status: string;
    submissionDate: string;
    reason: string[];
    notes: string;
    items: SubmissionItem[];
  };

  const autoSaveState: SubmissionAutoSaveSnapshot = useMemo(
    () => ({ status, submissionDate, reason, notes, items }),
    [status, submissionDate, reason, notes, items]
  );

  const autoSaveRestore = useCallback((snap: unknown) => {
    const s = snap as Partial<SubmissionAutoSaveSnapshot> & Record<string, unknown>;
    if (s && typeof s === "object" && "status" in s) {
      setStatus((s.status as string) ?? "need_to_send");
      setSubmissionDate((s.submissionDate as string) ?? "");
      setReason((s.reason as string[]) ?? []);
      setNotes((s.notes as string) ?? "");
      if (s.items) setItems(s.items as SubmissionItem[]);
    } else if (s && typeof s === "object") {
      const row = s as Record<string, unknown>;
      setStatus((row.status as string) ?? "need_to_send");
      setSubmissionDate((row.submission_date as string) ?? "");
      setReason((row.reason as string[]) ?? []);
      setNotes((row.notes as string) ?? "");
    }
  }, []);

  const autoSave = useAutoSave<SubmissionAutoSaveSnapshot>({
    recordId: submissionId,
    tableName: "submissions",
    state: autoSaveState,
    restore: autoSaveRestore,
    enabled: !loading,
    save: async (snap) => {
      const clientNames = [...new Set(snap.items.map((i) => clients.find((c) => c.id === i.clientId)?.full_name).filter(Boolean))];
      const personLabels = [...new Set(snap.items.map((i) => i.personLabel).filter(Boolean))];
      const description = [...clientNames, ...personLabels].join(", ") || null;

      await supabase.from("submissions").update({
        status: snap.status,
        submission_date: snap.submissionDate || null,
        reason: snap.reason.length > 0 ? snap.reason : null,
        notes: snap.notes || null,
        description,
        set_meeting: false,
        response: null,
      }).eq("id", submissionId);

      const currentItemIds = new Set(snap.items.filter((i) => i.id).map((i) => i.id!));
      const toDelete = [...origItemIds].filter((id) => !currentItemIds.has(id));
      for (const id of toDelete) {
        await supabase.from("submission_item_projects").delete().eq("submission_item_id", id);
        await supabase.from("submission_items").delete().eq("id", id);
      }

      for (let i = 0; i < snap.items.length; i++) {
        const item = snap.items[i];
        const payload = {
          submission_id: submissionId,
          client_id: item.clientId || null,
          material_id: item.materialId || null,
          person_id: item.personId || null,
          response: item.response || null,
          notes: item.notes || null,
        };

        let itemId = item.id;
        if (itemId) {
          await supabase.from("submission_items").update(payload).eq("id", itemId);
        } else {
          const { data } = await supabase.from("submission_items").insert(payload).select("id").single();
          if (data) {
            itemId = data.id;
            updateItem(i, { id: itemId });
          }
        }

        if (itemId) {
          await supabase.from("submission_item_projects").delete().eq("submission_item_id", itemId);
          if (item.projectIds.length > 0) {
            await supabase.from("submission_item_projects").insert(
              item.projectIds.map((pid) => ({ submission_item_id: itemId, project_id: pid }))
            );
          }
          if (item.response && item.materialId && item.personId) {
            await supabase.from("material_responses").upsert(
              { material_id: item.materialId, person_id: item.personId, response: item.response },
              { onConflict: "material_id,person_id" }
            );
          }
        }
      }

      setOrigItemIds(new Set(snap.items.map((i) => i.id).filter(Boolean) as string[]));
    },
  });

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this submission?")) return;
    setDeleting(true);
    try {
      // Delete item projects and items first
      for (const item of items) {
        if (item.id) {
          await supabase.from("submission_item_projects").delete().eq("submission_item_id", item.id);
        }
      }
      await supabase.from("submission_items").delete().eq("submission_id", submissionId);
      await supabase.from("submissions").delete().eq("id", submissionId);
      router.push("/submissions");
    } finally {
      setDeleting(false);
    }
  }, [items, submissionId, supabase, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div>
      {/* Back + Save */}
      <div className="flex items-center justify-between mb-6">
        <Breadcrumb fallbackHref="/submissions" fallbackLabel="Submissions" currentLabel="Submission" />
        <SavedIndicator
          saving={autoSave.saving}
          savedAt={autoSave.savedAt}
          error={autoSave.error}
          hasUndo={autoSave.hasUndo}
          onUndo={autoSave.undo}
        />
      </div>

      {/* Top section */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Field label="Status">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={STATUS_OPTIONS}
          />
        </Field>
        <Field label="Date">
          <Input
            type="date"
            value={submissionDate}
            onChange={(e) => setSubmissionDate(e.target.value)}
          />
        </Field>
        <Field label="Reason">
          <MultiRelationPicker
            value={reason}
            onChange={setReason}
            options={reasonOptions}
            placeholder="Select reasons..."
            onAdd={addReason}
            addLabel="Create"
          />
        </Field>
      </div>

      {/* Notes */}
      <Field label="Notes" className="mb-6">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Submission notes..."
        />
      </Field>

      {/* Materials Submitted */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-black">
            Materials Submitted{" "}
            <span className="font-normal text-zinc-400">({items.length})</span>
          </h2>
          <button
            onClick={addItem}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add Material
          </button>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-zinc-400 py-8 text-center">
            No materials added yet. Click &ldquo;Add Material&rdquo; to start.
          </p>
        ) : (
          <div className="rounded-lg border border-zinc-200" style={{ overflow: "visible" }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/50">
                  <th className="px-2 py-2 text-left text-xs font-medium text-zinc-500">Client</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-zinc-500">Material</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-zinc-500">Project(s)</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-zinc-500">Person</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-zinc-500">Response</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-zinc-500 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const clientMaterials = materialsByClient.get(item.clientId) || [];
                  return (
                    <tr key={idx} className="border-b border-zinc-100 last:border-0 align-top">
                      <td className="px-2 py-2 min-w-[140px]">
                        <select
                          value={item.clientId}
                          onChange={(e) => updateItem(idx, { clientId: e.target.value, materialId: "" })}
                          className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs outline-none hover:border-zinc-300 transition-colors"
                        >
                          <option value="">Select client...</option>
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.full_name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2 min-w-[140px]">
                        <select
                          value={item.materialId}
                          onChange={(e) => updateItem(idx, { materialId: e.target.value })}
                          className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs outline-none hover:border-zinc-300 transition-colors"
                        >
                          <option value="">Select material...</option>
                          {clientMaterials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.title}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2 min-w-[120px] align-top">
                        {item.projectIds.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-1">
                            {item.projectIds.map((pid) => {
                              const name = projects.find((p) => p.id === pid)?.label || "";
                              return (
                                <span key={pid} className="inline-flex items-center gap-0.5 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-700">
                                  {name}
                                  <button type="button" onClick={() => updateItem(idx, { projectIds: item.projectIds.filter((id) => id !== pid) })} className="text-zinc-400 hover:text-red-500">×</button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value && !item.projectIds.includes(e.target.value)) {
                              updateItem(idx, { projectIds: [...item.projectIds, e.target.value] });
                            }
                            e.target.value = "";
                          }}
                          className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-xs text-zinc-600 outline-none w-full"
                        >
                          <option value="">Add project...</option>
                          {projects.filter((p) => !item.projectIds.includes(p.id)).map((p) => (
                            <option key={p.id} value={p.id}>{p.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2 min-w-[160px]">
                        <RelationPicker
                          value={item.personId || null}
                          onChange={(id) => {
                            if (!id) {
                              updateItem(idx, { personId: "", personLabel: "" });
                            } else {
                              // Look up the label — fetch if not known
                              supabase.from("people").select("full_name").eq("id", id).single().then(({ data }) => {
                                updateItem(idx, { personId: id, personLabel: data?.full_name || "" });
                              });
                            }
                          }}
                          options={[]}
                          placeholder="Search person..."
                          onSearch={searchPeople}
                          onAdd={addPerson}
                          addLabel="Create"
                          selectedLabel={item.personLabel}
                        />
                      </td>
                      <td className="px-2 py-2 min-w-[100px]">
                        <select
                          value={item.response}
                          onChange={(e) => handleResponseChange(idx, e.target.value)}
                          className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs outline-none hover:border-zinc-300 transition-colors"
                        >
                          {RESPONSE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => removeItem(idx)}
                          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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

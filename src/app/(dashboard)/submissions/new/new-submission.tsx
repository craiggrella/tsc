"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  RelationPicker,
  MultiRelationPicker,
  type RelationOption,
} from "@/components/shared/relation-picker";
import { Field, Input, Select, Textarea } from "@/components/shared/detail-panel";

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
  personLabel?: string;
}

interface NewSubmissionProps {
  userId: string;
}

export function NewSubmission({ userId }: NewSubmissionProps) {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Submission fields
  const today = new Date().toISOString().split("T")[0];
  const [status, setStatus] = useState("need_to_send");
  const [submissionDate, setSubmissionDate] = useState(today);
  const [reason, setReason] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  // Items
  const [items, setItems] = useState<SubmissionItem[]>([]);

  // Reference data
  const [clients, setClients] = useState<{ id: string; full_name: string }[]>([]);
  const [materialsByClient, setMaterialsByClient] = useState<Map<string, { id: string; title: string }[]>>(new Map());
  const [projects, setProjects] = useState<RelationOption[]>([]);
  const [reasonOptions, setReasonOptions] = useState<RelationOption[]>([]);

  useEffect(() => {
    async function load() {
      const [{ data: clientsData }, { data: allMaterials }, { data: projectsData }] = await Promise.all([
        supabase.from("clients").select("id, full_name").order("full_name"),
        supabase.from("client_materials").select("id, title, client_id"),
        supabase.from("projects").select("id, name").order("name"),
      ]);

      setClients(clientsData || []);

      const matMap = new Map<string, { id: string; title: string }[]>();
      for (const m of allMaterials || []) {
        if (!m.client_id) continue;
        const arr = matMap.get(m.client_id) || [];
        arr.push({ id: m.id, title: m.title });
        matMap.set(m.client_id, arr);
      }
      setMaterialsByClient(matMap);

      setProjects((projectsData || []).map((p) => ({ id: p.id, label: p.name })));
      setLoading(false);
    }
    load();
  }, []);

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
      // Immediate upsert for new submissions too (material_responses is global)
      const item = items[index];
      if (!item) return;
      if (newResponse && item.materialId && item.personId) {
        await supabase.from("material_responses").upsert(
          { material_id: item.materialId, person_id: item.personId, response: newResponse },
          { onConflict: "material_id,person_id" }
        );
      }
    },
    [items, supabase, updateItem]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Auto-generate description
      const clientNames = [...new Set(items.map((i) => clients.find((c) => c.id === i.clientId)?.full_name).filter(Boolean))];
      const personLabels = [...new Set(items.map((i) => i.personLabel).filter(Boolean))];
      const description = [...clientNames, ...personLabels].join(", ") || null;

      const { data: submission, error } = await supabase
        .from("submissions")
        .insert({
          status,
          submission_date: submissionDate || null,
          reason: reason.length > 0 ? reason : null,
          notes: notes || null,
          description,
          set_meeting: false,
          response: null,
          responsible_user_id: userId,
        })
        .select("id")
        .single();

      if (error || !submission) {
        console.error("Failed to create submission", error);
        return;
      }

      for (const item of items) {
        const { data: newItem } = await supabase
          .from("submission_items")
          .insert({
            submission_id: submission.id,
            client_id: item.clientId || null,
            material_id: item.materialId || null,
            person_id: item.personId || null,
            response: item.response || null,
            notes: item.notes || null,
          })
          .select("id")
          .single();

        if (newItem) {
          // Insert projects
          if (item.projectIds.length > 0) {
            await supabase.from("submission_item_projects").insert(
              item.projectIds.map((pid) => ({ submission_item_id: newItem.id, project_id: pid }))
            );
          }

          // Upsert material_responses
          if (item.response && item.materialId && item.personId) {
            await supabase.from("material_responses").upsert(
              { material_id: item.materialId, person_id: item.personId, response: item.response },
              { onConflict: "material_id,person_id" }
            );
          }
        }
      }

      router.push(`/submissions/${submission.id}`);
    } finally {
      setSaving(false);
    }
  }, [status, submissionDate, reason, notes, items, clients, userId, supabase, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Back + Save */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/submissions"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-black transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Submissions
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
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
          <div className="overflow-x-auto rounded-lg border border-zinc-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/50">
                  <th className="px-2 py-2 text-left text-xs font-medium text-zinc-500">Client</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-zinc-500">Material</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-zinc-500">Project(s)</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-zinc-500">Person</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-zinc-500">Response</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-zinc-500">Notes</th>
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
                      <td className="px-2 py-2 min-w-[160px]">
                        <MultiRelationPicker
                          value={item.projectIds}
                          onChange={(ids) => updateItem(idx, { projectIds: ids })}
                          options={projects}
                          placeholder="Projects..."
                          onAdd={addProject}
                          addLabel="Create"
                        />
                      </td>
                      <td className="px-2 py-2 min-w-[160px]">
                        <RelationPicker
                          value={item.personId || null}
                          onChange={(id) =>
                            updateItem(idx, {
                              personId: id || "",
                              personLabel: id ? undefined : "",
                            })
                          }
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
                      <td className="px-2 py-2 min-w-[120px]">
                        <input
                          value={item.notes}
                          onChange={(e) => updateItem(idx, { notes: e.target.value })}
                          placeholder="Notes..."
                          className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs outline-none placeholder:text-zinc-400 hover:border-zinc-300 transition-colors"
                        />
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
    </div>
  );
}

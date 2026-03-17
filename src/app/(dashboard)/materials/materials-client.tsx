"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Plus, FileText, Filter, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  RelationPicker,
  MultiRelationPicker,
  type RelationOption,
} from "@/components/shared/relation-picker";
import {
  DetailPanel,
  Field,
  Input,
  Select,
} from "@/components/shared/detail-panel";
import { FilePicker } from "@/components/shared/file-picker";
import { FilePreview } from "@/components/shared/file-preview";

// ─── Types ──────────────────────────────────────────

type MaterialStatus =
  | "not_yet_reviewed"
  | "in_review"
  | "coverage_available"
  | "notes_given"
  | "editing"
  | "final_draft";

type MaterialType = "Pilot" | "Movie" | "Episode" | "Treatment" | "Script" | "Other";

interface MaterialRow {
  id: string;
  title: string;
  is_client_material: boolean;
  client_id: string | null;
  direction: "Outgoing" | "Incoming";
  material_type: MaterialType;
  format: string | null;
  genre: string | null;
  sub_genre: string[] | string | null;
  status: MaterialStatus;
  box_file_id: string | null;
  file_url: string | null;
  created_at: string;
  client?: { id: string; full_name: string } | null;
}

interface MaterialsClientProps {
  userId: string;
}

const STATUSES: { value: MaterialStatus; label: string }[] = [
  { value: "not_yet_reviewed", label: "Not Reviewed" },
  { value: "in_review", label: "In Review" },
  { value: "coverage_available", label: "Coverage Available" },
  { value: "notes_given", label: "Notes Given" },
  { value: "editing", label: "Editing" },
  { value: "final_draft", label: "Final Draft" },
];

const MATERIAL_TYPES: { value: MaterialType; label: string }[] = [
  { value: "Pilot", label: "Pilot" },
  { value: "Movie", label: "Movie" },
  { value: "Episode", label: "Episode" },
  { value: "Treatment", label: "Treatment" },
  { value: "Script", label: "Script" },
  { value: "Other", label: "Other" },
];

const DIRECTIONS: { value: string; label: string }[] = [
  { value: "Outgoing", label: "Outgoing" },
  { value: "Incoming", label: "Incoming" },
];

const FORMATS: { value: string; label: string }[] = [
  { value: "Feature", label: "Feature" },
  { value: "Half-Hour", label: "Half-Hour" },
  { value: "One-Hour", label: "One-Hour" },
  { value: "Limited Series", label: "Limited Series" },
  { value: "Short", label: "Short" },
  { value: "Documentary", label: "Documentary" },
  { value: "Animation", label: "Animation" },
  { value: "Other", label: "Other" },
];

const GENRES: { value: string; label: string }[] = [
  { value: "Action", label: "Action" },
  { value: "Comedy", label: "Comedy" },
  { value: "Drama", label: "Drama" },
  { value: "Horror", label: "Horror" },
  { value: "Sci-Fi", label: "Sci-Fi" },
  { value: "Thriller", label: "Thriller" },
  { value: "Romance", label: "Romance" },
  { value: "Documentary", label: "Documentary" },
  { value: "Family", label: "Family" },
  { value: "Other", label: "Other" },
];

const SUB_GENRES: RelationOption[] = [
  { id: "Romantic Comedy", label: "Romantic Comedy" },
  { id: "Dark Comedy", label: "Dark Comedy" },
  { id: "Psychological Thriller", label: "Psychological Thriller" },
  { id: "Legal Drama", label: "Legal Drama" },
  { id: "Medical Drama", label: "Medical Drama" },
  { id: "Crime", label: "Crime" },
  { id: "Procedural", label: "Procedural" },
  { id: "Supernatural", label: "Supernatural" },
  { id: "Coming of Age", label: "Coming of Age" },
  { id: "Biopic", label: "Biopic" },
  { id: "Period", label: "Period" },
  { id: "Satire", label: "Satire" },
  { id: "Mockumentary", label: "Mockumentary" },
  { id: "Other", label: "Other" },
];

const emptyForm = {
  title: "",
  is_client_material: false,
  client_id: null as string | null,
  direction: "Outgoing" as "Outgoing" | "Incoming",
  material_type: "Script" as MaterialType,
  format: null as string | null,
  genre: null as string | null,
  sub_genre: [] as string[],
  status: "not_yet_reviewed" as MaterialStatus,
  box_file_id: null as string | null,
  file_url: null as string | null,
};

export function MaterialsClient({ userId }: MaterialsClientProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [clients, setClients] = useState<{ id: string; full_name: string }[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MaterialStatus | "">("");
  const [search, setSearch] = useState("");
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState("");

  useEffect(() => {
    async function load() {
      const [{ data: matsData }, { data: clientsData }] = await Promise.all([
        supabase
          .from("client_materials")
          .select("*, client:clients!client_id(id, full_name)")
          .order("created_at", { ascending: false }),
        supabase.from("clients").select("id, full_name").order("full_name"),
      ]);
      setMaterials((matsData as MaterialRow[]) || []);
      setClients(clientsData || []);
      setLoading(false);
    }
    load();
  }, []);

  const clientOptions: RelationOption[] = useMemo(
    () => clients.map((c) => ({ id: c.id, label: c.full_name })),
    [clients]
  );

  const filtered = useMemo(() => {
    let result = materials;
    if (statusFilter) {
      result = result.filter((m) => m.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((m) => m.title.toLowerCase().includes(q));
    }
    return result;
  }, [materials, statusFilter, search]);

  function openNew() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setFileName(null);
    setPanelOpen(true);
  }

  function openEdit(mat: MaterialRow) {
    setEditingId(mat.id);
    setForm({
      title: mat.title,
      is_client_material: mat.is_client_material,
      client_id: mat.client_id,
      direction: mat.direction,
      material_type: mat.material_type,
      format: mat.format,
      genre: mat.genre,
      sub_genre: Array.isArray(mat.sub_genre) ? mat.sub_genre : mat.sub_genre ? [mat.sub_genre] : [],
      status: mat.status,
      box_file_id: mat.box_file_id,
      file_url: mat.file_url,
    });
    setFileName(null); // Will show box_file_id if set
    setPanelOpen(true);
  }

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        is_client_material: form.is_client_material,
        client_id: form.is_client_material ? form.client_id : null,
        direction: form.direction,
        material_type: form.material_type,
        format: form.format || null,
        genre: form.genre || null,
        sub_genre: Array.isArray(form.sub_genre) && form.sub_genre.length > 0 ? form.sub_genre.join(", ") : null,
        status: form.status,
        box_file_id: form.box_file_id,
        file_url: form.file_url,
      };

      let matId = editingId;

      if (editingId) {
        await supabase.from("client_materials").update(payload).eq("id", editingId);
      } else {
        const { data } = await supabase
          .from("client_materials")
          .insert(payload)
          .select("*, client:clients!client_id(id, full_name)")
          .single();
        if (data) matId = data.id;
      }

      if (matId) {
        const { data: updated } = await supabase
          .from("client_materials")
          .select("*, client:clients!client_id(id, full_name)")
          .eq("id", matId)
          .single();
        if (updated) {
          setMaterials((prev) => {
            const idx = prev.findIndex((m) => m.id === matId);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = updated as MaterialRow;
              return copy;
            }
            return [updated as MaterialRow, ...prev];
          });
        }
      }

      if (!editingId && matId) setEditingId(matId);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }, [form, editingId, supabase]);

  const handleDelete = useCallback(async () => {
    if (!editingId || !confirm("Delete this material?")) return;
    setDeleting(true);
    try {
      await supabase.from("client_materials").delete().eq("id", editingId);
      setMaterials((prev) => prev.filter((m) => m.id !== editingId));
      setPanelOpen(false);
    } finally {
      setDeleting(false);
    }
  }, [editingId, supabase]);

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-zinc-400">Loading...</p></div>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-black">Materials</h1>
          <p className="mt-1 text-sm text-zinc-500">Track scripts, pilots, and other materials.</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Material
        </button>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-zinc-400" />
        <input
          type="text"
          placeholder="Search by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 outline-none hover:border-zinc-300 focus:border-zinc-400 w-48"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as MaterialStatus | "")}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 outline-none hover:border-zinc-300"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        {(statusFilter || search) && (
          <button onClick={() => { setStatusFilter(""); setSearch(""); }} className="text-xs text-zinc-400 hover:text-zinc-600">Clear</button>
        )}
        <span className="ml-auto text-xs text-zinc-400">
          {filtered.length} material{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/50">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Title</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Type</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Direction</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Client</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Format</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-sm text-zinc-400">
                  <FileText className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
                  No materials found.
                </td>
              </tr>
            ) : (
              filtered.map((mat) => (
                <tr
                  key={mat.id}
                  onClick={() => openEdit(mat)}
                  className="border-b border-zinc-100 last:border-0 cursor-pointer hover:bg-zinc-50/50 transition-colors"
                >
                  <td className="px-3 py-2.5 text-zinc-700 text-xs whitespace-nowrap">
                    {mat.title || "Untitled"}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-700 text-xs whitespace-nowrap">
                    {mat.material_type}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-700 text-xs whitespace-nowrap">
                    {mat.direction === "Outgoing" ? "\u2192 Outgoing" : "\u2190 Incoming"}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-700 text-xs whitespace-nowrap">
                    {mat.client?.full_name || "\u2014"}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-700 text-xs whitespace-nowrap">
                    {mat.format || "\u2014"}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <StatusBadge status={mat.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Panel */}
      <DetailPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editingId ? "Edit Material" : "New Material"}
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
                Close
              </button>
              <button onClick={handleSave} disabled={saving} className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50">
                {saving ? "Saving..." : saved ? "Saved \u2713" : "Save"}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Title">
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Material title..."
            />
          </Field>

          <Field label="Is Client Material">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_client_material}
                onChange={(e) => setForm({ ...form, is_client_material: e.target.checked, client_id: e.target.checked ? form.client_id : null })}
                className="accent-black"
              />
              <span className="text-sm text-zinc-600">This material belongs to a client</span>
            </label>
          </Field>

          {form.is_client_material && (
            <Field label="Client">
              <RelationPicker
                value={form.client_id}
                onChange={(id) => setForm({ ...form, client_id: id })}
                options={clientOptions}
                placeholder="Select client..."
              />
            </Field>
          )}

          <Field label="Direction">
            <Select
              value={form.direction}
              onChange={(e) => setForm({ ...form, direction: e.target.value as "Outgoing" | "Incoming" })}
              options={DIRECTIONS}
            />
          </Field>

          <Field label="Material Type">
            <Select
              value={form.material_type}
              onChange={(e) => setForm({ ...form, material_type: e.target.value as MaterialType })}
              options={MATERIAL_TYPES}
            />
          </Field>

          <Field label="Format">
            <Select
              value={form.format || ""}
              onChange={(e) => setForm({ ...form, format: e.target.value || null })}
              options={FORMATS}
              placeholder="Select format..."
            />
          </Field>

          <Field label="Genre">
            <Select
              value={form.genre || ""}
              onChange={(e) => setForm({ ...form, genre: e.target.value || null })}
              options={GENRES}
              placeholder="Select genre..."
            />
          </Field>

          <Field label="Sub-genre">
            <MultiRelationPicker
              value={Array.isArray(form.sub_genre) ? form.sub_genre : []}
              onChange={(ids) => setForm({ ...form, sub_genre: ids })}
              options={SUB_GENRES}
              placeholder="Select sub-genres..."
            />
          </Field>

          <Field label="Status">
            <Select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as MaterialStatus })}
              options={STATUSES}
            />
          </Field>

          <Field label="Box File">
            {form.box_file_id ? (
              <div className="flex items-center gap-2">
                <span className="truncate text-sm text-zinc-700">
                  {fileName || `File ${form.box_file_id}`}
                </span>
                <button
                  onClick={() => {
                    setPreviewFileId(form.box_file_id);
                    setPreviewFileName(fileName || `File ${form.box_file_id}`);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  <Eye className="h-3 w-3" />
                  Preview
                </button>
                <button
                  onClick={() => { setForm({ ...form, box_file_id: null, file_url: null }); setFileName(null); }}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={() => setFilePickerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Select from Box
              </button>
            )}
          </Field>
        </div>
      </DetailPanel>

      {/* File Picker Modal */}
      <FilePicker
        open={filePickerOpen}
        onClose={() => setFilePickerOpen(false)}
        onSelect={(files) => {
          if (files.length > 0) {
            setForm({ ...form, box_file_id: files[0].box_file_id, file_url: null });
            setFileName(files[0].name);
          }
        }}
      />

      {/* File Preview Modal */}
      {previewFileId && (
        <FilePreview
          fileId={previewFileId}
          fileName={previewFileName}
          onClose={() => setPreviewFileId(null)}
        />
      )}
    </div>
  );
}

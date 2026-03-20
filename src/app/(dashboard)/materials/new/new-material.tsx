"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  RelationPicker,
  MultiRelationPicker,
  type RelationOption,
} from "@/components/shared/relation-picker";
import { Field, Input, Select } from "@/components/shared/detail-panel";
import { FilePicker } from "@/components/shared/file-picker";
import { FilePreview } from "@/components/shared/file-preview";

type MaterialStatus =
  | "not_yet_reviewed"
  | "in_review"
  | "coverage_available"
  | "notes_given"
  | "editing"
  | "final_draft";

type MaterialType = "Pilot" | "Movie" | "Episode" | "Treatment" | "Script" | "Other";

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

interface NewMaterialProps {
  userId: string;
}

export function NewMaterial({ userId }: NewMaterialProps) {
  const supabase = createClient();
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [clients, setClients] = useState<{ id: string; full_name: string }[]>([]);
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState("");

  useEffect(() => {
    supabase
      .from("clients")
      .select("id, full_name")
      .order("full_name")
      .then(({ data }) => setClients(data || []));
  }, []);

  const clientOptions: RelationOption[] = useMemo(
    () => clients.map((c) => ({ id: c.id, label: c.full_name })),
    [clients]
  );

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) return;
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
        sub_genre:
          Array.isArray(form.sub_genre) && form.sub_genre.length > 0
            ? form.sub_genre.join(", ")
            : null,
        status: form.status,
        box_file_id: form.box_file_id,
        file_url: form.file_url,
      };

      const { data } = await supabase
        .from("client_materials")
        .insert(payload)
        .select("id")
        .single();

      if (data) {
        router.push(`/materials/${data.id}`);
      }
    } finally {
      setSaving(false);
    }
  }, [form, supabase, router]);

  return (
    <div className="mx-auto max-w-4xl">
      {/* Back link */}
      <Link
        href="/materials"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-black transition-colors mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Materials
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-black">New Material</h1>
        <button
          onClick={handleSave}
          disabled={saving || !form.title.trim()}
          className="rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Create Material"}
        </button>
      </div>

      {/* Form */}
      <div className="space-y-5">
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
              onChange={(e) =>
                setForm({
                  ...form,
                  is_client_material: e.target.checked,
                  client_id: e.target.checked ? form.client_id : null,
                })
              }
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

        <div className="grid grid-cols-3 gap-3">
          <Field label="Type">
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
              placeholder="Select..."
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as MaterialStatus })}
              options={STATUSES}
          />
        </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Genre">
            <Select
              value={form.genre || ""}
              onChange={(e) => setForm({ ...form, genre: e.target.value || null })}
              options={GENRES}
              placeholder="Select..."
            />
          </Field>
          <Field label="Sub-genre">
            <MultiRelationPicker
              value={Array.isArray(form.sub_genre) ? form.sub_genre : []}
              onChange={(ids) => setForm({ ...form, sub_genre: ids })}
              options={SUB_GENRES}
              placeholder="Select..."
            />
          </Field>
        </div>

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
                onClick={() => {
                  setForm({ ...form, box_file_id: null, file_url: null });
                  setFileName(null);
                }}
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

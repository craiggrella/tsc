"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Eye, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  RelationPicker,
  MultiRelationPicker,
  type RelationOption,
} from "@/components/shared/relation-picker";
import { Field, Input, Select } from "@/components/shared/detail-panel";
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

// ─── Constants ──────────────────────────────────────

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

const RESPONSE_COLORS: Record<string, string> = {
  love: "bg-emerald-50 text-emerald-700 border-emerald-200",
  like: "bg-blue-50 text-blue-700 border-blue-200",
  meh: "bg-amber-50 text-amber-700 border-amber-200",
  hate: "bg-red-50 text-red-700 border-red-200",
};

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

interface ReaderRow {
  person_id: string;
  full_name: string;
  company_id: string | null;
  company_name: string | null;
  buyer_type: string | null;
  response: string | null;
  project_id: string | null;
  project_name: string | null;
  submission_id: string | null;
}

interface MaterialDetailProps {
  materialId: string;
  userId: string;
}

export function MaterialDetail({ materialId, userId }: MaterialDetailProps) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [clients, setClients] = useState<{ id: string; full_name: string }[]>([]);
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState("");

  // Submissions
  const [readers, setSubmissions] = useState<ReaderRow[]>([]);
  const [responseFilter, setResponseFilter] = useState<string>("");

  useEffect(() => {
    async function load() {
      const [{ data: material }, { data: clientsData }] = await Promise.all([
        supabase
          .from("client_materials")
          .select("*, client:clients!client_id(id, full_name)")
          .eq("id", materialId)
          .single(),
        supabase.from("clients").select("id, full_name").order("full_name"),
      ]);

      if (!material) {
        router.replace("/materials");
        return;
      }

      setForm({
        title: material.title,
        is_client_material: material.is_client_material,
        client_id: material.client_id,
        direction: material.direction,
        material_type: material.material_type,
        format: material.format,
        genre: material.genre,
        sub_genre: Array.isArray(material.sub_genre)
          ? material.sub_genre
          : material.sub_genre
          ? material.sub_genre.split(", ").map((s: string) => s.trim())
          : [],
        status: material.status,
        box_file_id: material.box_file_id,
        file_url: material.file_url,
      });
      setClients(clientsData || []);

      // Load readers: people with material_responses for this material
      const { data: responsesData } = await supabase
        .from("material_responses")
        .select("person_id, response, person:people!person_id(id, full_name, buyer_type, company:companies!company_id(id, name))")
        .eq("material_id", materialId);

      // Get submissions that include this material + their projects and people
      const { data: subMats } = await supabase
        .from("submission_materials")
        .select("submission_id")
        .eq("material_id", materialId);
      const subIds = (subMats || []).map((s) => s.submission_id);

      // Build maps: person_id → { project_name, project_id, submission_id }
      const personExtraMap = new Map<string, { project_name: string | null; project_id: string | null; submission_id: string | null }>();
      if (subIds.length > 0) {
        // Get projects per submission
        const { data: subProjects } = await supabase
          .from("submission_projects")
          .select("submission_id, project_id, project:projects(name)")
          .in("submission_id", subIds);
        const subProjectMap = new Map<string, { name: string; id: string }>();
        for (const row of subProjects || []) {
          const r = row as unknown as { submission_id: string; project_id: string; project: { name: string } | null };
          if (r.project) subProjectMap.set(r.submission_id, { name: r.project.name, id: r.project_id });
        }

        // Get people per submission
        const { data: subPeople } = await supabase
          .from("submission_people")
          .select("submission_id, person_id")
          .in("submission_id", subIds);
        for (const sp of subPeople || []) {
          if (!personExtraMap.has(sp.person_id)) {
            const proj = subProjectMap.get(sp.submission_id);
            personExtraMap.set(sp.person_id, {
              project_name: proj?.name || null,
              project_id: proj?.id || null,
              submission_id: sp.submission_id,
            });
          }
        }
      }

      // Build reader map from material_responses
      const readerMap = new Map<string, ReaderRow>();
      for (const row of responsesData || []) {
        const person = (row as Record<string, unknown>).person as {
          id: string;
          full_name: string;
          buyer_type: string | null;
          company: { name: string; id?: string } | null;
        } | null;
        if (person) {
          const extra = personExtraMap.get(person.id);
          readerMap.set(person.id, {
            person_id: person.id,
            full_name: person.full_name,
            company_id: (person.company as unknown as { id: string })?.id || null,
            company_name: person.company?.name || null,
            buyer_type: person.buyer_type,
            response: row.response,
            project_id: extra?.project_id || null,
            project_name: extra?.project_name || null,
            submission_id: extra?.submission_id || null,
          });
        }
      }

      // Also load people from submissions who have no response yet
      if (subIds.length > 0) {
        const { data: subPeopleAll } = await supabase
          .from("submission_people")
          .select("submission_id, person:people!person_id(id, full_name, buyer_type, company:companies!company_id(id, name))")
          .in("submission_id", subIds);

        for (const row of subPeopleAll || []) {
          const r = row as unknown as { submission_id: string; person: { id: string; full_name: string; buyer_type: string | null; company: { id: string; name: string } | null } | null };
          if (r.person && !readerMap.has(r.person.id)) {
            const extra = personExtraMap.get(r.person.id);
            readerMap.set(r.person.id, {
              person_id: r.person.id,
              full_name: r.person.full_name,
              company_id: r.person.company?.id || null,
              company_name: r.person.company?.name || null,
              buyer_type: r.person.buyer_type,
              response: null,
              project_id: extra?.project_id || null,
              project_name: extra?.project_name || null,
              submission_id: r.submission_id,
            });
          }
        }
      }

      setSubmissions(
        Array.from(readerMap.values()).sort((a, b) => a.full_name.localeCompare(b.full_name))
      );

      setLoading(false);
    }
    load();
  }, [materialId]);

  const clientOptions: RelationOption[] = useMemo(
    () => clients.map((c) => ({ id: c.id, label: c.full_name })),
    [clients]
  );

  const filteredSubmissions = useMemo(() => {
    if (!responseFilter) return readers;
    if (responseFilter === "no_response") return readers.filter((r) => !r.response);
    return readers.filter((r) => r.response === responseFilter);
  }, [readers, responseFilter]);

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
        sub_genre:
          Array.isArray(form.sub_genre) && form.sub_genre.length > 0
            ? form.sub_genre.join(", ")
            : null,
        status: form.status,
        box_file_id: form.box_file_id,
        file_url: form.file_url,
      };

      await supabase.from("client_materials").update(payload).eq("id", materialId);

      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }, [form, materialId, supabase]);

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this material?")) return;
    setDeleting(true);
    try {
      await supabase.from("client_materials").delete().eq("id", materialId);
      router.push("/materials");
    } finally {
      setDeleting(false);
    }
  }, [materialId, supabase, router]);

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
        href="/materials"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-black transition-colors mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Materials
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-black">
          {form.title || "Untitled Material"}
        </h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : saved ? "Saved \u2713" : "Save"}
        </button>
      </div>

      {/* General Info */}
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

      {/* Submissions Section */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-black">
            Submissions{" "}
            <span className="font-normal text-zinc-400">({readers.length})</span>
          </h2>
          <select
            value={responseFilter}
            onChange={(e) => setResponseFilter(e.target.value)}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 outline-none hover:border-zinc-300"
          >
            <option value="">All</option>
            <option value="love">Love</option>
            <option value="like">Like</option>
            <option value="meh">Meh</option>
            <option value="hate">Hate</option>
            <option value="no_response">No Response</option>
          </select>
        </div>

        {filteredSubmissions.length === 0 ? (
          <p className="text-sm text-zinc-400 py-8 text-center">No submissions found.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/50">
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">
                    Name
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">
                    Company
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">
                    Buyer Type
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">
                    Project
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">
                    Response
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((r) => (
                  <tr
                    key={r.person_id}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {r.submission_id && (
                          <Link
                            href={`/submissions/${r.submission_id}`}
                            className="text-zinc-400 hover:text-black transition-colors"
                            title="View submission"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                        <Link
                          href={`/contacts/${r.person_id}`}
                          className="text-zinc-700 hover:text-black hover:underline"
                        >
                          {r.full_name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                      {r.company_id ? (
                        <Link
                          href={`/companies/${r.company_id}`}
                          className="text-zinc-700 hover:text-black hover:underline"
                        >
                          {r.company_name}
                        </Link>
                      ) : (
                        <span className="text-zinc-400">{"\u2014"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {r.buyer_type ? (
                        <Link
                          href={`/contacts?buyer_type=${encodeURIComponent(r.buyer_type)}`}
                          className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                        >
                          {r.buyer_type}
                        </Link>
                      ) : (
                        <span className="text-xs text-zinc-400">{"\u2014"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                      {r.project_id ? (
                        <Link
                          href={`/projects/${r.project_id}`}
                          className="text-zinc-700 hover:text-black hover:underline"
                        >
                          {r.project_name}
                        </Link>
                      ) : (
                        <span className="text-zinc-400">{"\u2014"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {r.response ? (
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                            RESPONSE_COLORS[r.response] || "bg-zinc-50 text-zinc-600 border-zinc-200"
                          }`}
                        >
                          {r.response.charAt(0).toUpperCase() + r.response.slice(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400">No response</span>
                      )}
                    </td>
                  </tr>
                ))}
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
          {deleting ? "Deleting..." : "Delete this material"}
        </button>
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

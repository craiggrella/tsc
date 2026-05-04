"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Eye, ExternalLink } from "lucide-react";
import { Breadcrumb, buildFromParams } from "@/components/shared/breadcrumb";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  MultiRelationPicker,
  type RelationOption,
} from "@/components/shared/relation-picker";
import { Field, Input, Select } from "@/components/shared/detail-panel";
import { PicklistSelect } from "@/components/shared/picklist-select";
import { FilePicker } from "@/components/shared/file-picker";
import { FilePreview } from "@/components/shared/file-preview";

import { usePicklist, toSelectOptions, toRelationOptions } from "@/lib/picklists";
import { useAutoSave } from "@/hooks/use-auto-save";
import { SavedIndicator } from "@/components/shared/saved-indicator";

const RESPONSE_COLORS: Record<string, string> = {
  love: "bg-emerald-50 text-emerald-700 border-emerald-200",
  like: "bg-blue-50 text-blue-700 border-blue-200",
  meh: "bg-amber-50 text-amber-700 border-amber-200",
  hate: "bg-red-50 text-red-700 border-red-200",
};

const emptyForm = {
  title: "",
  client_ids: [] as string[],
  material_type: null as string | null,
  format: null as string | null,
  genre: null as string | null,
  sub_genre: [] as string[],
  status: "not_yet_reviewed" as string,
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
  const materialTypesItems = usePicklist("list_material_types");
  const MATERIAL_TYPES = toSelectOptions(materialTypesItems);
  const statusItems = usePicklist("list_statuses");
  const STATUSES = toSelectOptions(statusItems);
  const formatItems = usePicklist("list_formats");
  const FORMATS = toSelectOptions(formatItems);
  const genreItems = usePicklist("list_genres");
  const GENRES = toSelectOptions(genreItems);
  const subGenreItems = usePicklist("list_sub_genres");
  const SUB_GENRES = toRelationOptions(subGenreItems);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
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
      const [{ data: material }, { data: clientsData }, { data: matClients }] = await Promise.all([
        supabase
          .from("client_materials")
          .select("*")
          .eq("id", materialId)
          .single(),
        supabase.from("clients").select("id, full_name").order("full_name"),
        supabase.from("material_clients").select("client_id").eq("material_id", materialId),
      ]);

      if (!material) {
        router.replace("/materials");
        return;
      }

      const clientIds = (matClients || []).map((mc) => mc.client_id);

      setForm({
        title: material.title,
        client_ids: clientIds,
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

      // Load readers from submission_items where material_id = this material
      const { data: items } = await supabase
        .from("submission_items")
        .select("id, submission_id, response, person:people!person_id(id, full_name, company:companies!company_id(id, name, buyer_type)), submission:submissions!submission_id(submission_date)")
        .eq("material_id", materialId);

      // Get projects per submission_item
      const itemIds = (items || []).map((i) => i.id);
      let projectMap = new Map<string, { id: string; name: string }>();
      if (itemIds.length > 0) {
        const { data: itemProjects } = await supabase
          .from("submission_item_projects")
          .select("submission_item_id, project:projects!project_id(id, name)")
          .in("submission_item_id", itemIds);
        for (const ip of itemProjects || []) {
          const r = ip as unknown as { submission_item_id: string; project: { id: string; name: string } | null };
          if (r.project) projectMap.set(r.submission_item_id, r.project);
        }
      }

      const readerMap = new Map<string, ReaderRow>();
      for (const item of items || []) {
        const person = (item as Record<string, unknown>).person as {
          id: string;
          full_name: string;
          company: { id: string; name: string; buyer_type: string | null } | null;
        } | null;
        if (person && !readerMap.has(person.id)) {
          const proj = projectMap.get(item.id);
          readerMap.set(person.id, {
            person_id: person.id,
            full_name: person.full_name,
            company_id: person.company?.id || null,
            company_name: person.company?.name || null,
            buyer_type: person.company?.buyer_type || null,
            response: item.response,
            project_id: proj?.id || null,
            project_name: proj?.name || null,
            submission_id: item.submission_id,
          });
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

  const autoSaveRestore = useCallback((snap: unknown) => {
    const s = snap as Partial<{ form: typeof emptyForm }> & Record<string, unknown>;
    if (s && typeof s === "object" && "form" in s && s.form) {
      setForm(s.form as typeof emptyForm);
    } else if (s && typeof s === "object") {
      const row = s as Record<string, unknown>;
      const subGenreRaw = row.sub_genre as string | string[] | null;
      const subGenre = Array.isArray(subGenreRaw)
        ? subGenreRaw
        : typeof subGenreRaw === "string" && subGenreRaw
        ? subGenreRaw.split(",").map((s) => s.trim())
        : [];
      setForm((prev) => ({
        ...prev,
        title: (row.title as string) ?? "",
        material_type: (row.material_type as string | null) ?? null,
        format: (row.format as string | null) ?? null,
        genre: (row.genre as string | null) ?? null,
        sub_genre: subGenre,
        status: (row.status as string) ?? "not_yet_reviewed",
        box_file_id: (row.box_file_id as string | null) ?? null,
        file_url: (row.file_url as string | null) ?? null,
      }));
    }
  }, []);

  const autoSave = useAutoSave<{ form: typeof emptyForm }>({
    recordId: materialId,
    tableName: "client_materials",
    state: useMemo(() => ({ form }), [form]),
    restore: autoSaveRestore,
    enabled: !loading,
    save: async (snap) => {
      const payload = {
        title: snap.form.title,
        client_id: snap.form.client_ids.length > 0 ? snap.form.client_ids[0] : null,
        material_type: snap.form.material_type,
        format: snap.form.format || null,
        genre: snap.form.genre || null,
        sub_genre:
          Array.isArray(snap.form.sub_genre) && snap.form.sub_genre.length > 0
            ? snap.form.sub_genre.join(", ")
            : null,
        status: snap.form.status,
        box_file_id: snap.form.box_file_id,
        file_url: snap.form.file_url,
      };

      await supabase.from("client_materials").update(payload).eq("id", materialId);

      await supabase.from("material_clients").delete().eq("material_id", materialId);
      if (snap.form.client_ids.length > 0) {
        await supabase.from("material_clients").insert(
          snap.form.client_ids.map((cid) => ({ material_id: materialId, client_id: cid }))
        );
      }
    },
  });

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
    <div>
      <Breadcrumb fallbackHref="/materials" fallbackLabel="Client Material" currentLabel={form.title || "Untitled"} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-black">
          {form.title || "Untitled Material"}
        </h1>
        <SavedIndicator
          saving={autoSave.saving}
          savedAt={autoSave.savedAt}
          error={autoSave.error}
          hasUndo={autoSave.hasUndo}
          onUndo={autoSave.undo}
        />
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

        <Field label="Clients">
          <MultiRelationPicker
            value={form.client_ids}
            onChange={(ids) => setForm({ ...form, client_ids: ids })}
            options={clientOptions}
            placeholder="Select clients..."
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Type">
            <Select
              value={form.material_type || ""}
              onChange={(e) => setForm({ ...form, material_type: e.target.value || null })}
              options={MATERIAL_TYPES}
              placeholder="Select..."
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
              onChange={(e) => setForm({ ...form, status: e.target.value as string })}
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
                            href={`/submissions/${r.submission_id}?${buildFromParams(`/materials/${materialId}`, form.title)}`}
                            className="text-zinc-400 hover:text-black transition-colors"
                            title="View submission"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                        <Link
                          href={`/contacts/${r.person_id}?${buildFromParams(`/materials/${materialId}`, form.title)}`}
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

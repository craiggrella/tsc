"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, Filter } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/shared/status-badge";

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

export function MaterialsClient({ userId }: MaterialsClientProps) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<MaterialStatus | "">("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const { data: matsData } = await supabase
        .from("client_materials")
        .select("*, client:clients!client_id(id, full_name)")
        .order("created_at", { ascending: false });
      setMaterials((matsData as MaterialRow[]) || []);
      setLoading(false);
    }
    load();
  }, []);

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

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-zinc-400">Loading...</p></div>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-black">Materials</h1>
          <p className="mt-1 text-sm text-zinc-500">Track scripts, pilots, and other materials.</p>
        </div>
        <button
          onClick={() => router.push("/materials/new")}
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
                  onClick={() => router.push(`/materials/${mat.id}`)}
                  className="border-b border-zinc-100 last:border-0 cursor-pointer hover:bg-zinc-50/50 transition-colors"
                >
                  <td className="px-3 py-2.5 text-zinc-700 text-xs whitespace-nowrap">
                    {mat.title || "Untitled"}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-700 text-xs whitespace-nowrap">
                    {mat.material_type}
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
    </div>
  );
}

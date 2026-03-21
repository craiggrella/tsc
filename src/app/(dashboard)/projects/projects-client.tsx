"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, Clapperboard, Filter } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/shared/status-badge";
import type { ProjectStatus } from "@/types/database";

interface ProjectRow {
  id: string;
  name: string;
  status: ProjectStatus;
  created_at: string;
}

interface ProjectsClientProps {
  userId: string;
}

const STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "rumored", label: "Rumored" },
  { value: "development", label: "Development" },
  { value: "pilot", label: "Pilot" },
  { value: "picked_up", label: "Picked Up" },
  { value: "current", label: "Current" },
  { value: "on_the_bubble", label: "On the Bubble" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function ProjectsClient({ userId }: ProjectsClientProps) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "">("");

  // Table display cache: project_id -> array of { name, id }
  const [tableCache, setTableCache] = useState<
    Record<string, { id: string; name: string }[]>
  >({});

  useEffect(() => {
    async function load() {
      const { data: projectsData } = await supabase.from("projects").select("*").order("name");
      setProjects(projectsData || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = [...projects];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (statusFilter) list = list.filter((p) => p.status === statusFilter);
    return list;
  }, [projects, search, statusFilter]);

  // Load table display data for visible projects
  useMemo(() => {
    const ids = filtered.map((p) => p.id).filter((id) => !tableCache[id]);
    if (ids.length === 0) return;

    supabase
      .from("project_companies")
      .select("project_id, company:companies(id, name)")
      .in("project_id", ids)
      .then(({ data }) => {
        const cache: Record<string, { id: string; name: string }[]> = {};
        for (const id of ids) cache[id] = [];
        for (const row of data || []) {
          const r = row as unknown as { project_id: string; company: { id: string; name: string } | null };
          if (!r.company || !cache[r.project_id]) continue;
          // Avoid duplicates
          if (!cache[r.project_id].some((c) => c.id === r.company!.id)) {
            cache[r.project_id].push({ id: r.company.id, name: r.company.name });
          }
        }
        setTableCache((prev) => ({ ...prev, ...cache }));
      });
  }, [filtered, supabase]);

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-zinc-400">Loading...</p></div>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-black">Projects</h1>
          <p className="mt-1 text-sm text-zinc-500">Track shows, films, and productions.</p>
        </div>
        <button
          onClick={() => router.push("/projects/new")}
          className="inline-flex items-center gap-1.5 rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {/* Search + filter */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-sm outline-none placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-400 transition-colors"
          />
        </div>
        <Filter className="h-3.5 w-3.5 text-zinc-400" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | "")}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-700 outline-none hover:border-zinc-300"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <span className="ml-auto text-xs text-zinc-400">
          {filtered.length} project{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/50">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Name</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Status</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Companies</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-12 text-center text-sm text-zinc-400">
                  <Clapperboard className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
                  No projects found.
                </td>
              </tr>
            ) : (
              filtered.map((project) => {
                const companies = tableCache[project.id] || [];
                return (
                  <tr
                    key={project.id}
                    onClick={() => router.push(`/projects/${project.id}`)}
                    className="border-b border-zinc-100 last:border-0 cursor-pointer hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="px-3 py-2.5 font-medium text-black">{project.name}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={project.status} />
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {companies.length === 0 ? (
                        <span className="text-zinc-400">{"\u2014"}</span>
                      ) : (
                        <span className="text-zinc-700">
                          {companies.map((c, i) => (
                            <span key={c.id}>
                              {i > 0 && ", "}
                              <Link
                                href={`/companies/${c.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="hover:text-black hover:underline"
                              >
                                {c.name}
                              </Link>
                            </span>
                          ))}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

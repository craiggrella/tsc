"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toPersonName } from "@/lib/format-name";
import { usePicklist, toSelectOptions } from "@/lib/picklists";
import { PicklistSelect } from "@/components/shared/picklist-select";

interface CompanyData {
  id: string;
  name: string;
}

interface ClientRow {
  id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  company_id: string | null;
  staff_level: string | null;
  notes: string | null;
  created_at: string;
  company: CompanyData | null;
  current_project?: string | null;
}

interface ClientsClientProps {
  userId: string;
}

export function ClientsClient({ userId }: ClientsClientProps) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [staffLevelFilter, setStaffLevelFilter] = useState<string | null>(null);

  const staffLevelItems = usePicklist("list_staff_levels");
  const staffLevelOptions = useMemo(() => toSelectOptions(staffLevelItems), [staffLevelItems]);

  useEffect(() => {
    async function load() {
      const [{ data: clientsData }, { data: creditsData }] = await Promise.all([
        supabase
          .from("clients")
          .select("*, company:companies!company_id(id, name)")
          .order("full_name"),
        supabase
          .from("client_credits")
          .select("client_id, project_name, project:projects!project_id(name)")
          .eq("credit_status", "current"),
      ]);

      // Build map of client_id -> current project name
      const currentProjectMap = new Map<string, string>();
      for (const c of creditsData || []) {
        const r = c as unknown as { client_id: string; project_name: string; project: { name: string } | null };
        const name = r.project?.name || r.project_name;
        if (name && !currentProjectMap.has(r.client_id)) {
          currentProjectMap.set(r.client_id, name);
        } else if (name && currentProjectMap.has(r.client_id)) {
          // Multiple current projects - append
          currentProjectMap.set(r.client_id, currentProjectMap.get(r.client_id) + ", " + name);
        }
      }

      const enriched = (clientsData || []).map((client) => ({
        ...client,
        current_project: currentProjectMap.get(client.id) || null,
      })) as ClientRow[];

      setClients(enriched);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = clients;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          c.company?.name.toLowerCase().includes(q)
      );
    }
    if (projectFilter) {
      const q = projectFilter.toLowerCase();
      list = list.filter((c) => c.current_project?.toLowerCase().includes(q));
    }
    if (staffLevelFilter) {
      const matchLabel = staffLevelOptions.find((o) => o.value === staffLevelFilter)?.label;
      list = list.filter((c) => {
        if (!c.staff_level) return false;
        const cl = c.staff_level.toLowerCase();
        return (
          cl === staffLevelFilter.toLowerCase() ||
          (matchLabel && cl === matchLabel.toLowerCase())
        );
      });
    }
    return list;
  }, [clients, search, projectFilter, staffLevelFilter, staffLevelOptions]);

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-zinc-400">Loading...</p></div>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-black">Clients</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage your talent roster.</p>
        </div>
        <button
          onClick={() => router.push("/clients/new")}
          className="inline-flex items-center gap-1.5 rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Client
        </button>
      </div>

      {/* Filters */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by name..."
            className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-sm outline-none placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-400 transition-colors"
          />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
          <input
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            placeholder="Filter by project..."
            className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-sm outline-none placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-400 transition-colors"
          />
        </div>
        <PicklistSelect
          value={staffLevelFilter}
          onChange={(v) => setStaffLevelFilter(v)}
          options={staffLevelOptions}
          placeholder="Filter by staff level..."
          manageTable="list_staff_levels"
        />
      </div>

      {/* Table */}
      <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/50">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Name</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Current Project</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Staff Level</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-12 text-center text-sm text-zinc-400">
                  <Users className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
                  No clients found.
                </td>
              </tr>
            ) : (
              filtered.map((client) => (
                <tr
                  key={client.id}
                  onClick={() => router.push(`/clients/${client.id}`)}
                  className="border-b border-zinc-100 last:border-0 cursor-pointer hover:bg-zinc-50/50 transition-colors"
                >
                  <td className="px-3 py-2.5 font-medium text-black">{toPersonName(client.full_name)}</td>
                  <td className="px-3 py-2.5 text-zinc-700">{client.current_project || "\u2014"}</td>
                  <td className="px-3 py-2.5 text-zinc-500">{client.staff_level || "\u2014"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

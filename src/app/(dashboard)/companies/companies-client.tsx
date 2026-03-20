"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface CompanyRow {
  id: string;
  name: string;
  types: string[];
  outlet: string | null;
  department: string | null;
  phone: string | null;
  created_at: string;
}

interface CompaniesClientProps {
  userId: string;
}

export function CompaniesClient({ userId }: CompaniesClientProps) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("companies")
        .select("id, name, types, outlet, department, phone, created_at")
        .order("name");
      setCompanies((data || []) as CompanyRow[]);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return companies;
    const q = search.toLowerCase();
    return companies.filter((c) => c.name.toLowerCase().includes(q));
  }, [companies, search]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-zinc-400">Loading...</p>
      </div>
    );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-black">Companies</h1>
          <p className="mt-1 text-sm text-zinc-500">Studios, networks, and production companies.</p>
        </div>
        <button
          onClick={() => router.push("/companies/new")}
          className="inline-flex items-center gap-1.5 rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Company
        </button>
      </div>

      {/* Search */}
      <div className="mt-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search companies..."
          className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-sm outline-none placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-400 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/50">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Name</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Types</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Outlet</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Department</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-12 text-center text-sm text-zinc-400">
                  <Building2 className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
                  No companies found.
                </td>
              </tr>
            ) : (
              filtered.map((company) => (
                <tr
                  key={company.id}
                  onClick={() => router.push(`/companies/${company.id}`)}
                  className="border-b border-zinc-100 last:border-0 cursor-pointer hover:bg-zinc-50/50 transition-colors"
                >
                  <td className="px-3 py-2.5 font-medium text-black">{company.name}</td>
                  <td className="px-3 py-2.5 text-zinc-500">
                    {company.types && company.types.length > 0
                      ? company.types.join(", ")
                      : "\u2014"}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-500">{company.outlet || "\u2014"}</td>
                  <td className="px-3 py-2.5 text-zinc-500">{company.department || "\u2014"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

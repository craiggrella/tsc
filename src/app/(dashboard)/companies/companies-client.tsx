"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usePicklist, toSelectOptions } from "@/lib/picklists";
import { toCompanyName } from "@/lib/format-name";
import { MultiFilterDropdown } from "@/components/shared/multi-filter-dropdown";

interface CompanyRow {
  id: string;
  name: string;
  types: string[] | null;
  outlet: string[] | null;
  department: string[] | null;
  phone: string | null;
  buyer_type: string | null;
  created_at: string;
}

interface CompaniesClientProps {
  userId: string;
}

export function CompaniesClient({ userId }: CompaniesClientProps) {
  const supabase = createClient();
  const router = useRouter();
  const buyerTypesItems = usePicklist("list_buyer_types");
  const BUYER_TYPES = toSelectOptions(buyerTypesItems);
  const companyTypesItems = usePicklist("list_company_types");
  const COMPANY_TYPES = toSelectOptions(companyTypesItems);
  const outletsItems = usePicklist("list_outlets");
  const OUTLETS = toSelectOptions(outletsItems);
  const departmentsItems = usePicklist("list_departments");
  const DEPARTMENTS = toSelectOptions(departmentsItems);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [search, setSearch] = useState("");
  const [buyerTypeFilter, setBuyerTypeFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [outletFilter, setOutletFilter] = useState<string[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("companies")
        .select("id, name, types, outlet, department, phone, buyer_type, created_at")
        .order("name");
      setCompanies((data || []) as CompanyRow[]);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter((c) => {
      if (q && !c.name?.toLowerCase().includes(q)) return false;
      if (buyerTypeFilter.length > 0 && (!c.buyer_type || !buyerTypeFilter.includes(c.buyer_type))) return false;
      if (typeFilter.length > 0 && !(c.types || []).some((t) => typeFilter.includes(t))) return false;
      if (outletFilter.length > 0 && !(c.outlet || []).some((o) => outletFilter.includes(o))) return false;
      if (departmentFilter.length > 0 && !(c.department || []).some((d) => departmentFilter.includes(d))) return false;
      return true;
    });
  }, [companies, search, buyerTypeFilter, typeFilter, outletFilter, departmentFilter]);

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

      {/* Search + Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies..."
            className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-sm outline-none placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-400 transition-colors"
          />
        </div>
        <MultiFilterDropdown label="Buyer" options={BUYER_TYPES} selected={buyerTypeFilter} onChange={setBuyerTypeFilter} />
        <MultiFilterDropdown label="Type" options={COMPANY_TYPES} selected={typeFilter} onChange={setTypeFilter} />
        <MultiFilterDropdown label="Outlet" options={OUTLETS} selected={outletFilter} onChange={setOutletFilter} />
        <MultiFilterDropdown label="Dept" options={DEPARTMENTS} selected={departmentFilter} onChange={setDepartmentFilter} />
        {(buyerTypeFilter.length > 0 || typeFilter.length > 0 || outletFilter.length > 0 || departmentFilter.length > 0) && (
          <button
            onClick={() => {
              setBuyerTypeFilter([]);
              setTypeFilter([]);
              setOutletFilter([]);
              setDepartmentFilter([]);
            }}
            className="text-xs text-zinc-400 hover:text-zinc-600 px-2"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-zinc-400">
          {filtered.length} {filtered.length === 1 ? "company" : "companies"}
        </span>
      </div>

      {/* Table */}
      <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/50">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Name</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Buyer</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Types</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Outlet</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Department</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-12 text-center text-sm text-zinc-400">
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
                  <td className="px-3 py-2.5 font-medium text-black">{toCompanyName(company.name)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {company.buyer_type ? (
                      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        {company.buyer_type}
                      </span>
                    ) : (
                      <span className="text-zinc-400">{"—"}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-500">
                    {company.types && company.types.length > 0
                      ? company.types.map((t) => t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())).join(", ")
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-500">{company.outlet && company.outlet.length > 0 ? company.outlet.map((t) => t.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())).join(", ") : "—"}</td>
                  <td className="px-3 py-2.5 text-zinc-500">{company.department && company.department.length > 0 ? company.department.map((t) => t.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())).join(", ") : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

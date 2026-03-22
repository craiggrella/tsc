"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Contact, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatPhone } from "@/lib/utils";
import { usePicklist, toSelectOptions } from "@/lib/picklists";

interface CompanyData {
  id: string;
  name: string;
}

interface ContactRow {
  id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  type: string | null;
  exec_level: string | null;
  buyer_type: string | null;
  company_id: string | null;
  department: string[];
  assistant_id: string | null;
  notes: string | null;
  created_at: string;
  company: CompanyData | null;
}


function MultiFilterDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const display =
    selected.length === 0
      ? `${label}: All`
      : `${label}: ${selected.length}`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:border-zinc-300 transition-colors"
      >
        {display} <span className="ml-1 text-zinc-400">&#9662;</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-48 rounded-md border border-zinc-200 bg-white shadow-lg py-1">
          <button
            onClick={() => onChange([])}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-zinc-50 ${
              selected.length === 0 ? "text-black font-medium" : "text-zinc-500"
            }`}
          >
            All
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(
                  selected.includes(opt.value)
                    ? selected.filter((v) => v !== opt.value)
                    : [...selected, opt.value]
                );
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-zinc-50"
            >
              <div
                className={`h-3.5 w-3.5 rounded border ${
                  selected.includes(opt.value)
                    ? "border-black bg-black"
                    : "border-zinc-300"
                } flex items-center justify-center`}
              >
                {selected.includes(opt.value) && (
                  <Check className="h-2.5 w-2.5 text-white" />
                )}
              </div>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ContactsClientProps {
  userId: string;
}

export function ContactsClient({ userId }: ContactsClientProps) {
  const supabase = createClient();
  const router = useRouter();
  const buyerTypesItems = usePicklist("list_buyer_types");
  const BUYER_TYPES = toSelectOptions(buyerTypesItems);
  const personTypesItems = usePicklist("list_contact_types");
  const PERSON_TYPES = toSelectOptions(personTypesItems);
  const execLevelsItems = usePicklist("list_contact_levels");
  const EXEC_LEVELS = toSelectOptions(execLevelsItems);
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Multi-select filter state
  const [buyerTypeFilter, setBuyerTypeFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [levelFilter, setLevelFilter] = useState<string[]>([]);
  const [hasBuyerType, setHasBuyerType] = useState(false);

  // Table display: primary/first phone and email per contact
  const [tablePhones, setTablePhones] = useState<Record<string, string>>({});
  const [tableEmails, setTableEmails] = useState<Record<string, string>>({});

  // Read URL params on mount
  useEffect(() => {
    const bt = searchParams.get("buyer_type");
    const ct = searchParams.get("type");
    const lv = searchParams.get("level");
    const hbt = searchParams.get("has_buyer_type");
    if (bt) setBuyerTypeFilter(bt.split(","));
    if (ct) setTypeFilter(ct.split(","));
    if (lv) setLevelFilter(lv.split(","));
    if (hbt === "true") setHasBuyerType(true);
  }, []);

  // Build and execute query with filters
  function buildQuery(searchValue?: string) {
    let query = supabase
      .from("people")
      .select("*, company:companies!company_id(id, name)", { count: "exact" });

    if (hasBuyerType) query = query.not("buyer_type", "is", null);
    if (buyerTypeFilter.length > 0) query = query.in("buyer_type", buyerTypeFilter);
    if (typeFilter.length > 0) query = query.in("type", typeFilter);
    if (levelFilter.length > 0) query = query.in("exec_level", levelFilter);

    if (searchValue && searchValue.trim()) {
      query = query.ilike("full_name", `%${searchValue}%`);
    }

    return query.order("full_name").range(0, 49);
  }

  async function fetchContacts(searchValue?: string) {
    const { data, count } = await buildQuery(searchValue);
    setContacts((data || []) as ContactRow[]);
    setTotalCount(count || 0);

    // If searching by name didn't find much, also search by company name
    if (searchValue && searchValue.trim()) {
      const { data: matchingCompanies } = await supabase
        .from("companies")
        .select("id")
        .ilike("name", `%${searchValue}%`)
        .limit(20);

      if (matchingCompanies && matchingCompanies.length > 0) {
        const companyIds = matchingCompanies.map((c) => c.id);
        let companyQuery = supabase
          .from("people")
          .select("*, company:companies!company_id(id, name)")
          .in("company_id", companyIds);

        if (buyerTypeFilter.length > 0) companyQuery = companyQuery.in("buyer_type", buyerTypeFilter);
        if (typeFilter.length > 0) companyQuery = companyQuery.in("type", typeFilter);
        if (levelFilter.length > 0) companyQuery = companyQuery.in("exec_level", levelFilter);

        const { data: byCompany } = await companyQuery.order("full_name").limit(50);

        const nameResults = (data || []) as ContactRow[];
        const seen = new Set(nameResults.map((c) => c.id));
        const merged = [...nameResults, ...((byCompany || []) as ContactRow[]).filter((c) => !seen.has(c.id))];
        setContacts(merged);
      }
    }
  }

  // Initial load — wait for URL params to be parsed
  const initialLoaded = useRef(false);
  useEffect(() => {
    // Skip first render, wait for URL params
    if (!initialLoaded.current) {
      initialLoaded.current = true;
      // Small delay to let URL param useEffect run first
      const timer = setTimeout(() => {
        fetchContacts().then(() => setLoading(false));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  // Re-fetch when filters change (after initial load)
  const filtersInitialized = useRef(false);
  useEffect(() => {
    if (!initialLoaded.current) return;
    if (!filtersInitialized.current) {
      filtersInitialized.current = true;
      // This is the first filter state set (from URL params or default)
      fetchContacts(search).then(() => setLoading(false));
      return;
    }
    fetchContacts(search);
  }, [buyerTypeFilter, typeFilter, levelFilter, hasBuyerType]);

  // Fetch primary/first phone and email for contacts in the table
  useEffect(() => {
    if (contacts.length === 0) return;
    const ids = contacts.map((c) => c.id);
    Promise.all([
      supabase
        .from("contact_phones")
        .select("entity_id, number, is_primary")
        .eq("entity_type", "person")
        .in("entity_id", ids)
        .order("is_primary", { ascending: false }),
      supabase
        .from("contact_emails")
        .select("entity_id, address, is_primary")
        .eq("entity_type", "person")
        .in("entity_id", ids)
        .order("is_primary", { ascending: false }),
    ]).then(([{ data: phones }, { data: emails }]) => {
      const phoneMap: Record<string, string> = {};
      for (const p of phones || []) {
        if (!phoneMap[p.entity_id]) phoneMap[p.entity_id] = p.number;
      }
      setTablePhones(phoneMap);

      const emailMap: Record<string, string> = {};
      for (const e of emails || []) {
        if (!emailMap[e.entity_id]) emailMap[e.entity_id] = e.address;
      }
      setTableEmails(emailMap);
    });
  }, [contacts, supabase]);

  function handleSearchChange(value: string) {
    setSearch(value);
    clearTimeout(searchTimeout.current);
    if (!value.trim()) {
      fetchContacts();
      return;
    }
    searchTimeout.current = setTimeout(() => {
      fetchContacts(value);
    }, 250);
  }

  const activeFilterCount = buyerTypeFilter.length + typeFilter.length + levelFilter.length + (hasBuyerType ? 1 : 0);

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-zinc-400">Loading...</p></div>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-black">Contacts</h1>
          <p className="mt-1 text-sm text-zinc-500">Industry contacts and companies.</p>
        </div>
        <button
          onClick={() => router.push("/contacts/new")}
          className="inline-flex items-center gap-1.5 rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Contact
        </button>
      </div>

      {/* Search + filter */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search contacts..."
            className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-sm outline-none placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-400 transition-colors"
          />
        </div>
        <span className="text-xs text-zinc-400">
          {totalCount.toLocaleString()} contact{totalCount !== 1 ? "s" : ""}
          {activeFilterCount > 0 && (
            <span className="ml-1 text-amber-600">({activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""})</span>
          )}
        </span>
      </div>

      {/* Filter dropdowns */}
      <div className="mt-3 flex items-center gap-2">
        <MultiFilterDropdown label="Buyer" options={BUYER_TYPES} selected={buyerTypeFilter} onChange={setBuyerTypeFilter} />
        <MultiFilterDropdown label="Type" options={PERSON_TYPES} selected={typeFilter} onChange={setTypeFilter} />
        <MultiFilterDropdown label="Level" options={EXEC_LEVELS} selected={levelFilter} onChange={setLevelFilter} />
        {activeFilterCount > 0 && (
          <button
            onClick={() => { setBuyerTypeFilter([]); setTypeFilter([]); setLevelFilter([]); setHasBuyerType(false); }}
            className="text-[11px] text-zinc-400 hover:text-black"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/50">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Name</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Title</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Company</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Type</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Phone</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Email</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-sm text-zinc-400">
                  <Contact className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
                  {search || activeFilterCount > 0 ? "No contacts match your search." : "No contacts found."}
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr
                  key={contact.id}
                  onClick={() => router.push(`/contacts/${contact.id}`)}
                  className="border-b border-zinc-100 last:border-0 cursor-pointer hover:bg-zinc-50/50 transition-colors"
                >
                  <td className="px-3 py-2.5 font-medium text-black whitespace-nowrap">{contact.full_name}</td>
                  <td className="px-3 py-2.5 text-zinc-500 whitespace-nowrap">{contact.title || "\u2014"}</td>
                  <td className="px-3 py-2.5 text-zinc-700 whitespace-nowrap">{contact.company?.name || "\u2014"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {contact.type ? (
                      <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                        {contact.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    ) : "\u2014"}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-500 text-xs whitespace-nowrap">{formatPhone(tablePhones[contact.id]) || "\u2014"}</td>
                  <td className="px-3 py-2.5 text-zinc-500 text-xs whitespace-nowrap">{tableEmails[contact.id] || "\u2014"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Result count */}
      {contacts.length > 0 && (
        <p className="mt-2 text-xs text-zinc-400">
          Showing {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

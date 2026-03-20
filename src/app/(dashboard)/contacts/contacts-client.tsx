"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Contact } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatPhone } from "@/lib/utils";

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
  company_id: string | null;
  department: string[];
  assistant_id: string | null;
  notes: string | null;
  created_at: string;
  company: CompanyData | null;
}

interface ContactsClientProps {
  userId: string;
}

export function ContactsClient({ userId }: ContactsClientProps) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Table display: primary/first phone and email per contact
  const [tablePhones, setTablePhones] = useState<Record<string, string>>({});
  const [tableEmails, setTableEmails] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      const { data: contactsData, count } = await supabase
        .from("people")
        .select("*, company:companies!company_id(id, name)", { count: "exact" })
        .order("full_name")
        .range(0, 49);
      setContacts(contactsData || []);
      setTotalCount(count || 0);
      setLoading(false);
    }
    load();
  }, []);

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
      supabase
        .from("people")
        .select("*, company:companies!company_id(id, name)", { count: "exact" })
        .order("full_name")
        .range(0, 49)
        .then(({ data, count }) => {
          if (data) setContacts(data as ContactRow[]);
          setTotalCount(count || 0);
        });
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      // Search by person name
      const { data: byName } = await supabase
        .from("people")
        .select("*, company:companies!company_id(id, name)")
        .ilike("full_name", `%${value}%`)
        .order("full_name")
        .limit(50);

      // Search by company name — find company IDs, then find people at those companies
      const { data: matchingCompanies } = await supabase
        .from("companies")
        .select("id")
        .ilike("name", `%${value}%`)
        .limit(20);

      let byCompany: ContactRow[] = [];
      if (matchingCompanies && matchingCompanies.length > 0) {
        const companyIds = matchingCompanies.map((c) => c.id);
        const { data } = await supabase
          .from("people")
          .select("*, company:companies!company_id(id, name)")
          .in("company_id", companyIds)
          .order("full_name")
          .limit(50);
        byCompany = (data || []) as ContactRow[];
      }

      // Merge and dedupe
      const nameResults = (byName || []) as ContactRow[];
      const seen = new Set(nameResults.map((c) => c.id));
      const merged = [...nameResults, ...byCompany.filter((c) => !seen.has(c.id))];
      setContacts(merged);
    }, 250);
  }

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
        </span>
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
                  {search ? "No contacts match your search." : "No contacts found."}
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

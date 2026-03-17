"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Contact, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  RelationPicker,
  type RelationOption,
} from "@/components/shared/relation-picker";
import {
  DetailPanel,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/shared/detail-panel";
import { formatPhone } from "@/lib/utils";
import type { PersonType, ExecLevel } from "@/types/database";

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
  type: PersonType | null;
  exec_level: ExecLevel | null;
  company_id: string | null;
  department: string[];
  phone_cell: string | null;
  phone_office: string | null;
  phone_home: string | null;
  phone_other: string | null;
  preferred_phone: string | null;
  email_office: string | null;
  email_home: string | null;
  email_other: string | null;
  preferred_email: string | null;
  website: string | null;
  linkedin: string | null;
  instagram: string | null;
  assistant_id: string | null;
  notes: string | null;
  created_at: string;
  company: CompanyData | null;
}

interface ContactsClientProps {
  initialContacts: ContactRow[];
  companies: CompanyData[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  initialSearch: string;
  initialTypeFilter: string;
}

const PERSON_TYPES: { value: PersonType; label: string }[] = [
  { value: "contact", label: "Contact" },
  { value: "potential_client", label: "Potential Client" },
  { value: "vendor", label: "Vendor" },
  { value: "assistant", label: "Assistant" },
  { value: "executive", label: "Executive" },
];

const EXEC_LEVELS: { value: ExecLevel; label: string }[] = [
  { value: "intern", label: "Intern" },
  { value: "assistant", label: "Assistant" },
  { value: "coordinator", label: "Coordinator" },
  { value: "manager", label: "Manager" },
  { value: "director", label: "Director" },
  { value: "vice_president", label: "Vice President" },
  { value: "senior_vice_president", label: "Senior VP" },
  { value: "executive_vice_president", label: "Executive VP" },
  { value: "president", label: "President" },
  { value: "chair", label: "Chair" },
];

const emptyForm = {
  full_name: "",
  first_name: null as string | null,
  last_name: null as string | null,
  title: null as string | null,
  type: null as PersonType | null,
  exec_level: null as ExecLevel | null,
  company_id: null as string | null,
  department: [] as string[],
  phone_cell: null as string | null,
  phone_office: null as string | null,
  phone_home: null as string | null,
  phone_other: null as string | null,
  preferred_phone: null as string | null,
  email_office: null as string | null,
  email_home: null as string | null,
  email_other: null as string | null,
  preferred_email: null as string | null,
  website: null as string | null,
  linkedin: null as string | null,
  instagram: null as string | null,
  assistant_id: null as string | null,
  notes: null as string | null,
};

export function ContactsClient({
  initialContacts,
  companies,
  totalCount,
  currentPage,
  pageSize,
  initialSearch,
  initialTypeFilter,
}: ContactsClientProps) {
  const supabase = createClient();
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactRow[]>(initialContacts);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState(initialSearch);
  const [typeFilter, setTypeFilter] = useState(initialTypeFilter);
  const [activeTab, setActiveTab] = useState("info");
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [relatedMeetings, setRelatedMeetings] = useState<
    { id: string; title: string; meeting_status: string; meeting_at: string | null }[]
  >([]);
  const [relatedCalls, setRelatedCalls] = useState<
    { id: string; about: string; call_status: string; due_date: string | null }[]
  >([]);
  const [callsHasMore, setCallsHasMore] = useState(false);
  const [callsLoading, setCallsLoading] = useState(false);

  const totalPages = Math.ceil(totalCount / pageSize);

  // Navigate with search params
  function navigate(overrides: { q?: string; type?: string; page?: number }) {
    const params = new URLSearchParams();
    const q = overrides.q ?? search;
    const type = overrides.type ?? typeFilter;
    const page = overrides.page ?? 1;
    if (q) params.set("q", q);
    if (type) params.set("type", type);
    if (page > 1) params.set("page", String(page));
    router.push(`/contacts${params.toString() ? `?${params}` : ""}`);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      navigate({ q: value, page: 1 });
    }, 300);
  }

  function handleTypeChange(value: string) {
    setTypeFilter(value);
    navigate({ type: value, page: 1 });
  }

  const companyOptions: RelationOption[] = useMemo(
    () => companies.map((c) => ({ id: c.id, label: c.name })),
    [companies]
  );

  function openNew() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setActiveTab("info");
    setPanelOpen(true);
  }

  async function openEdit(contact: ContactRow) {
    setEditingId(contact.id);
    setForm({
      full_name: contact.full_name,
      first_name: contact.first_name,
      last_name: contact.last_name,
      title: contact.title,
      type: contact.type,
      exec_level: contact.exec_level,
      company_id: contact.company_id,
      department: contact.department,
      phone_cell: contact.phone_cell,
      phone_office: contact.phone_office,
      phone_home: contact.phone_home,
      phone_other: contact.phone_other,
      preferred_phone: contact.preferred_phone,
      email_office: contact.email_office,
      email_home: contact.email_home,
      email_other: contact.email_other,
      preferred_email: contact.preferred_email,
      website: contact.website,
      linkedin: contact.linkedin,
      instagram: contact.instagram,
      assistant_id: contact.assistant_id,
      notes: contact.notes,
    });
    setActiveTab("info");
    setPanelOpen(true);

    const [{ data: meetings }, { data: calls }] = await Promise.all([
      supabase
        .from("meeting_people")
        .select("meeting:meetings(id, title, meeting_status, meeting_at)")
        .eq("person_id", contact.id),
      supabase
        .from("calls")
        .select("id, about, call_status, due_date")
        .eq("contact_id", contact.id)
        .order("due_date", { ascending: false })
        .range(0, 20),
    ]);
    setRelatedMeetings(
      (meetings || [])
        .map((m: Record<string, unknown>) => m.meeting as { id: string; title: string; meeting_status: string; meeting_at: string | null })
        .filter(Boolean)
    );
    setRelatedCalls(calls || []);
    setCallsHasMore((calls || []).length > 20);
  }

  async function loadMoreCalls(contactId: string) {
    setCallsLoading(true);
    try {
      const { data } = await supabase
        .from("calls")
        .select("id, about, call_status, due_date")
        .eq("contact_id", contactId)
        .order("due_date", { ascending: false })
        .range(relatedCalls.length, relatedCalls.length + 20);
      if (data) {
        setRelatedCalls((prev) => [...prev, ...data]);
        setCallsHasMore(data.length > 20);
      }
    } finally {
      setCallsLoading(false);
    }
  }

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (editingId) {
        const { data } = await supabase
          .from("people")
          .update(payload)
          .eq("id", editingId)
          .select("*, company:companies!company_id(id, name)")
          .single();
        if (data) {
          setContacts((prev) =>
            prev.map((c) => (c.id === editingId ? (data as ContactRow) : c))
          );
        }
      } else {
        const { data } = await supabase
          .from("people")
          .insert(payload)
          .select("*, company:companies!company_id(id, name)")
          .single();
        if (data) {
          setContacts((prev) =>
            [...prev, data as ContactRow].sort((a, b) =>
              a.full_name.localeCompare(b.full_name)
            )
          );
        }
      }
      setPanelOpen(false);
    } finally {
      setSaving(false);
    }
  }, [form, editingId, supabase]);

  const handleDelete = useCallback(async () => {
    if (!editingId || !confirm("Delete this contact?")) return;
    setDeleting(true);
    try {
      await supabase.from("people").delete().eq("id", editingId);
      setContacts((prev) => prev.filter((c) => c.id !== editingId));
      setPanelOpen(false);
    } finally {
      setDeleting(false);
    }
  }, [editingId, supabase]);

  function getPreferredPhone(c: ContactRow): string {
    if (c.preferred_phone === "cell" && c.phone_cell) return formatPhone(c.phone_cell);
    if (c.preferred_phone === "office" && c.phone_office) return formatPhone(c.phone_office);
    if (c.preferred_phone === "home" && c.phone_home) return formatPhone(c.phone_home);
    if (c.preferred_phone === "other" && c.phone_other) return formatPhone(c.phone_other);
    return formatPhone(c.phone_cell || c.phone_office);
  }

  function getPreferredEmail(c: ContactRow): string {
    if (c.preferred_email === "office" && c.email_office) return c.email_office;
    if (c.preferred_email === "home" && c.email_home) return c.email_home;
    if (c.preferred_email === "other" && c.email_other) return c.email_other;
    return c.email_office || c.email_home || "—";
  }

  const tabs = [
    { id: "info", label: "Info" },
    ...(editingId
      ? [
          { id: "meetings", label: "Meetings" },
          { id: "calls", label: "Calls" },
        ]
      : []),
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-black">Contacts</h1>
          <p className="mt-1 text-sm text-zinc-500">Industry contacts and companies.</p>
        </div>
        <button
          onClick={openNew}
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
        <select
          value={typeFilter}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-700 outline-none hover:border-zinc-300"
        >
          <option value="">All Types</option>
          {PERSON_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <span className="text-xs text-zinc-400">
          {totalCount.toLocaleString()} contact{totalCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
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
                  onClick={() => openEdit(contact)}
                  className="border-b border-zinc-100 last:border-0 cursor-pointer hover:bg-zinc-50/50 transition-colors"
                >
                  <td className="px-3 py-2.5 font-medium text-black">{contact.full_name}</td>
                  <td className="px-3 py-2.5 text-zinc-500">{contact.title || "—"}</td>
                  <td className="px-3 py-2.5 text-zinc-700">{contact.company?.name || "—"}</td>
                  <td className="px-3 py-2.5">
                    {contact.type ? (
                      <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                        {contact.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-500 text-xs font-mono">{getPreferredPhone(contact)}</td>
                  <td className="px-3 py-2.5 text-zinc-500 text-xs">{getPreferredEmail(contact)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-zinc-400">
            Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount.toLocaleString()}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage <= 1}
              onClick={() => navigate({ page: currentPage - 1 })}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3 w-3" />
              Prev
            </button>
            <span className="px-2 text-xs text-zinc-500">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => navigate({ page: currentPage + 1 })}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      <DetailPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editingId ? form.full_name || "Edit Contact" : "New Contact"}
        width="xl"
        footer={
          <div className="flex items-center justify-between">
            <div>
              {editingId && (
                <button onClick={handleDelete} disabled={deleting} className="text-xs text-red-500 hover:text-red-700 transition-colors">
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPanelOpen(false)} className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        }
      >
        {tabs.length > 1 && (
          <div className="mb-4 flex gap-1 border-b border-zinc-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-black text-black"
                    : "border-transparent text-zinc-400 hover:text-zinc-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {activeTab === "info" && (
          <div className="space-y-4">
            <Field label="Full Name">
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Full name" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name">
                <Input value={form.first_name || ""} onChange={(e) => setForm({ ...form, first_name: e.target.value || null })} />
              </Field>
              <Field label="Last Name">
                <Input value={form.last_name || ""} onChange={(e) => setForm({ ...form, last_name: e.target.value || null })} />
              </Field>
            </div>
            <Field label="Title">
              <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value || null })} placeholder="Job title" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <Select
                  value={form.type || ""}
                  onChange={(e) => setForm({ ...form, type: (e.target.value || null) as PersonType | null })}
                  options={PERSON_TYPES}
                  placeholder="Select..."
                />
              </Field>
              <Field label="Exec Level">
                <Select
                  value={form.exec_level || ""}
                  onChange={(e) => setForm({ ...form, exec_level: (e.target.value || null) as ExecLevel | null })}
                  options={EXEC_LEVELS}
                  placeholder="Select..."
                />
              </Field>
            </div>
            <Field label="Company">
              <RelationPicker value={form.company_id} onChange={(id) => setForm({ ...form, company_id: id })} options={companyOptions} placeholder="Select company..." />
            </Field>

            {/* Phones */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500">Phone Numbers</p>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Cell">
                  <Input value={form.phone_cell || ""} onChange={(e) => setForm({ ...form, phone_cell: e.target.value || null })} />
                </Field>
                <Field label="Office">
                  <Input value={form.phone_office || ""} onChange={(e) => setForm({ ...form, phone_office: e.target.value || null })} />
                </Field>
                <Field label="Home">
                  <Input value={form.phone_home || ""} onChange={(e) => setForm({ ...form, phone_home: e.target.value || null })} />
                </Field>
                <Field label="Other">
                  <Input value={form.phone_other || ""} onChange={(e) => setForm({ ...form, phone_other: e.target.value || null })} />
                </Field>
              </div>
              <Field label="Preferred Phone">
                <Select
                  value={form.preferred_phone || ""}
                  onChange={(e) => setForm({ ...form, preferred_phone: e.target.value || null })}
                  options={[
                    { value: "cell", label: "Cell" },
                    { value: "office", label: "Office" },
                    { value: "home", label: "Home" },
                    { value: "other", label: "Other" },
                  ]}
                  placeholder="None"
                />
              </Field>
            </div>

            {/* Emails */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500">Email Addresses</p>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Office">
                  <Input type="email" value={form.email_office || ""} onChange={(e) => setForm({ ...form, email_office: e.target.value || null })} />
                </Field>
                <Field label="Home">
                  <Input type="email" value={form.email_home || ""} onChange={(e) => setForm({ ...form, email_home: e.target.value || null })} />
                </Field>
              </div>
              <Field label="Other Email">
                <Input type="email" value={form.email_other || ""} onChange={(e) => setForm({ ...form, email_other: e.target.value || null })} />
              </Field>
              <Field label="Preferred Email">
                <Select
                  value={form.preferred_email || ""}
                  onChange={(e) => setForm({ ...form, preferred_email: e.target.value || null })}
                  options={[
                    { value: "office", label: "Office" },
                    { value: "home", label: "Home" },
                    { value: "other", label: "Other" },
                  ]}
                  placeholder="None"
                />
              </Field>
            </div>

            {/* Social */}
            <div className="grid grid-cols-3 gap-2">
              <Field label="Website">
                <Input value={form.website || ""} onChange={(e) => setForm({ ...form, website: e.target.value || null })} />
              </Field>
              <Field label="LinkedIn">
                <Input value={form.linkedin || ""} onChange={(e) => setForm({ ...form, linkedin: e.target.value || null })} />
              </Field>
              <Field label="Instagram">
                <Input value={form.instagram || ""} onChange={(e) => setForm({ ...form, instagram: e.target.value || null })} />
              </Field>
            </div>

            <Field label="Notes">
              <Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} placeholder="Notes..." />
            </Field>
          </div>
        )}

        {activeTab === "meetings" && (
          <div className="space-y-2">
            {relatedMeetings.length === 0 ? (
              <p className="text-sm text-zinc-400 py-4 text-center">No meetings yet.</p>
            ) : (
              relatedMeetings.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-black">{m.title}</p>
                    <p className="text-xs text-zinc-500">{m.meeting_at ? new Date(m.meeting_at).toLocaleDateString() : "No date"}</p>
                  </div>
                  <StatusBadge status={m.meeting_status} />
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "calls" && (
          <div className="space-y-2">
            {relatedCalls.length === 0 ? (
              <p className="text-sm text-zinc-400 py-4 text-center">No calls yet.</p>
            ) : (
              <>
                {relatedCalls.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-black">{c.about}</p>
                      <p className="text-xs text-zinc-500">{c.due_date ? new Date(c.due_date).toLocaleDateString() : "No date"}</p>
                    </div>
                    <StatusBadge status={c.call_status} />
                  </div>
                ))}
                {callsHasMore && editingId && (
                  <button
                    onClick={() => loadMoreCalls(editingId)}
                    disabled={callsLoading}
                    className="w-full py-2 text-xs text-zinc-500 hover:text-black transition-colors disabled:opacity-50"
                  >
                    {callsLoading ? "Loading..." : "Load more calls"}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </DetailPanel>
    </div>
  );
}

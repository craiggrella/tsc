"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
import {
  PhoneSection,
  EmailSection,
  AddressSection,
  SocialSection,
  syncPhones,
  syncEmails,
  syncAddresses,
  syncSocials,
  type PhoneRecord,
  type EmailRecord,
  type AddressRecord,
  type SocialRecord,
} from "@/components/shared/contact-info-editor";
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
  openContactId?: string | null;
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
  openContactId,
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
  const hasAutoOpened = useRef(false);

  const [relatedMeetings, setRelatedMeetings] = useState<
    { id: string; title: string; meeting_status: string; meeting_at: string | null }[]
  >([]);
  const [relatedCalls, setRelatedCalls] = useState<
    { id: string; about: string; call_status: string; due_date: string | null }[]
  >([]);
  const [callsHasMore, setCallsHasMore] = useState(false);
  const [callsLoading, setCallsLoading] = useState(false);
  const [relatedSubmissions, setRelatedSubmissions] = useState<
    { id: string; description: string; status: string }[]
  >([]);

  // Sub-record state for phones/emails/addresses
  const [phones, setPhones] = useState<PhoneRecord[]>([]);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [addresses, setAddresses] = useState<AddressRecord[]>([]);
  const [origPhoneIds, setOrigPhoneIds] = useState<Set<string>>(new Set());
  const [origEmailIds, setOrigEmailIds] = useState<Set<string>>(new Set());
  const [origAddressIds, setOrigAddressIds] = useState<Set<string>>(new Set());
  const [socials, setSocials] = useState<SocialRecord[]>([]);
  const [origSocialIds, setOrigSocialIds] = useState<Set<string>>(new Set());

  const totalPages = Math.ceil(totalCount / pageSize);

  // Auto-open a specific contact if directed via openContactId
  useEffect(() => {
    if (openContactId && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      // Fetch the contact and open it
      supabase
        .from("people")
        .select("*, company:companies!company_id(id, name)")
        .eq("id", openContactId)
        .single()
        .then(({ data }) => {
          if (data) openEdit(data as ContactRow);
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openContactId]);

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
    setPhones([]);
    setEmails([]);
    setAddresses([]);
    setOrigPhoneIds(new Set());
    setOrigEmailIds(new Set());
    setOrigAddressIds(new Set());
    setSocials([]);
    setOrigSocialIds(new Set());
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
      assistant_id: contact.assistant_id,
      notes: contact.notes,
    });
    setActiveTab("info");
    setPanelOpen(true);

    // Load sub-records and related data in parallel
    const [{ data: phonesData }, { data: emailsData }, { data: addressesData }, { data: socialsData }, { data: meetings }, { data: calls }, { data: submissions }] = await Promise.all([
      supabase
        .from("contact_phones")
        .select("id, designation, number, is_primary")
        .eq("entity_type", "person")
        .eq("entity_id", contact.id)
        .order("is_primary", { ascending: false }),
      supabase
        .from("contact_emails")
        .select("id, designation, address, is_primary")
        .eq("entity_type", "person")
        .eq("entity_id", contact.id)
        .order("is_primary", { ascending: false }),
      supabase
        .from("contact_addresses")
        .select("id, designation, street, city, state, zip, country, is_primary")
        .eq("entity_type", "person")
        .eq("entity_id", contact.id)
        .order("is_primary", { ascending: false }),
      supabase
        .from("contact_socials")
        .select("id, platform, url")
        .eq("entity_type", "person")
        .eq("entity_id", contact.id),
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
      supabase
        .from("submission_people")
        .select("submission:submissions(id, description, status)")
        .eq("person_id", contact.id),
    ]);

    const pList = (phonesData || []) as PhoneRecord[];
    const eList = (emailsData || []) as EmailRecord[];
    const aList = (addressesData || []).map((a) => ({ ...a, street: a.street || "", city: a.city || "", state: a.state || "", zip: a.zip || "", country: a.country || "" })) as AddressRecord[];
    setPhones(pList);
    setEmails(eList);
    setAddresses(aList);
    setOrigPhoneIds(new Set(pList.filter((p) => p.id).map((p) => p.id!)));
    setOrigEmailIds(new Set(eList.filter((e) => e.id).map((e) => e.id!)));
    setOrigAddressIds(new Set(aList.filter((a) => a.id).map((a) => a.id!)));

    const sList = (socialsData || []) as SocialRecord[];
    setSocials(sList);
    setOrigSocialIds(new Set(sList.filter((s) => s.id).map((s) => s.id!)));

    setRelatedMeetings(
      (meetings || [])
        .map((m: Record<string, unknown>) => m.meeting as { id: string; title: string; meeting_status: string; meeting_at: string | null })
        .filter(Boolean)
    );
    setRelatedCalls(calls || []);
    setCallsHasMore((calls || []).length > 20);
    setRelatedSubmissions(
      (submissions || [])
        .map((s: Record<string, unknown>) => s.submission as { id: string; description: string; status: string })
        .filter(Boolean)
    );
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
      let savedId = editingId;
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
          savedId = data.id;
          setContacts((prev) =>
            [...prev, data as ContactRow].sort((a, b) =>
              a.full_name.localeCompare(b.full_name)
            )
          );
        }
      }
      // Sync sub-records
      if (savedId) {
        await Promise.all([
          syncPhones("person", savedId, phones, origPhoneIds),
          syncEmails("person", savedId, emails, origEmailIds),
          syncAddresses("person", savedId, addresses, origAddressIds),
          syncSocials("person", savedId, socials, origSocialIds),
        ]);
      }
      setPanelOpen(false);
    } finally {
      setSaving(false);
    }
  }, [form, editingId, supabase, phones, emails, addresses, socials, origPhoneIds, origEmailIds, origAddressIds, origSocialIds]);

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

  // Phone/email now in sub-records — not available in list view without extra queries
  // Table shows basic info; detail panel shows full contact info

  const tabs = [
    { id: "info", label: "Info" },
    ...(editingId
      ? [
          { id: "meetings", label: "Meetings" },
          { id: "calls", label: "Calls" },
          { id: "submissions", label: "Submissions" },
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
                  <td className="px-3 py-2.5 text-zinc-500 text-xs font-mono">—</td>
                  <td className="px-3 py-2.5 text-zinc-500 text-xs">—</td>
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
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name">
                <Input
                  value={form.first_name || ""}
                  onChange={(e) => {
                    const first = e.target.value || null;
                    const full = [first, form.last_name].filter(Boolean).join(" ");
                    setForm({ ...form, first_name: first, full_name: full });
                  }}
                  placeholder="First"
                />
              </Field>
              <Field label="Last Name">
                <Input
                  value={form.last_name || ""}
                  onChange={(e) => {
                    const last = e.target.value || null;
                    const full = [form.first_name, last].filter(Boolean).join(" ");
                    setForm({ ...form, last_name: last, full_name: full });
                  }}
                  placeholder="Last"
                />
              </Field>
            </div>
            <Field label="Company">
              <RelationPicker value={form.company_id} onChange={(id) => setForm({ ...form, company_id: id })} options={companyOptions} placeholder="Select company..." />
            </Field>
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
              <Field label="Level">
                <Select
                  value={form.exec_level || ""}
                  onChange={(e) => setForm({ ...form, exec_level: (e.target.value || null) as ExecLevel | null })}
                  options={EXEC_LEVELS}
                  placeholder="Select..."
                />
              </Field>
            </div>

            {/* Phones / Emails / Addresses / Socials */}
            <PhoneSection phones={phones} onChange={setPhones} />
            <EmailSection emails={emails} onChange={setEmails} />
            <AddressSection addresses={addresses} onChange={setAddresses} />
            <SocialSection socials={socials} onChange={setSocials} />

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
                <Link
                  key={m.id}
                  href={`/meetings?open=${m.id}`}
                  className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 hover:bg-zinc-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-black">{m.title}</p>
                    <p className="text-xs text-zinc-500">{m.meeting_at ? new Date(m.meeting_at).toLocaleDateString() : "No date"}</p>
                  </div>
                  <StatusBadge status={m.meeting_status} />
                </Link>
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
                  <Link
                    key={c.id}
                    href={`/calls?open=${c.id}`}
                    className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 hover:bg-zinc-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-black">{c.about}</p>
                      <p className="text-xs text-zinc-500">{c.due_date ? new Date(c.due_date).toLocaleDateString() : "No date"}</p>
                    </div>
                    <StatusBadge status={c.call_status} />
                  </Link>
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
        {activeTab === "submissions" && (
          <div className="space-y-2">
            {relatedSubmissions.length === 0 ? (
              <p className="text-sm text-zinc-400 py-4 text-center">No submissions yet.</p>
            ) : (
              relatedSubmissions.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2">
                  <p className="text-sm font-medium text-black">{s.description}</p>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                    s.status === "need_to_send" ? "bg-amber-50 text-amber-700 border-amber-200" :
                    s.status === "sent" ? "bg-blue-50 text-blue-700 border-blue-200" :
                    "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}>
                    {s.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </DetailPanel>
    </div>
  );
}

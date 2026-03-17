"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Plus, Search, Users } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
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
import { createClient } from "@/lib/supabase/client";
import {
  RelationPicker,
  type RelationOption,
} from "@/components/shared/relation-picker";
import {
  DetailPanel,
  Field,
  Input,
  Textarea,
} from "@/components/shared/detail-panel";

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
}

interface ClientsClientProps {
  userId: string;
}

const emptyForm = {
  full_name: "",
  first_name: null as string | null,
  last_name: null as string | null,
  company_id: null as string | null,
  staff_level: null as string | null,
  notes: null as string | null,
};

export function ClientsClient({ userId }: ClientsClientProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("info");

  // Related data for detail tabs
  const [relatedMeetings, setRelatedMeetings] = useState<
    { id: string; title: string; meeting_status: string; meeting_at: string | null }[]
  >([]);
  const [relatedSubmissions, setRelatedSubmissions] = useState<
    { id: string; description: string; status: string }[]
  >([]);
  const [relatedMaterials, setRelatedMaterials] = useState<
    { id: string; title: string; status: string; format: string | null; genre: string | null }[]
  >([]);
  const [relatedCalls, setRelatedCalls] = useState<
    { id: string; about: string; call_status: string; due_date: string | null }[]
  >([]);
  const [callsHasMore, setCallsHasMore] = useState(false);
  const [callsLoading, setCallsLoading] = useState(false);

  // Sub-record state
  const [phones, setPhones] = useState<PhoneRecord[]>([]);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [addresses, setAddresses] = useState<AddressRecord[]>([]);
  const [origPhoneIds, setOrigPhoneIds] = useState<Set<string>>(new Set());
  const [origEmailIds, setOrigEmailIds] = useState<Set<string>>(new Set());
  const [origAddressIds, setOrigAddressIds] = useState<Set<string>>(new Set());
  const [socials, setSocials] = useState<SocialRecord[]>([]);
  const [origSocialIds, setOrigSocialIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const [{ data: clientsData }, { data: companiesData }] = await Promise.all([
        supabase
          .from("clients")
          .select("*, company:companies!company_id(id, name)")
          .order("full_name"),
        supabase.from("companies").select("id, name").order("name"),
      ]);
      setClients(clientsData || []);
      setCompanies(companiesData || []);
      setLoading(false);
    }
    load();
  }, []);

  const companyOptions: RelationOption[] = useMemo(
    () => companies.map((c) => ({ id: c.id, label: c.name })),
    [companies]
  );

  const filtered = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.company?.name.toLowerCase().includes(q)
    );
  }, [clients, search]);

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

  async function openEdit(client: ClientRow) {
    setEditingId(client.id);
    setForm({
      full_name: client.full_name,
      first_name: client.first_name,
      last_name: client.last_name,
      company_id: client.company_id,
      staff_level: client.staff_level,
      notes: client.notes,
    });
    setActiveTab("info");
    setRelatedCalls([]);
    setCallsHasMore(false);
    setPanelOpen(true);

    // Load sub-records and related data
    const [{ data: phonesData }, { data: emailsData }, { data: addressesData }, { data: socialsData }, { data: meetings }, { data: submissions }, { data: materials }, { data: calls }] = await Promise.all([
      supabase
        .from("contact_phones")
        .select("id, designation, number, is_primary")
        .eq("entity_type", "client")
        .eq("entity_id", client.id)
        .order("is_primary", { ascending: false }),
      supabase
        .from("contact_emails")
        .select("id, designation, address, is_primary")
        .eq("entity_type", "client")
        .eq("entity_id", client.id)
        .order("is_primary", { ascending: false }),
      supabase
        .from("contact_addresses")
        .select("id, designation, street, city, state, zip, country, is_primary")
        .eq("entity_type", "client")
        .eq("entity_id", client.id)
        .order("is_primary", { ascending: false }),
      supabase
        .from("contact_socials")
        .select("id, platform, url")
        .eq("entity_type", "client")
        .eq("entity_id", client.id),
      supabase
        .from("meeting_clients")
        .select("meeting:meetings(id, title, meeting_status, meeting_at)")
        .eq("client_id", client.id),
      supabase
        .from("submission_clients")
        .select("submission:submissions(id, description, status)")
        .eq("client_id", client.id),
      supabase
        .from("client_materials")
        .select("id, title, status, format, genre")
        .eq("client_id", client.id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("calls")
        .select("id, about, call_status, due_date")
        .eq("client_id", client.id)
        .order("due_date", { ascending: false })
        .range(0, 20),
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
    setRelatedSubmissions(
      (submissions || [])
        .map((s: Record<string, unknown>) => s.submission as { id: string; description: string; status: string })
        .filter(Boolean)
    );
    setRelatedMaterials(materials || []);
    setRelatedCalls(calls || []);
    setCallsHasMore((calls || []).length > 20);
  }

  async function loadMoreCalls(clientId: string) {
    setCallsLoading(true);
    try {
      const { data } = await supabase
        .from("calls")
        .select("id, about, call_status, due_date")
        .eq("client_id", clientId)
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
          .from("clients")
          .update(payload)
          .eq("id", editingId)
          .select("*, company:companies!company_id(id, name)")
          .single();
        if (data) {
          setClients((prev) =>
            prev.map((c) => (c.id === editingId ? (data as ClientRow) : c))
          );
        }
      } else {
        const { data } = await supabase
          .from("clients")
          .insert(payload)
          .select("*, company:companies!company_id(id, name)")
          .single();
        if (data) {
          savedId = data.id;
          setClients((prev) => [...prev, data as ClientRow].sort((a, b) => a.full_name.localeCompare(b.full_name)));
        }
      }
      if (savedId) {
        await Promise.all([
          syncPhones("client", savedId, phones, origPhoneIds),
          syncEmails("client", savedId, emails, origEmailIds),
          syncAddresses("client", savedId, addresses, origAddressIds),
          syncSocials("client", savedId, socials, origSocialIds),
        ]);
      }
      if (!editingId && savedId) setEditingId(savedId);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }, [form, editingId, supabase, phones, emails, addresses, socials, origPhoneIds, origEmailIds, origAddressIds, origSocialIds]);

  const handleDelete = useCallback(async () => {
    if (!editingId || !confirm("Delete this client?")) return;
    setDeleting(true);
    try {
      await supabase.from("clients").delete().eq("id", editingId);
      setClients((prev) => prev.filter((c) => c.id !== editingId));
      setPanelOpen(false);
    } finally {
      setDeleting(false);
    }
  }, [editingId, supabase]);

  const tabs = [
    { id: "info", label: "Info" },
    ...(editingId
      ? [
          { id: "calls", label: "Calls" },
          { id: "materials", label: "Materials" },
          { id: "meetings", label: "Meetings" },
          { id: "submissions", label: "Submissions" },
        ]
      : []),
  ];

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-zinc-400">Loading...</p></div>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-black">Clients</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage your talent roster.</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Client
        </button>
      </div>

      {/* Search */}
      <div className="mt-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients..."
          className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-sm outline-none placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-400 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/50">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Name</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Company</th>
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
                  onClick={() => openEdit(client)}
                  className="border-b border-zinc-100 last:border-0 cursor-pointer hover:bg-zinc-50/50 transition-colors"
                >
                  <td className="px-3 py-2.5 font-medium text-black">{client.full_name}</td>
                  <td className="px-3 py-2.5 text-zinc-700">{client.company?.name || "—"}</td>
                  <td className="px-3 py-2.5 text-zinc-500">{client.staff_level || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Panel */}
      <DetailPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editingId ? form.full_name || "Edit Client" : "New Client"}
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
                Close
              </button>
              <button onClick={handleSave} disabled={saving} className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50">
                {saving ? "Saving..." : saved ? "Saved ✓" : "Save"}
              </button>
            </div>
          </div>
        }
      >
        {/* Tabs */}
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
            <PhoneSection phones={phones} onChange={setPhones} />
            <EmailSection emails={emails} onChange={setEmails} />
            <AddressSection addresses={addresses} onChange={setAddresses} />
            <SocialSection socials={socials} onChange={setSocials} />
            <Field label="Company">
              <RelationPicker value={form.company_id} onChange={(id) => setForm({ ...form, company_id: id })} options={companyOptions} placeholder="Select company..." />
            </Field>
            <Field label="Staff Level">
              <Input value={form.staff_level || ""} onChange={(e) => setForm({ ...form, staff_level: e.target.value || null })} />
            </Field>
            <Field label="Notes">
              <Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} placeholder="Notes..." />
            </Field>
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
                      <p className="text-sm font-medium text-black">{c.about || "—"}</p>
                      <p className="text-xs text-zinc-500">
                        {c.due_date ? new Date(c.due_date).toLocaleDateString() : "No date"}
                      </p>
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

        {activeTab === "materials" && (
          <div className="space-y-2">
            {relatedMaterials.length === 0 ? (
              <p className="text-sm text-zinc-400 py-4 text-center">No materials yet.</p>
            ) : (
              relatedMaterials.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-black">{m.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {m.format && (
                        <span className="text-[11px] text-zinc-400">{m.format}</span>
                      )}
                      {m.genre && (
                        <span className="text-[11px] text-zinc-400">{m.genre}</span>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                    m.status === "not_yet_reviewed" ? "bg-zinc-50 text-zinc-500 border-zinc-200" :
                    m.status === "in_review" ? "bg-blue-50 text-blue-700 border-blue-200" :
                    m.status === "coverage_available" ? "bg-purple-50 text-purple-700 border-purple-200" :
                    m.status === "notes_given" ? "bg-amber-50 text-amber-700 border-amber-200" :
                    m.status === "editing" ? "bg-orange-50 text-orange-700 border-orange-200" :
                    m.status === "final_draft" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    "bg-zinc-50 text-zinc-500 border-zinc-200"
                  }`}>
                    {m.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </div>
              ))
            )}
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
                    <p className="text-xs text-zinc-500">
                      {m.meeting_at ? new Date(m.meeting_at).toLocaleDateString() : "No date"}
                    </p>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                    m.meeting_status === "need_to_set" ? "bg-amber-50 text-amber-700 border-amber-200" :
                    m.meeting_status === "scheduled" ? "bg-blue-50 text-blue-700 border-blue-200" :
                    m.meeting_status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    "bg-zinc-50 text-zinc-500 border-zinc-200"
                  }`}>
                    {m.meeting_status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </div>
              ))
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

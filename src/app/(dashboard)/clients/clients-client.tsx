"use client";

import { useState, useMemo, useCallback } from "react";
import { Plus, Search, Users } from "lucide-react";
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
  email: string | null;
  phone: string | null;
  company_id: string | null;
  staff_level: string | null;
  notes: string | null;
  created_at: string;
  company: CompanyData | null;
}

interface ClientsClientProps {
  initialClients: ClientRow[];
  companies: CompanyData[];
}

const emptyForm = {
  full_name: "",
  first_name: null as string | null,
  last_name: null as string | null,
  email: null as string | null,
  phone: null as string | null,
  company_id: null as string | null,
  staff_level: null as string | null,
  notes: null as string | null,
};

export function ClientsClient({
  initialClients,
  companies,
}: ClientsClientProps) {
  const supabase = createClient();
  const [clients, setClients] = useState<ClientRow[]>(initialClients);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
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
        c.email?.toLowerCase().includes(q) ||
        c.company?.name.toLowerCase().includes(q)
    );
  }, [clients, search]);

  function openNew() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setActiveTab("info");
    setPanelOpen(true);
  }

  async function openEdit(client: ClientRow) {
    setEditingId(client.id);
    setForm({
      full_name: client.full_name,
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      phone: client.phone,
      company_id: client.company_id,
      staff_level: client.staff_level,
      notes: client.notes,
    });
    setActiveTab("info");
    setPanelOpen(true);

    // Load related data
    const [{ data: meetings }, { data: submissions }, { data: materials }] = await Promise.all([
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
    ]);
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
  }

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = { ...form };
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
          setClients((prev) => [...prev, data as ClientRow].sort((a, b) => a.full_name.localeCompare(b.full_name)));
        }
      }
      setPanelOpen(false);
    } finally {
      setSaving(false);
    }
  }, [form, editingId, supabase]);

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
          { id: "materials", label: "Materials" },
          { id: "meetings", label: "Meetings" },
          { id: "submissions", label: "Submissions" },
        ]
      : []),
  ];

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
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Email</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Phone</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Company</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Staff Level</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-12 text-center text-sm text-zinc-400">
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
                  <td className="px-3 py-2.5 text-zinc-500">{client.email || "—"}</td>
                  <td className="px-3 py-2.5 text-zinc-500 text-xs font-mono">{client.phone || "—"}</td>
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
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50">
                {saving ? "Saving..." : "Save"}
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
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email">
                <Input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value || null })} />
              </Field>
              <Field label="Phone">
                <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value || null })} />
              </Field>
            </div>
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

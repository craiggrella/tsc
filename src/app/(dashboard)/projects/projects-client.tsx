"use client";

import { useState, useMemo, useCallback } from "react";
import { Plus, Search, Clapperboard, Filter } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  MultiRelationPicker,
  type RelationOption,
} from "@/components/shared/relation-picker";
import {
  DetailPanel,
  Field,
  Input,
  Select,
} from "@/components/shared/detail-panel";
import type { ProjectStatus } from "@/types/database";

interface CompanyData {
  id: string;
  name: string;
}

interface PersonData {
  id: string;
  full_name: string;
  title: string | null;
  exec_level: string | null;
}

interface ProjectRow {
  id: string;
  name: string;
  status: ProjectStatus;
  created_at: string;
}

interface ProjectsClientProps {
  initialProjects: ProjectRow[];
  companies: CompanyData[];
  people: PersonData[];
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

const emptyForm = {
  name: "",
  status: "development" as ProjectStatus,
  network_ids: [] as string[],
  studio_ids: [] as string[],
  production_company_ids: [] as string[],
  person_ids: [] as string[],
};

export function ProjectsClient({
  initialProjects,
  companies,
  people,
}: ProjectsClientProps) {
  const supabase = createClient();
  const [projects, setProjects] = useState<ProjectRow[]>(initialProjects);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "">("");
  const [activeTab, setActiveTab] = useState("info");

  // Display caches
  const [displayNetworks, setDisplayNetworks] = useState<string[]>([]);
  const [displayStudios, setDisplayStudios] = useState<string[]>([]);
  const [displayProdCos, setDisplayProdCos] = useState<string[]>([]);

  // Related data for tabs
  const [relatedClients, setRelatedClients] = useState<
    { id: string; full_name: string; level: string | null }[]
  >([]);
  const [relatedSubmissions, setRelatedSubmissions] = useState<
    { id: string; description: string; status: string }[]
  >([]);
  const [relatedMeetings, setRelatedMeetings] = useState<
    { id: string; title: string; meeting_status: string; meeting_at: string | null }[]
  >([]);
  const [relatedPeople, setRelatedPeople] = useState<PersonData[]>([]);
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);

  // Table display cache: project_id → { networks, studios, prodCos }
  const [tableCache, setTableCache] = useState<
    Record<string, { networks: string[]; studios: string[]; prodCos: string[] }>
  >({});

  const companyOptions: RelationOption[] = useMemo(
    () => companies.map((c) => ({ id: c.id, label: c.name })),
    [companies]
  );
  const personOptions: RelationOption[] = useMemo(
    () => people.map((p) => ({ id: p.id, label: p.full_name, sublabel: p.title || undefined })),
    [people]
  );

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

    Promise.all([
      supabase.from("project_networks").select("project_id, company:companies(name)").in("project_id", ids),
      supabase.from("project_studios").select("project_id, company:companies(name)").in("project_id", ids),
      supabase.from("project_production_companies").select("project_id, company:companies(name)").in("project_id", ids),
    ]).then(([{ data: nets }, { data: studs }, { data: prods }]) => {
      const cache: typeof tableCache = {};
      for (const id of ids) cache[id] = { networks: [], studios: [], prodCos: [] };
      for (const row of nets || []) {
        const r = row as unknown as { project_id: string; company: { name: string } | null };
        if (r.company && cache[r.project_id]) cache[r.project_id].networks.push(r.company.name);
      }
      for (const row of studs || []) {
        const r = row as unknown as { project_id: string; company: { name: string } | null };
        if (r.company && cache[r.project_id]) cache[r.project_id].studios.push(r.company.name);
      }
      for (const row of prods || []) {
        const r = row as unknown as { project_id: string; company: { name: string } | null };
        if (r.company && cache[r.project_id]) cache[r.project_id].prodCos.push(r.company.name);
      }
      setTableCache((prev) => ({ ...prev, ...cache }));
    });
  }, [filtered, supabase]);

  function openNew() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setActiveTab("info");
    setRelatedPeople([]);
    setExpandedPerson(null);
    setPanelOpen(true);
  }

  async function openEdit(project: ProjectRow) {
    setEditingId(project.id);
    setActiveTab("info");
    setExpandedPerson(null);

    // Load join table IDs + related data
    const [
      { data: nets },
      { data: studs },
      { data: prods },
      { data: ppl },
      { data: credits },
      { data: subs },
      { data: mtgs },
    ] = await Promise.all([
      supabase.from("project_networks").select("company_id").eq("project_id", project.id),
      supabase.from("project_studios").select("company_id").eq("project_id", project.id),
      supabase.from("project_production_companies").select("company_id").eq("project_id", project.id),
      supabase.from("project_people").select("person_id").eq("project_id", project.id),
      supabase.from("client_credits").select("client:clients!client_id(id, full_name), level").eq("project_id", project.id),
      supabase.from("submission_projects").select("submission:submissions(id, description, status)").eq("project_id", project.id),
      supabase.from("meeting_projects").select("meeting:meetings(id, title, meeting_status, meeting_at)").eq("project_id", project.id),
    ]);

    const personIds = (ppl || []).map((r) => r.person_id);
    const matchedPeople = people.filter((p) => personIds.includes(p.id));

    setForm({
      name: project.name,
      status: project.status,
      network_ids: (nets || []).map((r) => r.company_id),
      studio_ids: (studs || []).map((r) => r.company_id),
      production_company_ids: (prods || []).map((r) => r.company_id),
      person_ids: personIds,
    });

    setRelatedPeople(matchedPeople);

    setRelatedClients(
      (credits || [])
        .map((c: Record<string, unknown>) => {
          const client = c.client as { id: string; full_name: string } | null;
          return client ? { ...client, level: c.level as string | null } : null;
        })
        .filter(Boolean) as { id: string; full_name: string; level: string | null }[]
    );
    setRelatedSubmissions(
      (subs || [])
        .map((s: Record<string, unknown>) => s.submission as { id: string; description: string; status: string } | null)
        .filter(Boolean) as { id: string; description: string; status: string }[]
    );
    setRelatedMeetings(
      (mtgs || [])
        .map((m: Record<string, unknown>) => m.meeting as { id: string; title: string; meeting_status: string; meeting_at: string | null } | null)
        .filter(Boolean) as { id: string; title: string; meeting_status: string; meeting_at: string | null }[]
    );

    setPanelOpen(true);
  }

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = { name: form.name, status: form.status };
      let projectId = editingId;

      if (editingId) {
        await supabase.from("projects").update(payload).eq("id", editingId);
      } else {
        const { data } = await supabase.from("projects").insert(payload).select("*").single();
        if (data) projectId = data.id;
      }

      if (projectId) {
        // Sync all join tables
        await Promise.all([
          supabase.from("project_networks").delete().eq("project_id", projectId),
          supabase.from("project_studios").delete().eq("project_id", projectId),
          supabase.from("project_production_companies").delete().eq("project_id", projectId),
          supabase.from("project_people").delete().eq("project_id", projectId),
        ]);

        const inserts = [];
        if (form.network_ids.length > 0)
          inserts.push(supabase.from("project_networks").insert(form.network_ids.map((id) => ({ project_id: projectId!, company_id: id }))));
        if (form.studio_ids.length > 0)
          inserts.push(supabase.from("project_studios").insert(form.studio_ids.map((id) => ({ project_id: projectId!, company_id: id }))));
        if (form.production_company_ids.length > 0)
          inserts.push(supabase.from("project_production_companies").insert(form.production_company_ids.map((id) => ({ project_id: projectId!, company_id: id }))));
        if (form.person_ids.length > 0)
          inserts.push(supabase.from("project_people").insert(form.person_ids.map((id) => ({ project_id: projectId!, person_id: id }))));
        await Promise.all(inserts);

        // Refresh project row
        const { data: updated } = await supabase.from("projects").select("*").eq("id", projectId).single();
        if (updated) {
          setProjects((prev) => {
            const idx = prev.findIndex((p) => p.id === projectId);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = updated as ProjectRow;
              return copy;
            }
            return [...prev, updated as ProjectRow].sort((a, b) => a.name.localeCompare(b.name));
          });
        }
        // Clear table cache
        setTableCache((prev) => {
          const copy = { ...prev };
          delete copy[projectId!];
          return copy;
        });
      }
      setPanelOpen(false);
    } finally {
      setSaving(false);
    }
  }, [form, editingId, supabase]);

  const handleDelete = useCallback(async () => {
    if (!editingId || !confirm("Delete this project?")) return;
    setDeleting(true);
    try {
      await supabase.from("projects").delete().eq("id", editingId);
      setProjects((prev) => prev.filter((p) => p.id !== editingId));
      setPanelOpen(false);
    } finally {
      setDeleting(false);
    }
  }, [editingId, supabase]);

  // Phone/email now in sub-records — shown on demand in expanded cards

  const tabsList = [
    { id: "info", label: "Info" },
    ...(editingId
      ? [
          { id: "contacts", label: "Contacts" },
          { id: "clients", label: "Clients" },
          { id: "submissions", label: "Submissions" },
          { id: "meetings", label: "Meetings" },
        ]
      : []),
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-black">Projects</h1>
          <p className="mt-1 text-sm text-zinc-500">Track shows, films, and productions.</p>
        </div>
        <button
          onClick={openNew}
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
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Network(s)</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Studio(s)</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Prod Co(s)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-12 text-center text-sm text-zinc-400">
                  <Clapperboard className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
                  No projects found.
                </td>
              </tr>
            ) : (
              filtered.map((project) => {
                const tc = tableCache[project.id];
                return (
                  <tr
                    key={project.id}
                    onClick={() => openEdit(project)}
                    className="border-b border-zinc-100 last:border-0 cursor-pointer hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="px-3 py-2.5 font-medium text-black">{project.name}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={project.status} />
                    </td>
                    <td className="px-3 py-2.5 text-zinc-700 text-xs">{tc?.networks.join(", ") || "—"}</td>
                    <td className="px-3 py-2.5 text-zinc-700 text-xs">{tc?.studios.join(", ") || "—"}</td>
                    <td className="px-3 py-2.5 text-zinc-700 text-xs">{tc?.prodCos.join(", ") || "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Panel */}
      <DetailPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editingId ? form.name || "Edit Project" : "New Project"}
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
        {tabsList.length > 1 && (
          <div className="mb-4 flex gap-1 border-b border-zinc-200 overflow-x-auto">
            {tabsList.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setExpandedPerson(null); }}
                className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
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
            <Field label="Name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Project name" />
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
                options={STATUSES}
              />
            </Field>
            <Field label="Network(s)">
              <MultiRelationPicker
                value={form.network_ids}
                onChange={(ids) => setForm({ ...form, network_ids: ids })}
                options={companyOptions}
                placeholder="Select networks..."
              />
            </Field>
            <Field label="Studio(s)">
              <MultiRelationPicker
                value={form.studio_ids}
                onChange={(ids) => setForm({ ...form, studio_ids: ids })}
                options={companyOptions}
                placeholder="Select studios..."
              />
            </Field>
            <Field label="Production Company(s)">
              <MultiRelationPicker
                value={form.production_company_ids}
                onChange={(ids) => setForm({ ...form, production_company_ids: ids })}
                options={companyOptions}
                placeholder="Select production companies..."
              />
            </Field>
            <Field label="People">
              <MultiRelationPicker
                value={form.person_ids}
                onChange={(ids) => {
                  setForm({ ...form, person_ids: ids });
                  setRelatedPeople(people.filter((p) => ids.includes(p.id)));
                }}
                options={personOptions}
                placeholder="Select people..."
              />
            </Field>
          </div>
        )}

        {activeTab === "contacts" && (
          <div className="space-y-2">
            {relatedPeople.length === 0 ? (
              <p className="text-sm text-zinc-400 py-4 text-center">No contacts on this project.</p>
            ) : (
              relatedPeople.map((person) => (
                <div key={person.id} className="rounded-md border border-zinc-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedPerson(expandedPerson === person.id ? null : person.id)}
                    className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-zinc-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-black">{person.full_name}</p>
                      {person.title && (
                        <p className="text-xs text-zinc-500">{person.title}</p>
                      )}
                    </div>
                    {person.exec_level && (
                      <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                        {person.exec_level.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    )}
                  </button>
                  {expandedPerson === person.id && (
                    <div className="border-t border-zinc-100 bg-zinc-50/50 px-3 py-3">
                      <a
                        href={`/contacts?open=${person.id}`}
                        className="text-xs text-zinc-500 hover:text-black transition-colors"
                      >
                        View full contact record →
                      </a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "clients" && (
          <div className="space-y-2">
            {relatedClients.length === 0 ? (
              <p className="text-sm text-zinc-400 py-4 text-center">No clients on this project.</p>
            ) : (
              relatedClients.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2">
                  <p className="text-sm font-medium text-black">{c.full_name}</p>
                  {c.level && <span className="text-xs text-zinc-500">{c.level}</span>}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "submissions" && (
          <div className="space-y-2">
            {relatedSubmissions.length === 0 ? (
              <p className="text-sm text-zinc-400 py-4 text-center">No submissions for this project.</p>
            ) : (
              relatedSubmissions.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2">
                  <p className="text-sm font-medium text-black">{s.description}</p>
                  <StatusBadge status={s.status} />
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "meetings" && (
          <div className="space-y-2">
            {relatedMeetings.length === 0 ? (
              <p className="text-sm text-zinc-400 py-4 text-center">No meetings for this project.</p>
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
      </DetailPanel>
    </div>
  );
}

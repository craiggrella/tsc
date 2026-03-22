"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, X, ExternalLink } from "lucide-react";
import { Breadcrumb, buildFromParams } from "@/components/shared/breadcrumb";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  MultiRelationPicker,
  type RelationOption,
} from "@/components/shared/relation-picker";
import { Field, Input, Select } from "@/components/shared/detail-panel";
import { usePicklist, toSelectOptions } from "@/lib/picklists";
import { formatPhone } from "@/lib/utils";

interface PersonData {
  id: string;
  full_name: string;
  title: string | null;
  exec_level: string | null;
  department: string[];
  buyer_type: string | null;
  primary_phone: string | null;
  primary_email: string | null;
}

interface ProjectCompanyRow {
  id?: string;
  company_id: string;
  designation: string;
}

const emptyForm = {
  name: "",
  status: "development" as string,
  person_ids: [] as string[],
};

interface ProjectDetailProps {
  projectId: string;
  userId: string;
}

export function ProjectDetail({ projectId, userId }: ProjectDetailProps) {
  const supabase = createClient();
  const router = useRouter();
  const statusItems = usePicklist("list_project_statuses");
  const STATUSES = toSelectOptions(statusItems);
  const companyTypeItems = usePicklist("list_company_types");
  const COMPANY_DESIGNATIONS = companyTypeItems.map((i) => i.label);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  const [people, setPeople] = useState<{ id: string; full_name: string; title: string | null; exec_level: string | null }[]>([]);
  const [companyList, setCompanyList] = useState<{ id: string; name: string }[]>([]);
  const [projectCompanies, setProjectCompanies] = useState<ProjectCompanyRow[]>([]);
  const [origCompanyIds, setOrigCompanyIds] = useState<Set<string>>(new Set());

  // Related data for tabs
  const [relatedPeople, setRelatedPeople] = useState<PersonData[]>([]);
  const [relatedClients, setRelatedClients] = useState<
    { id: string; full_name: string; level: string | null; status: string | null; start_year: number | null; end_year: number | null }[]
  >([]);
  const [relatedSubmissions, setRelatedSubmissions] = useState<
    { id: string; description: string; status: string; client_name: string | null; material_title: string | null; person_name: string | null; person_id: string | null; response: string | null }[]
  >([]);
  const [relatedMeetings, setRelatedMeetings] = useState<
    { id: string; title: string; meeting_status: string; meeting_at: string | null; clients: string[]; people: string[] }[]
  >([]);

  useEffect(() => {
    async function load() {
      const [
        { data: project },
        { data: companiesData },
        { data: peopleData },
        { data: pcs },
        { data: ppl },
        { data: credits },
        { data: subs },
        { data: mtgs },
      ] = await Promise.all([
        supabase.from("projects").select("*").eq("id", projectId).single(),
        supabase.from("companies").select("id, name").order("name"),
        supabase.from("people").select("id, full_name, title, exec_level").order("full_name"),
        supabase.from("project_companies").select("id, company_id, designation").eq("project_id", projectId),
        supabase.from("project_people").select("person_id").eq("project_id", projectId),
        supabase.from("client_credits").select("client:clients!client_id(id, full_name), level, status, start_year, end_year").eq("project_id", projectId),
        supabase.from("submission_item_projects").select("submission_item_id, submission_item:submission_items!submission_item_id(id, submission_id, response, client:clients!client_id(full_name), material:client_materials!material_id(title), person:people!person_id(id, full_name), submission:submissions!submission_id(submission_date))").eq("project_id", projectId),
        supabase.from("meeting_projects").select("meeting_id, meeting:meetings(id, title, meeting_status, meeting_at)").eq("project_id", projectId),
      ]);

      if (!project) {
        router.replace("/projects");
        return;
      }

      setCompanyList(companiesData || []);
      setPeople(peopleData || []);

      const pcList = (pcs || []) as ProjectCompanyRow[];
      setProjectCompanies(pcList);
      setOrigCompanyIds(new Set(pcList.filter((r) => r.id).map((r) => r.id!)));

      const personIds = (ppl || []).map((r) => r.person_id);

      // Fetch full person data including department, buyer_type, primary phone/email
      let enrichedPeople: PersonData[] = [];
      if (personIds.length > 0) {
        const { data: fullPeople } = await supabase
          .from("people")
          .select("id, full_name, title, exec_level, department, buyer_type")
          .in("id", personIds);
        const [{ data: personPhones }, { data: personEmails }] = await Promise.all([
          supabase
            .from("contact_phones")
            .select("entity_id, number, is_primary")
            .eq("entity_type", "person")
            .in("entity_id", personIds)
            .order("is_primary", { ascending: false }),
          supabase
            .from("contact_emails")
            .select("entity_id, address, is_primary")
            .eq("entity_type", "person")
            .in("entity_id", personIds)
            .order("is_primary", { ascending: false }),
        ]);
        const phoneMap: Record<string, string> = {};
        const emailMap: Record<string, string> = {};
        for (const p of personPhones || []) { if (!phoneMap[p.entity_id]) phoneMap[p.entity_id] = p.number; }
        for (const e of personEmails || []) { if (!emailMap[e.entity_id]) emailMap[e.entity_id] = e.address; }

        enrichedPeople = (fullPeople || []).map((p) => ({
          id: p.id,
          full_name: p.full_name,
          title: p.title,
          exec_level: p.exec_level,
          department: p.department || [],
          buyer_type: p.buyer_type,
          primary_phone: phoneMap[p.id] || null,
          primary_email: emailMap[p.id] || null,
        }));
      }
      setRelatedPeople(enrichedPeople);

      setForm({
        name: project.name,
        status: project.status,
        person_ids: personIds,
      });

      setRelatedClients(
        (credits || [])
          .map((c: Record<string, unknown>) => {
            const client = c.client as { id: string; full_name: string } | null;
            return client
              ? {
                  ...client,
                  level: c.level as string | null,
                  status: c.status as string | null,
                  start_year: c.start_year as number | null,
                  end_year: c.end_year as number | null,
                }
              : null;
          })
          .filter(Boolean) as { id: string; full_name: string; level: string | null; status: string | null; start_year: number | null; end_year: number | null }[]
      );

      // Build submissions from submission_item_projects results
      let enrichedSubs: typeof relatedSubmissions = [];
      const itemProjectRows = (subs || []).map((s: Record<string, unknown>) => {
        const item = s.submission_item as {
          id: string;
          submission_id: string;
          response: string | null;
          client: { full_name: string } | null;
          material: { title: string } | null;
          person: { id: string; full_name: string } | null;
          submission: { submission_date: string | null } | null;
        } | null;
        return item;
      }).filter(Boolean) as {
        id: string;
        submission_id: string;
        response: string | null;
        client: { full_name: string } | null;
        material: { title: string } | null;
        person: { id: string; full_name: string } | null;
        submission: { submission_date: string | null } | null;
      }[];

      enrichedSubs = itemProjectRows.map((item) => ({
        id: item.id,
        description: "",
        status: "",
        client_name: item.client?.full_name || null,
        material_title: item.material?.title || null,
        person_name: item.person?.full_name || null,
        person_id: item.person?.id || null,
        response: item.response || null,
      }));
      setRelatedSubmissions(enrichedSubs);

      // Enrich meetings with clients and people
      const meetingRows = (mtgs || []).map((m: Record<string, unknown>) => ({
        meeting_id: m.meeting_id as string,
        meeting: m.meeting as { id: string; title: string; meeting_status: string; meeting_at: string | null } | null,
      })).filter((m) => m.meeting);

      const meetingIds = meetingRows.map((m) => m.meeting_id);
      let enrichedMeetings: typeof relatedMeetings = [];
      if (meetingIds.length > 0) {
        const [{ data: mtgClients }, { data: mtgPeople }] = await Promise.all([
          supabase.from("meeting_clients").select("meeting_id, client:clients!client_id(full_name)").in("meeting_id", meetingIds),
          supabase.from("meeting_people").select("meeting_id, person:people!person_id(full_name)").in("meeting_id", meetingIds),
        ]);
        const clientsByMeeting: Record<string, string[]> = {};
        const peopleByMeeting: Record<string, string[]> = {};
        for (const row of mtgClients || []) {
          const r = row as unknown as { meeting_id: string; client: { full_name: string } | null };
          if (r.client) {
            if (!clientsByMeeting[r.meeting_id]) clientsByMeeting[r.meeting_id] = [];
            clientsByMeeting[r.meeting_id].push(r.client.full_name);
          }
        }
        for (const row of mtgPeople || []) {
          const r = row as unknown as { meeting_id: string; person: { full_name: string } | null };
          if (r.person) {
            if (!peopleByMeeting[r.meeting_id]) peopleByMeeting[r.meeting_id] = [];
            peopleByMeeting[r.meeting_id].push(r.person.full_name);
          }
        }

        enrichedMeetings = meetingRows.map((m) => ({
          id: m.meeting!.id,
          title: m.meeting!.title,
          meeting_status: m.meeting!.meeting_status,
          meeting_at: m.meeting!.meeting_at,
          clients: clientsByMeeting[m.meeting_id] || [],
          people: peopleByMeeting[m.meeting_id] || [],
        }));
      }
      setRelatedMeetings(enrichedMeetings);

      setLoading(false);
    }
    load();
  }, [projectId]);

  const companyOptions: RelationOption[] = useMemo(
    () => companyList.map((c) => ({ id: c.id, label: c.name })),
    [companyList]
  );
  const personOptions: RelationOption[] = useMemo(
    () => people.map((p) => ({ id: p.id, label: p.full_name, sublabel: p.title || undefined })),
    [people]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = { name: form.name, status: form.status };
      await supabase.from("projects").update(payload).eq("id", projectId);

      // Sync project_companies
      const currentIds = new Set(projectCompanies.filter((r) => r.id).map((r) => r.id!));
      const toDelete = [...origCompanyIds].filter((id) => !currentIds.has(id));
      if (toDelete.length > 0) {
        await supabase.from("project_companies").delete().in("id", toDelete);
      }
      for (const pc of projectCompanies) {
        if (pc.id) {
          await supabase.from("project_companies").update({ company_id: pc.company_id, designation: pc.designation }).eq("id", pc.id);
        } else {
          const { data } = await supabase.from("project_companies").insert({ project_id: projectId, company_id: pc.company_id, designation: pc.designation }).select("id").single();
          if (data) pc.id = data.id;
        }
      }
      setOrigCompanyIds(new Set(projectCompanies.filter((r) => r.id).map((r) => r.id!)));

      // Sync people
      await supabase.from("project_people").delete().eq("project_id", projectId);
      if (form.person_ids.length > 0) {
        await supabase.from("project_people").insert(form.person_ids.map((id) => ({ project_id: projectId, person_id: id })));
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }, [form, projectId, supabase, projectCompanies, origCompanyIds]);

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this project?")) return;
    setDeleting(true);
    try {
      await supabase.from("projects").delete().eq("id", projectId);
      router.push("/projects");
    } finally {
      setDeleting(false);
    }
  }, [projectId, supabase, router]);

  const tabs = [
    { id: "info", label: "Info" },
    { id: "people", label: "People" },
    { id: "meetings", label: "Meetings" },
    { id: "submissions", label: "Submissions" },
    { id: "clients", label: "Clients" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumb fallbackHref="/projects" fallbackLabel="Projects" currentLabel={form.name || "Untitled"} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-black">
          {form.name || "Untitled Project"}
        </h1>
        <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "Saved \u2713" : "Save"}
          </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-zinc-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-black text-black"
                : "border-transparent text-zinc-400 hover:text-zinc-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Info Tab */}
      {activeTab === "info" && (
        <div className="space-y-5">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Project name" />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as string })}
              options={STATUSES}
            />
          </Field>
          {/* Companies with designation */}
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">Companies</p>
            <div className="space-y-1.5">
              {projectCompanies.map((pc, i) => (
                <div key={pc.id || `new-${i}`} className="group flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-zinc-50 transition-colors">
                  <select
                    value={pc.designation}
                    onChange={(e) => setProjectCompanies((prev) => prev.map((r, j) => j === i ? { ...r, designation: e.target.value } : r))}
                    className="w-36 flex-shrink-0 appearance-none bg-transparent text-xs font-medium text-zinc-500 outline-none cursor-pointer hover:text-black transition-colors"
                  >
                    {COMPANY_DESIGNATIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <div className="flex-1">
                    <select
                      value={pc.company_id}
                      onChange={(e) => setProjectCompanies((prev) => prev.map((r, j) => j === i ? { ...r, company_id: e.target.value } : r))}
                      className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-xs outline-none"
                    >
                      <option value="">Select company...</option>
                      {companyOptions.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProjectCompanies((prev) => prev.filter((_, j) => j !== i))}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3.5 w-3.5 text-zinc-400 hover:text-red-500 transition-colors" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setProjectCompanies((prev) => [...prev, { company_id: "", designation: "Network" }])}
              className="mt-1 inline-flex items-center gap-1 px-1.5 py-1 text-xs text-zinc-400 hover:text-black transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add Company
            </button>
          </div>
        </div>
      )}

      {/* People Tab */}
      {activeTab === "people" && (
        <div>
          <div className="mb-3">
            <Field label="People">
              <MultiRelationPicker
                value={form.person_ids}
                onChange={(ids) => {
                  setForm({ ...form, person_ids: ids });
                  // Re-enrich would require async; we update what we can
                  setRelatedPeople((prev) => {
                    const existing = new Map(prev.map((p) => [p.id, p]));
                    return ids.map((id) => existing.get(id) || {
                      id,
                      full_name: people.find((p) => p.id === id)?.full_name || "Unknown",
                      title: people.find((p) => p.id === id)?.title || null,
                      exec_level: people.find((p) => p.id === id)?.exec_level || null,
                      department: [],
                      buyer_type: null,
                      primary_phone: null,
                      primary_email: null,
                    });
                  });
                }}
                options={personOptions}
                placeholder="Add people..."
              />
            </Field>
          </div>
          {relatedPeople.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">No people on this project.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/50">
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Name</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Title</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Level</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Department</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Buyer Type</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Phone</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {relatedPeople.map((person) => (
                    <tr
                      key={person.id}
                      className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition-colors"
                    >
                      <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                        <Link href={`/contacts/${person.id}?${buildFromParams(`/projects/${projectId}`, form.name)}`} className="text-black hover:underline">
                          {person.full_name}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-zinc-500 whitespace-nowrap">{person.title || "\u2014"}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {person.exec_level ? (
                          <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                            {person.exec_level.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </span>
                        ) : "\u2014"}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-500 text-xs whitespace-nowrap">
                        {person.department && person.department.length > 0 ? person.department.join(", ") : "\u2014"}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {person.buyer_type ? (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                            {person.buyer_type}
                          </span>
                        ) : "\u2014"}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-500 text-xs whitespace-nowrap">
                        {person.primary_phone ? formatPhone(person.primary_phone) : "\u2014"}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-500 text-xs whitespace-nowrap">
                        {person.primary_email || "\u2014"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Meetings Tab */}
      {activeTab === "meetings" && (
        <div>
          {relatedMeetings.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">No meetings for this project.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/50">
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Clients</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">People</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Date</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {relatedMeetings.map((m) => (
                    <tr key={m.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition-colors">
                      <td className="px-3 py-2.5 text-xs text-zinc-700">{m.clients.length > 0 ? m.clients.join(", ") : "\u2014"}</td>
                      <td className="px-3 py-2.5 text-xs text-zinc-700">{m.people.length > 0 ? m.people.join(", ") : "\u2014"}</td>
                      <td className="px-3 py-2.5 text-xs text-zinc-500 whitespace-nowrap">
                        {m.meeting_at ? new Date(m.meeting_at).toLocaleDateString() : "No date"}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <Link href={`/meetings/${m.id}?${buildFromParams(`/projects/${projectId}`, form.name)}`} className="text-zinc-400 hover:text-black transition-colors">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Submissions Tab */}
      {activeTab === "submissions" && (
        <div>
          {relatedSubmissions.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">No submissions for this project.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/50">
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Client</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Material</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Person</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Response</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {relatedSubmissions.map((s) => (
                    <tr key={s.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition-colors">
                      <td className="px-3 py-2.5 text-xs text-zinc-700">{s.client_name || "\u2014"}</td>
                      <td className="px-3 py-2.5 text-xs text-zinc-700">{s.material_title || "\u2014"}</td>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                        {s.person_id ? (
                          <Link href={`/contacts/${s.person_id}?${buildFromParams(`/projects/${projectId}`, form.name)}`} className="text-zinc-700 hover:text-black hover:underline">
                            {s.person_name}
                          </Link>
                        ) : "\u2014"}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {s.response ? (
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                            s.response === "love" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            s.response === "like" ? "bg-blue-50 text-blue-700 border-blue-200" :
                            s.response === "meh" ? "bg-amber-50 text-amber-700 border-amber-200" :
                            s.response === "hate" ? "bg-red-50 text-red-700 border-red-200" :
                            "bg-zinc-50 text-zinc-600 border-zinc-200"
                          }`}>
                            {s.response.charAt(0).toUpperCase() + s.response.slice(1)}
                          </span>
                        ) : (
                          <span className="text-zinc-400">{"\u2014"}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <Link href={`/submissions/${s.id}?${buildFromParams(`/projects/${projectId}`, form.name)}`} className="text-zinc-400 hover:text-black transition-colors">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Clients Tab */}
      {activeTab === "clients" && (
        <div>
          {relatedClients.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">No clients on this project.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/50">
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Client</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Staff Level</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Status</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Start Year</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">End Year</th>
                  </tr>
                </thead>
                <tbody>
                  {relatedClients.map((c) => (
                    <tr key={c.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-black whitespace-nowrap">{c.full_name}</td>
                      <td className="px-3 py-2.5 text-xs text-zinc-500">{c.level || "\u2014"}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {c.status ? <StatusBadge status={c.status} /> : "\u2014"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-zinc-500">{c.start_year || "\u2014"}</td>
                      <td className="px-3 py-2.5 text-xs text-zinc-500">{c.end_year || "\u2014"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Danger Zone */}
      <div className="mt-12 border-t border-zinc-200 pt-6">
        <p className="text-xs text-zinc-400 mb-3">Danger Zone</p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete this project"}
        </button>
      </div>
    </div>
  );
}

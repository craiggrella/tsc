"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  MultiRelationPicker,
  type RelationOption,
} from "@/components/shared/relation-picker";
import { Field, Input, Select } from "@/components/shared/detail-panel";
import type { ProjectStatus } from "@/types/database";

interface PersonData {
  id: string;
  full_name: string;
  title: string | null;
  exec_level: string | null;
}

interface ProjectCompanyRow {
  id?: string;
  company_id: string;
  designation: string;
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

const COMPANY_DESIGNATIONS = ["Network", "Studio", "Production Company"];

const emptyForm = {
  name: "",
  status: "development" as ProjectStatus,
  person_ids: [] as string[],
};

interface ProjectDetailProps {
  projectId: string;
  userId: string;
}

export function ProjectDetail({ projectId, userId }: ProjectDetailProps) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  const [people, setPeople] = useState<PersonData[]>([]);
  const [companyList, setCompanyList] = useState<{ id: string; name: string }[]>([]);
  const [projectCompanies, setProjectCompanies] = useState<ProjectCompanyRow[]>([]);
  const [origCompanyIds, setOrigCompanyIds] = useState<Set<string>>(new Set());

  // Related data for tabs
  const [relatedPeople, setRelatedPeople] = useState<PersonData[]>([]);
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [relatedClients, setRelatedClients] = useState<
    { id: string; full_name: string; level: string | null }[]
  >([]);
  const [relatedSubmissions, setRelatedSubmissions] = useState<
    { id: string; description: string; status: string }[]
  >([]);
  const [relatedMeetings, setRelatedMeetings] = useState<
    { id: string; title: string; meeting_status: string; meeting_at: string | null }[]
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
        supabase.from("client_credits").select("client:clients!client_id(id, full_name), level").eq("project_id", projectId),
        supabase.from("submission_projects").select("submission:submissions(id, description, status)").eq("project_id", projectId),
        supabase.from("meeting_projects").select("meeting:meetings(id, title, meeting_status, meeting_at)").eq("project_id", projectId),
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
      const matchedPeople = (peopleData || []).filter((p) => personIds.includes(p.id));
      setRelatedPeople(matchedPeople);

      setForm({
        name: project.name,
        status: project.status,
        person_ids: personIds,
      });

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
    { id: "contacts", label: "Contacts" },
    { id: "clients", label: "Clients" },
    { id: "submissions", label: "Submissions" },
    { id: "meetings", label: "Meetings" },
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
      {/* Back link */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-black transition-colors mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Projects
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-black">
          {form.name || "Untitled Project"}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "Saved \u2713" : "Save"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-zinc-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setExpandedPerson(null); }}
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
              onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
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

      {/* Contacts Tab */}
      {activeTab === "contacts" && (
        <div className="space-y-2">
          {relatedPeople.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">No contacts on this project.</p>
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
                    <Link
                      href={`/contacts/${person.id}`}
                      className="text-xs text-zinc-500 hover:text-black transition-colors"
                    >
                      View full contact record →
                    </Link>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Clients Tab */}
      {activeTab === "clients" && (
        <div className="space-y-2">
          {relatedClients.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">No clients on this project.</p>
          ) : (
            relatedClients.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-3">
                <p className="text-sm font-medium text-black">{c.full_name}</p>
                {c.level && <span className="text-xs text-zinc-500">{c.level}</span>}
              </div>
            ))
          )}
        </div>
      )}

      {/* Submissions Tab */}
      {activeTab === "submissions" && (
        <div className="space-y-2">
          {relatedSubmissions.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">No submissions for this project.</p>
          ) : (
            relatedSubmissions.map((s) => (
              <Link
                key={s.id}
                href={`/submissions/${s.id}`}
                className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-3 hover:bg-zinc-50 transition-colors"
              >
                <p className="text-sm font-medium text-black">{s.description}</p>
                <StatusBadge status={s.status} />
              </Link>
            ))
          )}
        </div>
      )}

      {/* Meetings Tab */}
      {activeTab === "meetings" && (
        <div className="space-y-2">
          {relatedMeetings.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">No meetings for this project.</p>
          ) : (
            relatedMeetings.map((m) => (
              <Link
                key={m.id}
                href={`/meetings?open=${m.id}`}
                className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-3 hover:bg-zinc-50 transition-colors"
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
    </div>
  );
}

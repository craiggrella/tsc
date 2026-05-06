"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, X, ExternalLink, Image as ImageIcon, Search } from "lucide-react";
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
import { useAutoSave } from "@/hooks/use-auto-save";
import { SavedIndicator } from "@/components/shared/saved-indicator";
import { quickCreatePerson } from "@/lib/quick-create-person";

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
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  // ── Poster state ──
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [imdbId, setImdbId] = useState<string | null>(null);
  const [posterFetchedAt, setPosterFetchedAt] = useState<string | null>(null);
  const [posterLoading, setPosterLoading] = useState(false);
  const [posterCandidates, setPosterCandidates] = useState<
    { imdbID: string; Title: string; Year: string; Type: string; Poster: string | null }[] | null
  >(null);
  const [posterError, setPosterError] = useState<string | null>(null);
  const [manualSearchInput, setManualSearchInput] = useState("");

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
          .select("id, full_name, title, exec_level, department, company:companies!company_id(buyer_type)")
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

        enrichedPeople = (fullPeople || []).map((p) => {
          const pp = p as unknown as { id: string; full_name: string; title: string | null; exec_level: string | null; department: string[] | null; company: { buyer_type: string | null } | null };
          return {
            id: pp.id,
            full_name: pp.full_name,
            title: pp.title,
            exec_level: pp.exec_level,
            department: pp.department || [],
            buyer_type: pp.company?.buyer_type || null,
            primary_phone: phoneMap[pp.id] || null,
            primary_email: emailMap[pp.id] || null,
          };
        });
      }
      setRelatedPeople(enrichedPeople);

      setForm({
        name: project.name,
        status: project.status,
        person_ids: personIds,
      });

      setPosterUrl(project.poster_url ?? null);
      setImdbId(project.imdb_id ?? null);
      setPosterFetchedAt(project.poster_fetched_at ?? null);
      const shouldAutoFetch = !project.poster_url && !project.poster_fetched_at;

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

      if (shouldAutoFetch) {
        triggerFetchPoster();
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function triggerFetchPoster(q?: string) {
    setPosterLoading(true);
    setPosterError(null);
    setPosterCandidates(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/fetch-poster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(q ? { q } : {}),
      });
      const data = await res.json();
      if (!res.ok) {
        setPosterError(data.error || "Failed to fetch poster.");
      } else if (data.matched) {
        setPosterUrl(data.poster_url);
        setImdbId(data.imdb_id);
        setPosterFetchedAt(new Date().toISOString());
      } else {
        setPosterCandidates(data.candidates || []);
        setPosterFetchedAt(new Date().toISOString());
      }
    } catch (err) {
      setPosterError(err instanceof Error ? err.message : "Failed to fetch poster.");
    } finally {
      setPosterLoading(false);
    }
  }

  async function handlePickCandidate(imdbID: string) {
    setPosterLoading(true);
    setPosterError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/set-poster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imdb_id: imdbID }),
      });
      const data = await res.json();
      if (res.ok) {
        setPosterUrl(data.poster_url);
        setImdbId(data.imdb_id);
        setPosterCandidates(null);
      } else {
        setPosterError(data.error || "Failed to set poster.");
      }
    } finally {
      setPosterLoading(false);
    }
  }

  async function handleClearPoster() {
    setPosterLoading(true);
    try {
      await fetch(`/api/projects/${projectId}/clear-poster`, { method: "POST" });
      setPosterUrl(null);
      setImdbId(null);
      setPosterFetchedAt(null);
      setPosterCandidates(null);
      await triggerFetchPoster();
    } finally {
      // triggerFetchPoster manages loading state at the end
    }
  }

  function handleManualSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = manualSearchInput.trim();
    if (!q) return;
    triggerFetchPoster(q);
    setManualSearchInput("");
  }

  const companyOptions: RelationOption[] = useMemo(
    () => companyList.map((c) => ({ id: c.id, label: c.name })),
    [companyList]
  );
  const personOptions: RelationOption[] = useMemo(
    () => people.map((p) => ({ id: p.id, label: p.full_name, sublabel: p.title || undefined })),
    [people]
  );

  type ProjectAutoSaveSnapshot = {
    form: typeof emptyForm;
    projectCompanies: typeof projectCompanies;
  };

  const autoSaveState: ProjectAutoSaveSnapshot = useMemo(
    () => ({ form, projectCompanies }),
    [form, projectCompanies]
  );

  const autoSaveRestore = useCallback((snap: unknown) => {
    const s = snap as Partial<ProjectAutoSaveSnapshot> & Record<string, unknown>;
    if (s && typeof s === "object" && "form" in s && s.form) {
      setForm(s.form as typeof emptyForm);
      if (s.projectCompanies) setProjectCompanies(s.projectCompanies as typeof projectCompanies);
    } else if (s && typeof s === "object") {
      const row = s as Record<string, unknown>;
      setForm((prev) => ({
        ...prev,
        name: (row.name as string) ?? "",
        status: (row.status as string) ?? "development",
      }));
    }
  }, []);

  const autoSave = useAutoSave<ProjectAutoSaveSnapshot>({
    recordId: projectId,
    tableName: "projects",
    state: autoSaveState,
    restore: autoSaveRestore,
    enabled: !loading,
    save: async (snap) => {
      const payload = { name: snap.form.name, status: snap.form.status };
      await supabase.from("projects").update(payload).eq("id", projectId);

      const currentIds = new Set(snap.projectCompanies.filter((r) => r.id).map((r) => r.id!));
      const toDelete = [...origCompanyIds].filter((id) => !currentIds.has(id));
      if (toDelete.length > 0) {
        await supabase.from("project_companies").delete().in("id", toDelete);
      }
      for (const pc of snap.projectCompanies) {
        if (pc.id) {
          await supabase.from("project_companies").update({ company_id: pc.company_id, designation: pc.designation }).eq("id", pc.id);
        } else {
          const { data } = await supabase.from("project_companies").insert({ project_id: projectId, company_id: pc.company_id, designation: pc.designation }).select("id").single();
          if (data) pc.id = data.id;
        }
      }
      setOrigCompanyIds(new Set(snap.projectCompanies.filter((r) => r.id).map((r) => r.id!)));

      await supabase.from("project_people").delete().eq("project_id", projectId);
      if (snap.form.person_ids.length > 0) {
        await supabase.from("project_people").insert(snap.form.person_ids.map((id) => ({ project_id: projectId, person_id: id })));
      }
    },
  });

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
    <div>
      <Breadcrumb fallbackHref="/projects" fallbackLabel="Projects" currentLabel={form.name || "Untitled"} />

      {/* Header — poster + name */}
      <div className="mb-6 flex items-start gap-4">
        <PosterBlock
          posterUrl={posterUrl}
          loading={posterLoading}
          onReplace={handleClearPoster}
        />
        <div className="flex-1 min-w-0 flex items-start justify-between pt-1">
          <h1 className="text-xl font-semibold tracking-tight text-black">
            {form.name || "Untitled Project"}
          </h1>
          <SavedIndicator
            saving={autoSave.saving}
            savedAt={autoSave.savedAt}
            error={autoSave.error}
            hasUndo={autoSave.hasUndo}
            onUndo={autoSave.undo}
          />
        </div>
      </div>

      {/* Poster picker — only when we have candidates or no match */}
      {(posterCandidates || posterError) && (
        <div className="mb-6 rounded-md border border-zinc-200 bg-zinc-50 p-4">
          {posterError ? (
            <div>
              <p className="text-xs text-red-500 mb-2">{posterError}</p>
              <ManualPosterSearch
                value={manualSearchInput}
                onChange={setManualSearchInput}
                onSubmit={handleManualSearch}
              />
            </div>
          ) : posterCandidates && posterCandidates.length === 0 ? (
            <div>
              <p className="text-xs text-zinc-600 mb-2">
                No poster found for &ldquo;{form.name}&rdquo;. Try a different search:
              </p>
              <ManualPosterSearch
                value={manualSearchInput}
                onChange={setManualSearchInput}
                onSubmit={handleManualSearch}
              />
            </div>
          ) : posterCandidates && posterCandidates.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-zinc-700 mb-3">
                Multiple matches — pick one:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {posterCandidates.map((c) => (
                  <button
                    key={c.imdbID}
                    type="button"
                    onClick={() => handlePickCandidate(c.imdbID)}
                    disabled={posterLoading}
                    className="group flex flex-col gap-1 rounded-md border border-zinc-200 bg-white p-2 text-left hover:border-black transition-colors disabled:opacity-50"
                  >
                    {c.Poster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.Poster}
                        alt={c.Title}
                        className="aspect-[2/3] w-full rounded object-cover bg-zinc-100"
                      />
                    ) : (
                      <div className="aspect-[2/3] w-full rounded bg-zinc-100 flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-zinc-300" />
                      </div>
                    )}
                    <p className="truncate text-xs font-medium text-black">{c.Title}</p>
                    <p className="text-[10px] text-zinc-500">
                      {c.Year} • {c.Type}
                    </p>
                  </button>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-200">
                <p className="text-[11px] text-zinc-500 mb-2">Not the right ones? Search by a different title:</p>
                <ManualPosterSearch
                  value={manualSearchInput}
                  onChange={setManualSearchInput}
                  onSubmit={handleManualSearch}
                />
              </div>
            </div>
          ) : null}
        </div>
      )}

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
              manageTable="list_project_statuses"
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
                onAdd={(name) => quickCreatePerson(supabase, name, userId)}
                addLabel="Create"
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

function PosterBlock({
  posterUrl,
  loading,
  onReplace,
}: {
  posterUrl: string | null;
  loading: boolean;
  onReplace: () => void;
}) {
  return (
    <div className="flex-shrink-0">
      <div className="relative w-[120px] aspect-[2/3] rounded-md bg-zinc-100 overflow-hidden">
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={posterUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-7 w-7 text-zinc-300" />
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
          </div>
        )}
      </div>
      {posterUrl && !loading && (
        <button
          type="button"
          onClick={onReplace}
          className="mt-1 text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          Replace poster
        </button>
      )}
    </div>
  );
}

function ManualPosterSearch({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search OMDB by title..."
          className="w-full rounded-md border border-zinc-200 bg-white pl-7 pr-2 py-1.5 text-xs outline-none focus:border-zinc-400"
        />
      </div>
      <button
        type="submit"
        className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 transition-colors"
      >
        Search
      </button>
    </form>
  );
}

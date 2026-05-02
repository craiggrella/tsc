"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ExternalLink } from "lucide-react";
import { Breadcrumb, buildFromParams } from "@/components/shared/breadcrumb";
import { createClient } from "@/lib/supabase/client";
import { Field, Input, Select, Textarea } from "@/components/shared/detail-panel";
import { PicklistSelect } from "@/components/shared/picklist-select";
import { MailIconButton } from "@/components/shared/email-link";
import { MultiRelationPicker, type RelationOption } from "@/components/shared/relation-picker";
import { formatPhone } from "@/lib/utils";
import { usePicklist, toRelationOptions, toSelectOptions } from "@/lib/picklists";
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
import { StatusBadge } from "@/components/shared/status-badge";
import { useAutoSave } from "@/hooks/use-auto-save";
import { SavedIndicator } from "@/components/shared/saved-indicator";

interface PersonRow {
  id: string;
  full_name: string;
  title: string | null;
  exec_level: string | null;
  department: string[];
  primary_phone: string | null;
  primary_email: string | null;
}

interface ProjectRow {
  id: string;
  name: string;
  designation: string;
  status: string;
  genre: string | null;
  sub_genre: string | null;
}

interface CompanyDetailProps {
  companyId: string;
  userId: string;
}

export function CompanyDetail({ companyId, userId }: CompanyDetailProps) {
  const supabase = createClient();
  const router = useRouter();
  const companyTypesItems = usePicklist("list_company_types");
  const COMPANY_TYPES = toRelationOptions(companyTypesItems);
  const outletsItems = usePicklist("list_outlets");
  const COMPANY_OUTLETS = toRelationOptions(outletsItems);
  const departmentsItems = usePicklist("list_departments");
  const DEPARTMENTS = toRelationOptions(departmentsItems);
  const buyerTypesItems = usePicklist("list_buyer_types");
  const BUYER_TYPES = toSelectOptions(buyerTypesItems);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  const [form, setForm] = useState({
    name: "",
    types: [] as string[],
    outlet: [] as string[],
    department: [] as string[],
    phone: null as string | null,
    buyer_type: null as string | null,
    notes: null as string | null,
  });

  const [people, setPeople] = useState<PersonRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);

  // Sub-records for company contact info
  const [phones, setPhones] = useState<PhoneRecord[]>([]);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [addresses, setAddresses] = useState<AddressRecord[]>([]);
  const [socials, setSocials] = useState<SocialRecord[]>([]);
  const [origPhoneIds, setOrigPhoneIds] = useState<Set<string>>(new Set());
  const [origEmailIds, setOrigEmailIds] = useState<Set<string>>(new Set());
  const [origAddressIds, setOrigAddressIds] = useState<Set<string>>(new Set());
  const [origSocialIds, setOrigSocialIds] = useState<Set<string>>(new Set());

  // Grid tab state
  const [gridLoading, setGridLoading] = useState(false);
  const [gridLoaded, setGridLoaded] = useState(false);
  const [gridMetWith, setGridMetWith] = useState<{ id: string; full_name: string; meetingCount: number; lastMeeting: string | null; metByPersons: string[] }[]>([]);
  const [gridNotMet, setGridNotMet] = useState<{ id: string; full_name: string }[]>([]);
  const [gridSubmissions, setGridSubmissions] = useState<{ id: string; title: string; client_name: string | null; response: string | null; person_name: string | null }[]>([]);

  useEffect(() => {
    async function load() {
      const [
        { data: company },
        { data: peopleData },
        { data: phonesData },
        { data: emailsData },
        { data: addressesData },
        { data: socialsData },
        { data: projectCompaniesData },
      ] = await Promise.all([
        supabase.from("companies").select("*").eq("id", companyId).single(),
        supabase
          .from("people")
          .select("id, full_name, title, exec_level, department")
          .eq("company_id", companyId)
          .order("full_name"),
        supabase
          .from("contact_phones")
          .select("id, designation, number, is_primary")
          .eq("entity_type", "company")
          .eq("entity_id", companyId)
          .order("is_primary", { ascending: false }),
        supabase
          .from("contact_emails")
          .select("id, designation, address, is_primary")
          .eq("entity_type", "company")
          .eq("entity_id", companyId)
          .order("is_primary", { ascending: false }),
        supabase
          .from("contact_addresses")
          .select("id, designation, street, street2, street3, city, state, zip, country, is_primary")
          .eq("entity_type", "company")
          .eq("entity_id", companyId)
          .order("is_primary", { ascending: false }),
        supabase
          .from("contact_socials")
          .select("id, platform, url")
          .eq("entity_type", "company")
          .eq("entity_id", companyId),
        supabase
          .from("project_companies")
          .select("designation, company_id, project:projects(id, name, status, genre, sub_genre)")
          .eq("company_id", companyId),
      ]);

      if (!company) {
        router.replace("/companies");
        return;
      }

      setForm({
        name: company.name,
        types: company.types || [],
        outlet: company.outlet || [],
        department: company.department || [],
        phone: company.phone,
        buyer_type: company.buyer_type || null,
        notes: company.notes,
      });

      // Fetch primary phone and email for each person
      const personIds = (peopleData || []).map((p) => p.id);
      let phoneMap: Record<string, string> = {};
      let emailMap: Record<string, string> = {};
      if (personIds.length > 0) {
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
        for (const p of personPhones || []) { if (!phoneMap[p.entity_id]) phoneMap[p.entity_id] = p.number; }
        for (const e of personEmails || []) { if (!emailMap[e.entity_id]) emailMap[e.entity_id] = e.address; }
      }

      setPeople(
        (peopleData || []).map((p) => ({
          ...p,
          primary_phone: phoneMap[p.id] || null,
          primary_email: emailMap[p.id] || null,
        }))
      );

      // Build projects list
      const projRows: ProjectRow[] = [];
      for (const row of projectCompaniesData || []) {
        const r = row as unknown as {
          designation: string;
          company_id: string;
          project: { id: string; name: string; status: string; genre: string | null; sub_genre: string | null } | null;
        };
        if (r.project) {
          projRows.push({
            id: r.project.id,
            name: r.project.name,
            designation: r.designation,
            status: r.project.status,
            genre: r.project.genre,
            sub_genre: r.project.sub_genre,
          });
        }
      }
      setProjects(projRows.sort((a, b) => a.name.localeCompare(b.name)));

      // Contact info sub-records
      const pList = (phonesData || []) as PhoneRecord[];
      const eList = (emailsData || []) as EmailRecord[];
      const aList = (addressesData || []).map((a) => ({
        ...a,
        street: a.street || "",
        street2: a.street2 || "",
        street3: a.street3 || "",
        city: a.city || "",
        state: a.state || "",
        zip: a.zip || "",
        country: a.country || "",
      })) as AddressRecord[];
      const sList = (socialsData || []) as SocialRecord[];
      setPhones(pList);
      setEmails(eList);
      setAddresses(aList);
      setSocials(sList);
      setOrigPhoneIds(new Set(pList.filter((p) => p.id).map((p) => p.id!)));
      setOrigEmailIds(new Set(eList.filter((e) => e.id).map((e) => e.id!)));
      setOrigAddressIds(new Set(aList.filter((a) => a.id).map((a) => a.id!)));
      setOrigSocialIds(new Set(sList.filter((s) => s.id).map((s) => s.id!)));

      setLoading(false);
    }
    load();
  }, [companyId]);

  // Grid tab data loader (only runs once when grid tab is opened)
  useEffect(() => {
    if (activeTab !== "grid" || gridLoaded || !form.buyer_type) return;
    setGridLoading(true);
    async function loadGrid() {
      // 1. All clients
      const { data: allClients } = await supabase.from("clients").select("id, full_name").order("full_name");

      // 2. People at this company
      const personIds = people.map((p) => p.id);
      const personNameById = new Map(people.map((p) => [p.id, p.full_name]));

      // 3. Meeting attendance for those people (meeting_id, person_id, meeting_at)
      let metClientMap: Record<string, { count: number; lastDate: string | null; metByPersonIds: Set<string> }> = {};
      if (personIds.length > 0) {
        const { data: mp } = await supabase
          .from("meeting_people")
          .select("meeting_id, person_id, meeting:meetings(meeting_at)")
          .in("person_id", personIds);
        const meetingPersonRows = (mp || []) as unknown as { meeting_id: string; person_id: string; meeting: { meeting_at: string | null } | null }[];
        const meetingIds = [...new Set(meetingPersonRows.map((r) => r.meeting_id))];

        if (meetingIds.length > 0) {
          // 4. Clients on those meetings
          const { data: mc } = await supabase
            .from("meeting_clients")
            .select("meeting_id, client_id")
            .in("meeting_id", meetingIds);
          const meetingClientRows = (mc || []) as { meeting_id: string; client_id: string }[];

          // Build lookup: meeting_id -> meeting_at, meeting_id -> [person_ids]
          const meetingAt = new Map<string, string | null>();
          const meetingPeople = new Map<string, Set<string>>();
          for (const r of meetingPersonRows) {
            meetingAt.set(r.meeting_id, r.meeting?.meeting_at || null);
            if (!meetingPeople.has(r.meeting_id)) meetingPeople.set(r.meeting_id, new Set());
            meetingPeople.get(r.meeting_id)!.add(r.person_id);
          }

          // 5. Aggregate per client
          for (const r of meetingClientRows) {
            if (!metClientMap[r.client_id]) {
              metClientMap[r.client_id] = { count: 0, lastDate: null, metByPersonIds: new Set() };
            }
            metClientMap[r.client_id].count++;
            const at = meetingAt.get(r.meeting_id) || null;
            if (at && (!metClientMap[r.client_id].lastDate || at > metClientMap[r.client_id].lastDate!)) {
              metClientMap[r.client_id].lastDate = at;
            }
            const peopleOnMeeting = meetingPeople.get(r.meeting_id);
            if (peopleOnMeeting) {
              for (const pid of peopleOnMeeting) metClientMap[r.client_id].metByPersonIds.add(pid);
            }
          }
        }
      }

      const clientNameById = new Map((allClients || []).map((c) => [c.id, c.full_name]));
      const met = Object.entries(metClientMap).map(([id, data]) => ({
        id,
        full_name: clientNameById.get(id) || "Unknown",
        meetingCount: data.count,
        lastMeeting: data.lastDate,
        metByPersons: [...data.metByPersonIds]
          .map((pid) => personNameById.get(pid) || "")
          .filter(Boolean)
          .sort(),
      })).sort((a, b) => a.full_name.localeCompare(b.full_name));
      const metIds = new Set(Object.keys(metClientMap));
      const notMet = (allClients || []).filter((c) => !metIds.has(c.id)).map((c) => ({ id: c.id, full_name: c.full_name }));

      setGridMetWith(met);
      setGridNotMet(notMet);

      // 6. Submissions: any submission_item where person_id is at this company
      let subs: typeof gridSubmissions = [];
      if (personIds.length > 0) {
        const { data: subItems } = await supabase
          .from("submission_items")
          .select("response, person_id, material:client_materials!material_id(id, title, client:clients!client_id(full_name))")
          .in("person_id", personIds)
          .not("material_id", "is", null);
        const seen = new Set<string>();
        for (const item of (subItems || [])) {
          const mat = (item as Record<string, unknown>).material as { id: string; title: string; client: { full_name: string } | null } | null;
          if (mat && !seen.has(mat.id)) {
            seen.add(mat.id);
            subs.push({
              id: mat.id,
              title: mat.title,
              client_name: mat.client?.full_name || null,
              response: (item as { response: string | null }).response || null,
              person_name: personNameById.get((item as { person_id: string }).person_id) || null,
            });
          }
        }
      }
      setGridSubmissions(subs);

      setGridLoading(false);
      setGridLoaded(true);
    }
    loadGrid();
  }, [activeTab, gridLoaded, form.buyer_type, people, supabase]);

  type CompanyAutoSaveSnapshot = {
    form: typeof form;
    phones: PhoneRecord[];
    emails: EmailRecord[];
    addresses: AddressRecord[];
    socials: SocialRecord[];
  };

  const autoSaveState: CompanyAutoSaveSnapshot = useMemo(
    () => ({ form, phones, emails, addresses, socials }),
    [form, phones, emails, addresses, socials]
  );

  const autoSaveRestore = useCallback(
    (snap: unknown) => {
      const s = snap as Partial<CompanyAutoSaveSnapshot> & Record<string, unknown>;
      if (s && typeof s === "object" && "form" in s && s.form) {
        setForm(s.form as typeof form);
        if (s.phones) setPhones(s.phones as PhoneRecord[]);
        if (s.emails) setEmails(s.emails as EmailRecord[]);
        if (s.addresses) setAddresses(s.addresses as AddressRecord[]);
        if (s.socials) setSocials(s.socials as SocialRecord[]);
      } else if (s && typeof s === "object") {
        const row = s as Record<string, unknown>;
        setForm({
          name: (row.name as string) ?? "",
          types: (row.types as string[] | null) ?? [],
          outlet: (row.outlet as string[] | null) ?? [],
          department: (row.department as string[] | null) ?? [],
          phone: (row.phone as string | null) ?? null,
          buyer_type: (row.buyer_type as string | null) ?? null,
          notes: (row.notes as string | null) ?? null,
        });
      }
    },
    []
  );

  const autoSave = useAutoSave<CompanyAutoSaveSnapshot>({
    recordId: companyId,
    tableName: "companies",
    state: autoSaveState,
    restore: autoSaveRestore,
    enabled: !loading,
    save: async (snap) => {
      await supabase.from("companies").update({ ...snap.form }).eq("id", companyId);
      await Promise.all([
        syncPhones("company" as "person", companyId, snap.phones, origPhoneIds),
        syncEmails("company" as "person", companyId, snap.emails, origEmailIds),
        syncAddresses("company" as "person", companyId, snap.addresses, origAddressIds),
        syncSocials("company" as "client", companyId, snap.socials, origSocialIds),
      ]);
      setOrigPhoneIds(new Set(snap.phones.filter((p) => p.id).map((p) => p.id!)));
      setOrigEmailIds(new Set(snap.emails.filter((e) => e.id).map((e) => e.id!)));
      setOrigAddressIds(new Set(snap.addresses.filter((a) => a.id).map((a) => a.id!)));
      setOrigSocialIds(new Set(snap.socials.filter((s) => s.id).map((s) => s.id!)));
    },
  });

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this company? People linked to it will lose their company association.")) return;
    setDeleting(true);
    try {
      await supabase.from("companies").delete().eq("id", companyId);
      router.push("/companies");
    } finally {
      setDeleting(false);
    }
  }, [companyId, supabase, router]);

  const tabs = [
    { id: "info", label: "Info" },
    ...(form.buyer_type ? [{ id: "grid", label: "Grid" }] : []),
    { id: "people", label: "People" },
    { id: "projects", label: "Projects" },
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
      <Breadcrumb fallbackHref="/companies" fallbackLabel="Companies" currentLabel={form.name || "Untitled"} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-black">
          {form.name || "Untitled Company"}
        </h1>
        <SavedIndicator
          saving={autoSave.saving}
          savedAt={autoSave.savedAt}
          error={autoSave.error}
          hasUndo={autoSave.hasUndo}
          onUndo={autoSave.undo}
        />
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
          <Field label="Company Name">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Company name"
            />
          </Field>

          <div className="grid grid-cols-4 gap-3">
            <Field label="Buyer Type">
              <PicklistSelect
                value={form.buyer_type}
                onChange={(v) => setForm({ ...form, buyer_type: v })}
                options={BUYER_TYPES}
                placeholder="Not a buyer"
                manageTable="list_buyer_types"
              />
            </Field>
            <Field label="Types">
              <MultiRelationPicker
                value={form.types}
                onChange={(ids) => setForm({ ...form, types: ids })}
                options={COMPANY_TYPES}
                placeholder="Select types..."
              />
            </Field>
            <Field label="Outlet">
              <MultiRelationPicker
                value={form.outlet}
                onChange={(ids) => setForm({ ...form, outlet: ids })}
                options={COMPANY_OUTLETS}
                placeholder="Select outlets..."
              />
            </Field>
            <Field label="Departments">
              <MultiRelationPicker
                value={form.department}
                onChange={(ids) => setForm({ ...form, department: ids })}
                options={DEPARTMENTS}
                placeholder="Select departments..."
              />
            </Field>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 grid grid-cols-1 md:grid-cols-2 gap-x-24 gap-y-12">
            <PhoneSection phones={phones} onChange={setPhones} />
            <EmailSection emails={emails} onChange={setEmails} />
            <AddressSection addresses={addresses} onChange={setAddresses} />
            <SocialSection socials={socials} onChange={setSocials} />
          </div>

          <Field label="Notes">
            <Textarea
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
              placeholder="Notes..."
            />
          </Field>
        </div>
      )}

      {/* People Tab */}
      {activeTab === "people" && (
        <div>
          <h2 className="text-sm font-semibold text-black mb-3">
            People at {form.name || "this company"}{" "}
            <span className="font-normal text-zinc-400">({people.length})</span>
          </h2>
          {people.length === 0 ? (
            <p className="text-sm text-zinc-400 py-6 text-center border border-zinc-200 rounded-lg">
              No contacts linked to this company.
            </p>
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
                  {people.map((person) => (
                    <tr
                      key={person.id}
                      className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition-colors"
                    >
                      <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                        <Link
                          href={`/contacts/${person.id}?${buildFromParams(`/companies/${companyId}`, form.name)}`}
                          className="text-black hover:underline"
                        >
                          {person.full_name}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-zinc-500 whitespace-nowrap">
                        {person.title || "\u2014"}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {person.exec_level ? (
                          <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                            {person.exec_level.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </span>
                        ) : "\u2014"}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {person.department && person.department.length > 0
                          ? person.department.join(", ")
                          : "\u2014"}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {form.buyer_type ? (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                            {form.buyer_type}
                          </span>
                        ) : "\u2014"}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-500 text-xs whitespace-nowrap">
                        {person.primary_phone ? formatPhone(person.primary_phone) : "\u2014"}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-500 text-xs whitespace-nowrap">
                        {person.primary_email ? (
                          <span className="inline-flex items-center gap-1.5">
                            {person.primary_email}
                            <MailIconButton email={person.primary_email} />
                          </span>
                        ) : "\u2014"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Projects Tab */}
      {activeTab === "projects" && (
        <div>
          <h2 className="text-sm font-semibold text-black mb-3">
            Projects{" "}
            <span className="font-normal text-zinc-400">({projects.length})</span>
          </h2>
          {projects.length === 0 ? (
            <p className="text-sm text-zinc-400 py-6 text-center border border-zinc-200 rounded-lg">
              No projects associated with this company.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/50">
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Project</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Type</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Status</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Genre</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Sub-genre</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((proj) => (
                    <tr
                      key={proj.id}
                      className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition-colors"
                    >
                      <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                        <Link
                          href={`/projects/${proj.id}?${buildFromParams(`/companies/${companyId}`, form.name)}`}
                          className="text-black hover:underline"
                        >
                          {proj.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-zinc-500 text-xs whitespace-nowrap">
                        {proj.designation || "\u2014"}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <StatusBadge status={proj.status} />
                      </td>
                      <td className="px-3 py-2.5 text-zinc-500 text-xs whitespace-nowrap">
                        {proj.genre || "\u2014"}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-500 text-xs whitespace-nowrap">
                        {proj.sub_genre || "\u2014"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Grid Tab */}
      {activeTab === "grid" && (
        <div>
          {gridLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          ) : (
            <>
              {/* Company summary card */}
              {(() => {
                const primaryPhone = phones.find((p) => p.is_primary)?.number || phones[0]?.number || null;
                const primaryEmail = emails.find((e) => e.is_primary)?.address || emails[0]?.address || null;
                const primaryAddr = addresses.find((a) => a.is_primary) || addresses[0] || null;
                const addrLine = primaryAddr
                  ? [primaryAddr.street, primaryAddr.street2, primaryAddr.street3, [primaryAddr.city, primaryAddr.state].filter(Boolean).join(", "), primaryAddr.zip, primaryAddr.country !== "USA" ? primaryAddr.country : ""]
                      .filter(Boolean)
                      .join(", ")
                  : null;
                const hasAnyContactInfo = primaryPhone || primaryEmail || addrLine || socials.length > 0;
                return (
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 mb-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-black">{form.name}</h3>
                        {form.types.length > 0 && (
                          <p className="text-sm text-zinc-600">
                            {form.types.map((t) => t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())).join(", ")}
                          </p>
                        )}
                        <div className="mt-2 space-y-1 text-sm text-zinc-600">
                          {primaryPhone && <div>{formatPhone(primaryPhone)}</div>}
                          {primaryEmail && (
                            <div className="inline-flex items-center gap-1.5">
                              {primaryEmail}
                              <MailIconButton email={primaryEmail} />
                            </div>
                          )}
                          {addrLine && <div>{addrLine}</div>}
                          {socials.length > 0 && (
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                              {socials.map((s) => (
                                <a
                                  key={s.id || s.url}
                                  href={s.url.startsWith("http") ? s.url : `https://${s.url}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-zinc-600 hover:text-black hover:underline"
                                >
                                  {s.platform}
                                </a>
                              ))}
                            </div>
                          )}
                          {!hasAnyContactInfo && (
                            <div className="text-zinc-400 italic">No contact info on file.</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
                        {form.buyer_type && (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                            {form.buyer_type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Met With / Not Met */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Met With */}
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-4">
                  <h4 className="text-base font-semibold text-emerald-800 mb-3">
                    Met With <span className="font-normal text-emerald-600">({gridMetWith.length})</span>
                  </h4>
                  {gridMetWith.length === 0 ? (
                    <p className="text-sm text-emerald-600/60">No meetings with any clients yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {gridMetWith.map((c) => (
                        <div key={c.id} className="text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-emerald-900">{c.full_name}</span>
                            <span className="text-emerald-600">
                              {c.meetingCount} meeting{c.meetingCount !== 1 ? "s" : ""}
                              {c.lastMeeting && ` · ${new Date(c.lastMeeting).toLocaleDateString()}`}
                            </span>
                          </div>
                          {c.metByPersons.length > 0 && (
                            <div className="text-xs text-emerald-700/70 mt-0.5">
                              met by: {c.metByPersons.join(", ")}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Not Yet Met */}
                <div className="rounded-lg border border-zinc-200 bg-zinc-50/30 p-4">
                  <h4 className="text-base font-semibold text-zinc-700 mb-3">
                    Not Yet Met <span className="font-normal text-zinc-500">({gridNotMet.length})</span>
                  </h4>
                  {gridNotMet.length === 0 ? (
                    <p className="text-sm text-zinc-400">Met with all clients!</p>
                  ) : (
                    <div className="space-y-1">
                      {gridNotMet.map((c) => (
                        <p key={c.id} className="text-sm text-zinc-600">{c.full_name}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submissions */}
              <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-4">
                <h4 className="text-base font-semibold text-blue-800 mb-3">
                  Submissions <span className="font-normal text-blue-600">({gridSubmissions.length})</span>
                </h4>
                {gridSubmissions.length === 0 ? (
                  <p className="text-sm text-blue-600/60">No materials submitted to anyone at this company yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {gridSubmissions.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium text-blue-900">{m.title}</span>
                          {m.client_name && <span className="ml-2 text-blue-600">({m.client_name})</span>}
                          {m.person_name && <span className="ml-2 text-blue-700/70">→ {m.person_name}</span>}
                        </div>
                        {m.response ? (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            m.response === "love" ? "bg-emerald-100 text-emerald-700" :
                            m.response === "like" ? "bg-blue-100 text-blue-700" :
                            m.response === "meh" ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {m.response.charAt(0).toUpperCase() + m.response.slice(1)}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400">No response</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
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
          {deleting ? "Deleting..." : "Delete this company"}
        </button>
      </div>
    </div>
  );
}

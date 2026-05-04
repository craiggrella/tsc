"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ExternalLink, Plus, Trash2, Copy, Check as CheckIcon } from "lucide-react";
import { Breadcrumb, buildFromParams } from "@/components/shared/breadcrumb";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  RelationPicker,
  MultiRelationPicker,
  type RelationOption,
} from "@/components/shared/relation-picker";
import { Field, Input, Textarea } from "@/components/shared/detail-panel";
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
import { usePicklist, toSelectOptions } from "@/lib/picklists";
import { useAutoSave } from "@/hooks/use-auto-save";
import { SavedIndicator } from "@/components/shared/saved-indicator";

interface CompanyData {
  id: string;
  name: string;
}

interface ProjectData {
  id: string;
  name: string;
}

interface CreditRow {
  id?: string;
  project_id: string | null;
  project_name: string;
  level: string;
  credit_status: string | null;
  start_year: number | null;
  end_year: number | null;
  _deleted?: boolean;
}

interface MeetingTableRow {
  meeting_id: string;
  person_name: string;
  person_id: string | null;
  date: string | null;
  project_name: string | null;
}

interface SubmissionTableRow {
  submission_id: string;
  person_name: string;
  person_id: string | null;
  company_name: string | null;
  project_name: string | null;
  response: string | null;
}

interface CallTableRow {
  id: string;
  due_date: string | null;
  call_status: string;
  contact_name: string | null;
}

const emptyForm = {
  full_name: "",
  first_name: null as string | null,
  last_name: null as string | null,
  company_id: null as string | null,
  staff_level: null as string | null,
  manager_ids: [] as string[],
  notes: null as string | null,
};

interface ClientDetailProps {
  clientId: string;
  userId: string;
}

export function ClientDetail({ clientId, userId }: ClientDetailProps) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [managers, setManagers] = useState<{ id: string; full_name: string }[]>([]);

  // Picklists
  const creditStatusItems = usePicklist("list_credit_statuses");
  const creditStatusOptions = useMemo(() => toSelectOptions(creditStatusItems), [creditStatusItems]);

  // Sub-records
  const [phones, setPhones] = useState<PhoneRecord[]>([]);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [addresses, setAddresses] = useState<AddressRecord[]>([]);
  const [socials, setSocials] = useState<SocialRecord[]>([]);
  const [macros, setMacros] = useState<{ id?: string; label: string; content: string; sort_order: number; updated_at?: string | null }[]>([]);
  const [origMacroIds, setOrigMacroIds] = useState<Set<string>>(new Set());
  const [origPhoneIds, setOrigPhoneIds] = useState<Set<string>>(new Set());
  const [origEmailIds, setOrigEmailIds] = useState<Set<string>>(new Set());
  const [origAddressIds, setOrigAddressIds] = useState<Set<string>>(new Set());
  const [origSocialIds, setOrigSocialIds] = useState<Set<string>>(new Set());

  // Related records
  const [relatedMaterials, setRelatedMaterials] = useState<
    { id: string; title: string; material_type: string | null; format: string | null; genre: string | null; sub_genre: string | null; status: string }[]
  >([]);

  // Credits
  const [credits, setCredits] = useState<CreditRow[]>([]);
  const [origCreditIds, setOrigCreditIds] = useState<Set<string>>(new Set());
  const [creditsSaving, setCreditsSaving] = useState(false);

  // Meetings table
  const [meetingRows, setMeetingRows] = useState<MeetingTableRow[]>([]);
  const [meetingsLoaded, setMeetingsLoaded] = useState(false);

  // Submissions table
  const [submissionRows, setSubmissionRows] = useState<SubmissionTableRow[]>([]);
  const [submissionsLoaded, setSubmissionsLoaded] = useState(false);

  // Calls table
  const [callRows, setCallRows] = useState<CallTableRow[]>([]);
  const [callsLoaded, setCallsLoaded] = useState(false);

  // Client Grid state
  const [gridMetWith, setGridMetWith] = useState<{ id: string; full_name: string; company: string | null; buyer_type: string | null; meetingCount: number; lastMeeting: string | null }[]>([]);
  const [gridNotMet, setGridNotMet] = useState<{ id: string; full_name: string; company_name: string | null; title: string | null; buyer_type: string | null }[]>([]);
  const [gridLoading, setGridLoading] = useState(false);
  const [gridLoaded, setGridLoaded] = useState(false);
  const [gridBuyerFilter, setGridBuyerFilter] = useState("");
  const [selectedNotMet, setSelectedNotMet] = useState<string | null>(null);
  const [selectedPersonDetail, setSelectedPersonDetail] = useState<{ materials: { title: string; date: string | null; response: string | null }[] } | null>(null);

  useEffect(() => {
    async function load() {
      const [
        { data: client },
        { data: companiesData },
        { data: projectsData },
        { data: phonesData },
        { data: emailsData },
        { data: addressesData },
        { data: socialsData },
        { data: materials },
        { data: creditsData },
        { data: macrosData },
        { data: managersData },
        { data: clientManagersData },
      ] = await Promise.all([
        supabase
          .from("clients")
          .select("*, company:companies!company_id(id, name)")
          .eq("id", clientId)
          .single(),
        supabase.from("companies").select("id, name").order("name"),
        supabase.from("projects").select("id, name").order("name"),
        supabase
          .from("contact_phones")
          .select("id, designation, number, is_primary")
          .eq("entity_type", "client")
          .eq("entity_id", clientId)
          .order("is_primary", { ascending: false }),
        supabase
          .from("contact_emails")
          .select("id, designation, address, is_primary")
          .eq("entity_type", "client")
          .eq("entity_id", clientId)
          .order("is_primary", { ascending: false }),
        supabase
          .from("contact_addresses")
          .select("id, designation, street, street2, street3, city, state, zip, country, is_primary")
          .eq("entity_type", "client")
          .eq("entity_id", clientId)
          .order("is_primary", { ascending: false }),
        supabase
          .from("contact_socials")
          .select("id, platform, url")
          .eq("entity_type", "client")
          .eq("entity_id", clientId),
        // Pull via the material_clients junction so joint-authored material shows on both clients
        supabase
          .from("material_clients")
          .select("material:client_materials!material_id(id, title, material_type, format, genre, sub_genre, status, updated_at)")
          .eq("client_id", clientId),
        supabase
          .from("client_credits")
          .select("id, project_id, project_name, level, credit_status, start_year, end_year, project:projects!project_id(id, name)")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false }),
        supabase
          .from("client_macros")
          .select("id, label, content, sort_order, updated_at")
          .eq("client_id", clientId)
          .order("sort_order"),
        supabase
          .from("profiles")
          .select("id, full_name")
          .order("full_name"),
        supabase
          .from("client_managers")
          .select("manager_id")
          .eq("client_id", clientId),
      ]);

      if (!client) {
        router.replace("/clients");
        return;
      }

      setForm({
        full_name: client.full_name,
        first_name: client.first_name,
        last_name: client.last_name,
        company_id: client.company_id,
        staff_level: client.staff_level,
        manager_ids: (clientManagersData || []).map((r) => r.manager_id as string),
        notes: client.notes,
      });

      setCompanies(companiesData || []);
      setProjects(projectsData || []);
      setManagers(managersData || []);

      const pList = (phonesData || []) as PhoneRecord[];
      const eList = (emailsData || []) as EmailRecord[];
      const aList = (addressesData || []).map((a) => ({ ...a, street: a.street || "", street2: a.street2 || "", street3: a.street3 || "", city: a.city || "", state: a.state || "", zip: a.zip || "", country: a.country || "" })) as AddressRecord[];
      const sList = (socialsData || []) as SocialRecord[];
      setPhones(pList);
      setEmails(eList);
      setAddresses(aList);
      setSocials(sList);
      setOrigPhoneIds(new Set(pList.filter((p) => p.id).map((p) => p.id!)));
      setOrigEmailIds(new Set(eList.filter((e) => e.id).map((e) => e.id!)));
      setOrigAddressIds(new Set(aList.filter((a) => a.id).map((a) => a.id!)));
      setOrigSocialIds(new Set(sList.filter((s) => s.id).map((s) => s.id!)));

      const mList = (macrosData || []).map((m) => ({ id: m.id, label: m.label || "", content: m.content || "", sort_order: m.sort_order ?? 0, updated_at: m.updated_at || null }));
      setMacros(mList);
      setOrigMacroIds(new Set(mList.filter((m) => m.id).map((m) => m.id!)));

      // materials is now an array of { material: {...} } from the junction join
      const materialList = ((materials || []) as unknown as { material: { id: string; title: string; material_type: string | null; format: string | null; genre: string | null; sub_genre: string | null; status: string; updated_at: string } | null }[])
        .map((row) => row.material)
        .filter((m): m is NonNullable<typeof m> => m !== null)
        .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
      setRelatedMaterials(materialList);

      // Credits
      const cList = (creditsData || []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        project_id: c.project_id as string | null,
        project_name: c.project_name as string || (c.project as { name: string } | null)?.name || "",
        level: (c.level as string) || "",
        credit_status: c.credit_status as string | null,
        start_year: c.start_year as number | null,
        end_year: c.end_year as number | null,
      }));
      setCredits(cList);
      setOrigCreditIds(new Set(cList.filter((c: CreditRow) => c.id).map((c: CreditRow) => c.id!)));

      setLoading(false);
    }
    load();
  }, [clientId]);

  // Lazy load meetings tab
  useEffect(() => {
    if (activeTab !== "meetings" || meetingsLoaded) return;
    async function loadMeetings() {
      // Get meeting_ids for this client
      const { data: clientMeetings } = await supabase
        .from("meeting_clients")
        .select("meeting_id")
        .eq("client_id", clientId);
      const meetingIds = (clientMeetings || []).map((m) => m.meeting_id);
      if (meetingIds.length === 0) { setMeetingsLoaded(true); return; }

      // Get meeting details, people, projects
      const [{ data: meetings }, { data: mPeople }, { data: mProjects }] = await Promise.all([
        supabase.from("meetings").select("id, title, meeting_at").in("id", meetingIds),
        supabase.from("meeting_people").select("meeting_id, person:people(id, full_name)").in("meeting_id", meetingIds),
        supabase.from("meeting_projects").select("meeting_id, project:projects(id, name)").in("meeting_id", meetingIds),
      ]);

      const meetingMap = new Map((meetings || []).map((m) => [m.id, m]));
      const projectMap = new Map<string, string>();
      for (const mp of mProjects || []) {
        const r = mp as unknown as { meeting_id: string; project: { id: string; name: string } | null };
        if (r.project) projectMap.set(r.meeting_id, r.project.name);
      }

      const rows: MeetingTableRow[] = [];
      for (const mp of mPeople || []) {
        const r = mp as unknown as { meeting_id: string; person: { id: string; full_name: string } | null };
        const meeting = meetingMap.get(r.meeting_id);
        if (!meeting) continue;
        rows.push({
          meeting_id: r.meeting_id,
          person_name: r.person?.full_name || "Unknown",
          person_id: r.person?.id || null,
          date: meeting.meeting_at,
          project_name: projectMap.get(r.meeting_id) || null,
        });
      }
      // Also add meetings that have no people
      for (const m of meetings || []) {
        const hasPerson = rows.some((r) => r.meeting_id === m.id);
        if (!hasPerson) {
          rows.push({
            meeting_id: m.id,
            person_name: "\u2014",
            person_id: null,
            date: m.meeting_at,
            project_name: projectMap.get(m.id) || null,
          });
        }
      }
      rows.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setMeetingRows(rows);
      setMeetingsLoaded(true);
    }
    loadMeetings();
  }, [activeTab, meetingsLoaded, clientId, supabase]);

  // Lazy load submissions tab
  useEffect(() => {
    if (activeTab !== "submissions" || submissionsLoaded) return;
    async function loadSubmissions() {
      // Query submission_items where client_id = this client
      const { data: items } = await supabase
        .from("submission_items")
        .select("id, submission_id, response, person:people!person_id(id, full_name, company:companies!company_id(name)), material:client_materials!material_id(title), submission:submissions!submission_id(submission_date)")
        .eq("client_id", clientId);

      if (!items || items.length === 0) { setSubmissionsLoaded(true); return; }

      // Get projects per submission_item from submission_item_projects
      const itemIds = items.map((i) => i.id);
      const { data: itemProjects } = await supabase
        .from("submission_item_projects")
        .select("submission_item_id, project:projects!project_id(name)")
        .in("submission_item_id", itemIds);
      const projectMap = new Map<string, string>();
      for (const ip of itemProjects || []) {
        const r = ip as unknown as { submission_item_id: string; project: { name: string } | null };
        if (r.project) projectMap.set(r.submission_item_id, r.project.name);
      }

      const rows: SubmissionTableRow[] = items.map((item) => {
        const person = (item as Record<string, unknown>).person as { id: string; full_name: string; company: { name: string } | null } | null;
        return {
          submission_id: item.submission_id,
          person_name: person?.full_name || "\u2014",
          person_id: person?.id || null,
          company_name: person?.company?.name || null,
          project_name: projectMap.get(item.id) || null,
          response: item.response,
        };
      });
      setSubmissionRows(rows);
      setSubmissionsLoaded(true);
    }
    loadSubmissions();
  }, [activeTab, submissionsLoaded, clientId, supabase]);

  // Lazy load calls tab
  useEffect(() => {
    if (activeTab !== "calls" || callsLoaded) return;
    async function loadCalls() {
      const { data: calls } = await supabase
        .from("calls")
        .select("id, due_date, call_status, contact:people!contact_id(full_name)")
        .eq("client_id", clientId)
        .order("due_date", { ascending: false });

      const rows: CallTableRow[] = (calls || []).map((c: Record<string, unknown>) => {
        const contact = c.contact as { full_name: string } | null;
        return {
          id: c.id as string,
          due_date: c.due_date as string | null,
          call_status: c.call_status as string,
          contact_name: contact?.full_name || null,
        };
      });
      setCallRows(rows);
      setCallsLoaded(true);
    }
    loadCalls();
  }, [activeTab, callsLoaded, clientId, supabase]);

  // Grid loading
  useEffect(() => {
    if (activeTab !== "grid" || gridLoaded) return;
    setGridLoading(true);
    async function loadGrid() {
      const { data: clientMeetings } = await supabase
        .from("meeting_clients")
        .select("meeting_id, meeting:meetings(meeting_at)")
        .eq("client_id", clientId);

      const meetingIds = (clientMeetings || []).map((m) => m.meeting_id);
      const meetingDateMap = new Map<string, string | null>();
      for (const cm of clientMeetings || []) {
        const r = cm as unknown as { meeting_id: string; meeting: { meeting_at: string | null } | null };
        meetingDateMap.set(r.meeting_id, r.meeting?.meeting_at || null);
      }

      let metMap: Record<string, { count: number; lastDate: string | null; full_name: string; company: string | null; buyer_type: string | null }> = {};
      if (meetingIds.length > 0) {
        const { data: meetingPeople } = await supabase
          .from("meeting_people")
          .select("person_id, meeting_id, person:people(full_name, company:companies!company_id(name, buyer_type))")
          .in("meeting_id", meetingIds);
        for (const row of meetingPeople || []) {
          const r = row as unknown as { person_id: string; meeting_id: string; person: { full_name: string; company: { name: string; buyer_type: string | null } | null } | null };
          if (!r.person) continue;
          if (!metMap[r.person_id]) {
            metMap[r.person_id] = { count: 0, lastDate: null, full_name: r.person.full_name, company: r.person.company?.name || null, buyer_type: r.person.company?.buyer_type || null };
          }
          metMap[r.person_id].count++;
          const meetDate = meetingDateMap.get(r.meeting_id) || null;
          if (meetDate && (!metMap[r.person_id].lastDate || meetDate > metMap[r.person_id].lastDate!)) {
            metMap[r.person_id].lastDate = meetDate;
          }
        }
      }

      const { data: allBuyers } = await supabase
        .from("people")
        .select("id, full_name, title, company:companies!company_id!inner(name, buyer_type)")
        .not("company.buyer_type", "is", null)
        .order("full_name");

      const metIds = new Set(Object.keys(metMap));
      const met = Object.entries(metMap).map(([id, data]) => ({
        id,
        full_name: data.full_name,
        company: data.company,
        buyer_type: data.buyer_type,
        meetingCount: data.count,
        lastMeeting: data.lastDate,
      })).sort((a, b) => a.full_name.localeCompare(b.full_name));

      const notMet = (allBuyers || [])
        .filter((b) => !metIds.has(b.id))
        .map((b) => {
          const bb = b as unknown as { id: string; full_name: string; title: string | null; company: { name: string; buyer_type: string | null } | null };
          return { id: bb.id, full_name: bb.full_name, company_name: bb.company?.name || null, title: bb.title, buyer_type: bb.company?.buyer_type || null };
        });

      setGridMetWith(met);
      setGridNotMet(notMet);
      setGridLoading(false);
      setGridLoaded(true);
    }
    loadGrid();
  }, [activeTab, gridLoaded, clientId, supabase]);

  async function loadPersonDetail(personId: string) {
    setSelectedNotMet(personId);
    setSelectedPersonDetail(null);
    // Find submission_items where this person AND this client overlap
    const { data: items } = await supabase
      .from("submission_items")
      .select("id, response, material:client_materials!material_id(id, title), submission:submissions!submission_id(submission_date)")
      .eq("client_id", clientId)
      .eq("person_id", personId);

    if (items && items.length > 0) {
      const matIds = new Set<string>();
      const materials: { title: string; date: string | null; response: string | null }[] = [];
      for (const item of items) {
        const mat = (item as Record<string, unknown>).material as { id: string; title: string } | null;
        const sub = (item as Record<string, unknown>).submission as { submission_date: string | null } | null;
        if (mat && !matIds.has(mat.id)) {
          matIds.add(mat.id);
          materials.push({ title: mat.title, date: sub?.submission_date || null, response: item.response || null });
        }
      }
      setSelectedPersonDetail({ materials });
    } else {
      setSelectedPersonDetail({ materials: [] });
    }
  }

  const companyOptions: RelationOption[] = useMemo(
    () => companies.map((c) => ({ id: c.id, label: c.name })),
    [companies]
  );

  const projectOptions: RelationOption[] = useMemo(
    () => projects.map((p) => ({ id: p.id, label: p.name })),
    [projects]
  );

  // Credits helpers
  function addCreditRow() {
    setCredits((prev) => [...prev, { project_id: null, project_name: "", level: "", credit_status: null, start_year: null, end_year: null }]);
  }

  function updateCredit(index: number, field: keyof CreditRow, value: unknown) {
    setCredits((prev) => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  }

  function deleteCreditRow(index: number) {
    setCredits((prev) => {
      const row = prev[index];
      if (row.id) {
        return prev.map((c, i) => i === index ? { ...c, _deleted: true } : c);
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  async function saveCredits() {
    setCreditsSaving(true);
    try {
      const toDelete = credits.filter((c) => c._deleted && c.id);
      const toUpdate = credits.filter((c) => !c._deleted && c.id);
      const toInsert = credits.filter((c) => !c._deleted && !c.id);

      if (toDelete.length > 0) {
        await supabase.from("client_credits").delete().in("id", toDelete.map((c) => c.id!));
      }

      for (const c of toUpdate) {
        await supabase.from("client_credits").update({
          project_id: c.project_id,
          project_name: c.project_name || (projects.find((p) => p.id === c.project_id)?.name || ""),
          level: c.level || null,
          credit_status: c.credit_status,
          start_year: c.start_year,
          end_year: c.end_year,
        }).eq("id", c.id!);
      }

      for (const c of toInsert) {
        await supabase.from("client_credits").insert({
          client_id: clientId,
          project_id: c.project_id,
          project_name: c.project_name || (projects.find((p) => p.id === c.project_id)?.name || "Untitled"),
          level: c.level || null,
          credit_status: c.credit_status,
          start_year: c.start_year,
          end_year: c.end_year,
        });
      }

      // Reload credits
      const { data: creditsData } = await supabase
        .from("client_credits")
        .select("id, project_id, project_name, level, credit_status, start_year, end_year, project:projects!project_id(id, name)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      const cList = (creditsData || []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        project_id: c.project_id as string | null,
        project_name: c.project_name as string || (c.project as { name: string } | null)?.name || "",
        level: (c.level as string) || "",
        credit_status: c.credit_status as string | null,
        start_year: c.start_year as number | null,
        end_year: c.end_year as number | null,
      }));
      setCredits(cList);
      setOrigCreditIds(new Set(cList.filter((c: CreditRow) => c.id).map((c: CreditRow) => c.id!)));
    } finally {
      setCreditsSaving(false);
    }
  }

  type ClientAutoSaveSnapshot = {
    form: typeof emptyForm;
    phones: PhoneRecord[];
    emails: EmailRecord[];
    addresses: AddressRecord[];
    socials: SocialRecord[];
    macros: typeof macros;
  };

  const autoSaveState: ClientAutoSaveSnapshot = useMemo(
    () => ({ form, phones, emails, addresses, socials, macros }),
    [form, phones, emails, addresses, socials, macros]
  );

  const autoSaveRestore = useCallback((snap: unknown) => {
    const s = snap as Partial<ClientAutoSaveSnapshot> & Record<string, unknown>;
    if (s && typeof s === "object" && "form" in s && s.form) {
      setForm(s.form as typeof emptyForm);
      if (s.phones) setPhones(s.phones as PhoneRecord[]);
      if (s.emails) setEmails(s.emails as EmailRecord[]);
      if (s.addresses) setAddresses(s.addresses as AddressRecord[]);
      if (s.socials) setSocials(s.socials as SocialRecord[]);
      if (s.macros) setMacros(s.macros as typeof macros);
    } else if (s && typeof s === "object") {
      const row = s as Record<string, unknown>;
      setForm({
        full_name: (row.full_name as string) ?? "",
        first_name: (row.first_name as string | null) ?? null,
        last_name: (row.last_name as string | null) ?? null,
        company_id: (row.company_id as string | null) ?? null,
        staff_level: (row.staff_level as string | null) ?? null,
        manager_ids: (row.manager_ids as string[]) ?? [],
        notes: (row.notes as string | null) ?? null,
      });
    }
  }, []);

  const autoSave = useAutoSave<ClientAutoSaveSnapshot>({
    recordId: clientId,
    tableName: "clients",
    state: autoSaveState,
    restore: autoSaveRestore,
    enabled: !loading,
    save: async (snap) => {
      const { manager_ids, ...clientPayload } = snap.form;
      await supabase.from("clients").update(clientPayload).eq("id", clientId);

      // Sync client_managers join table
      const { data: existing } = await supabase
        .from("client_managers")
        .select("manager_id")
        .eq("client_id", clientId);
      const existingIds = new Set((existing || []).map((r) => r.manager_id as string));
      const desiredIds = new Set(manager_ids);
      const toAdd = [...desiredIds].filter((id) => !existingIds.has(id));
      const toRemove = [...existingIds].filter((id) => !desiredIds.has(id));
      if (toAdd.length > 0) {
        await supabase
          .from("client_managers")
          .insert(toAdd.map((id) => ({ client_id: clientId, manager_id: id })));
      }
      if (toRemove.length > 0) {
        await supabase
          .from("client_managers")
          .delete()
          .eq("client_id", clientId)
          .in("manager_id", toRemove);
      }
      await Promise.all([
        syncPhones("client", clientId, snap.phones, origPhoneIds),
        syncEmails("client", clientId, snap.emails, origEmailIds),
        syncAddresses("client", clientId, snap.addresses, origAddressIds),
        syncSocials("client", clientId, snap.socials, origSocialIds),
      ]);
      setOrigPhoneIds(new Set(snap.phones.filter((p) => p.id).map((p) => p.id!)));
      setOrigEmailIds(new Set(snap.emails.filter((e) => e.id).map((e) => e.id!)));
      setOrigAddressIds(new Set(snap.addresses.filter((a) => a.id).map((a) => a.id!)));
      setOrigSocialIds(new Set(snap.socials.filter((s) => s.id).map((s) => s.id!)));

      // Sync macros (delete removed, upsert kept/new)
      const currentIds = new Set(snap.macros.filter((m) => m.id).map((m) => m.id!));
      const toDelete = [...origMacroIds].filter((id) => !currentIds.has(id));
      if (toDelete.length > 0) {
        await supabase.from("client_macros").delete().in("id", toDelete);
      }
      const updatedMacros = [...snap.macros];
      for (let i = 0; i < updatedMacros.length; i++) {
        const m = updatedMacros[i];
        const payload = {
          label: m.label || null,
          content: m.content,
          sort_order: i,
        };
        if (m.id) {
          const { data } = await supabase
            .from("client_macros")
            .update(payload)
            .eq("id", m.id)
            .select("id, updated_at")
            .single();
          if (data) updatedMacros[i] = { ...m, updated_at: data.updated_at };
        } else {
          const { data } = await supabase
            .from("client_macros")
            .insert({ ...payload, client_id: clientId })
            .select("id, updated_at")
            .single();
          if (data) updatedMacros[i] = { ...m, id: data.id, updated_at: data.updated_at };
        }
      }
      setMacros(updatedMacros);
      setOrigMacroIds(new Set(updatedMacros.filter((m) => m.id).map((m) => m.id!)));
    },
  });

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this client?")) return;
    setDeleting(true);
    try {
      await supabase.from("clients").delete().eq("id", clientId);
      router.push("/clients");
    } finally {
      setDeleting(false);
    }
  }, [clientId, supabase, router]);

  const tabs = [
    { id: "info", label: "Info" },
    { id: "grid", label: "Grid" },
    { id: "meetings", label: "Meetings" },
    { id: "submissions", label: "Submissions" },
    { id: "materials", label: "Client Material" },
    { id: "credits", label: "Credits" },
    { id: "calls", label: "Calls" },
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
      <Breadcrumb fallbackHref="/clients" fallbackLabel="Clients" currentLabel={form.full_name || "Untitled"} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-black">
          {form.full_name || "Untitled Client"}
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
      <div className="mb-6 flex gap-1 border-b border-zinc-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
          <div className="grid grid-cols-2 gap-4">
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
          <Field label="Company / Loan Out">
            <RelationPicker
              value={form.company_id}
              onChange={(id) => setForm({ ...form, company_id: id })}
              options={companyOptions}
              placeholder="Select company..."
            />
          </Field>
          <Field label="Staff Level">
            <Input
              value={form.staff_level || ""}
              onChange={(e) => setForm({ ...form, staff_level: e.target.value || null })}
              placeholder="Staff level"
            />
          </Field>

          <Field label="Manager">
            <MultiRelationPicker
              value={form.manager_ids}
              onChange={(ids) => setForm({ ...form, manager_ids: ids })}
              options={managers.map((m) => ({ id: m.id, label: m.full_name || "(unnamed)" }))}
              placeholder="Select managers..."
            />
          </Field>

          <PhoneSection phones={phones} onChange={setPhones} />
          <EmailSection emails={emails} onChange={setEmails} />
          <AddressSection addresses={addresses} onChange={setAddresses} />
          <SocialSection socials={socials} onChange={setSocials} />

          <MacrosSection
            macros={macros}
            onChange={setMacros}
          />

          <Field label="Notes">
            <Textarea
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
              placeholder="Notes..."
            />
          </Field>
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
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-black">{form.full_name}</h3>
                    {form.staff_level && <p className="text-sm text-zinc-600">{form.staff_level}</p>}
                    <p className="text-sm text-zinc-500">{companies.find((c) => c.id === form.company_id)?.name || "No company"}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Met With */}
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-4">
                  <h4 className="text-sm font-semibold text-emerald-800 mb-3">
                    Met With <span className="font-normal text-emerald-600">({gridMetWith.length})</span>
                  </h4>
                  {gridMetWith.length === 0 ? (
                    <p className="text-xs text-emerald-600/60">No meetings with any buyers yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {gridMetWith.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-xs">
                          <div>
                            <span className="font-medium text-emerald-900">{p.full_name}</span>
                            {p.company && <span className="ml-1 text-emerald-600">({p.company})</span>}
                          </div>
                          <span className="text-emerald-600">
                            {p.meetingCount} meeting{p.meetingCount !== 1 ? "s" : ""}
                            {p.lastMeeting && ` \u00b7 ${new Date(p.lastMeeting).toLocaleDateString()}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Not Yet Met */}
                <div className="rounded-lg border border-zinc-200 bg-zinc-50/30 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-zinc-700">
                      Not Yet Met <span className="font-normal text-zinc-500">({gridBuyerFilter ? gridNotMet.filter((p) => p.buyer_type === gridBuyerFilter).length : gridNotMet.length})</span>
                    </h4>
                    <select
                      value={gridBuyerFilter}
                      onChange={(e) => { setGridBuyerFilter(e.target.value); setSelectedNotMet(null); setSelectedPersonDetail(null); }}
                      className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-600"
                    >
                      <option value="">All</option>
                      <option value="Pod">Pod</option>
                      <option value="Studio">Studio</option>
                      <option value="Network">Network</option>
                      <option value="Streamer">Streamer</option>
                      <option value="Production Company">Production Company</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  {gridNotMet.length === 0 ? (
                    <p className="text-xs text-zinc-400">Met with all buyers!</p>
                  ) : (
                    <div className="space-y-1">
                      {gridNotMet
                        .filter((p) => !gridBuyerFilter || p.buyer_type === gridBuyerFilter)
                        .map((p) => (
                        <div key={p.id}>
                          <button
                            onClick={() => selectedNotMet === p.id ? (setSelectedNotMet(null), setSelectedPersonDetail(null)) : loadPersonDetail(p.id)}
                            className={`w-full text-left text-xs px-2 py-1 rounded transition-colors ${selectedNotMet === p.id ? "bg-zinc-100 text-black" : "text-zinc-600 hover:bg-zinc-50"}`}
                          >
                            <span className="font-medium">{p.full_name}</span>
                            {p.company_name && <span className="ml-1 text-zinc-400">({p.company_name})</span>}
                            {p.buyer_type && <span className="ml-1 text-zinc-400">\u00b7 {p.buyer_type}</span>}
                          </button>
                          {selectedNotMet === p.id && (
                            <div className="ml-2 mt-1 mb-2 pl-2 border-l-2 border-zinc-200">
                              {!selectedPersonDetail ? (
                                <p className="text-[10px] text-zinc-400">Loading...</p>
                              ) : selectedPersonDetail.materials.length === 0 ? (
                                <p className="text-[10px] text-zinc-400">No shared submissions.</p>
                              ) : (
                                <div className="space-y-1">
                                  {selectedPersonDetail.materials.map((mat, i) => (
                                    <div key={i} className="text-[11px] flex items-center justify-between">
                                      <span className="text-zinc-700">{mat.title}</span>
                                      <div className="flex items-center gap-2">
                                        {mat.date && <span className="text-zinc-400">{new Date(mat.date).toLocaleDateString()}</span>}
                                        {mat.response ? (
                                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                            mat.response === "love" ? "bg-emerald-100 text-emerald-700" :
                                            mat.response === "like" ? "bg-blue-100 text-blue-700" :
                                            mat.response === "meh" ? "bg-amber-100 text-amber-700" :
                                            "bg-red-100 text-red-700"
                                          }`}>
                                            {mat.response.charAt(0).toUpperCase() + mat.response.slice(1)}
                                          </span>
                                        ) : (
                                          <span className="text-[10px] text-zinc-400">No response</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Meetings Tab - TABLE */}
      {activeTab === "meetings" && (
        <div>
          {!meetingsLoaded ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          ) : meetingRows.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">No meetings yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/50">
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Person</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Date</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Project</th>
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-zinc-500 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {meetingRows.map((row, i) => (
                    <tr key={`${row.meeting_id}-${i}`} className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50/50 transition-colors">
                      <td className="px-3 py-2.5">
                        {row.person_id ? (
                          <Link href={`/contacts/${row.person_id}?${buildFromParams(`/clients/${clientId}`, form.full_name)}`} className="font-medium text-black hover:underline">
                            {row.person_name}
                          </Link>
                        ) : (
                          <span className="text-zinc-500">{row.person_name}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-600">
                        {row.date ? new Date(row.date).toLocaleDateString() : "\u2014"}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-600">{row.project_name || "\u2014"}</td>
                      <td className="px-3 py-2.5 text-center">
                        <Link href={`/meetings/${row.meeting_id}?${buildFromParams(`/clients/${clientId}`, form.full_name)}`} className="inline-flex text-zinc-400 hover:text-black transition-colors">
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

      {/* Submissions Tab - TABLE */}
      {activeTab === "submissions" && (
        <div>
          {!submissionsLoaded ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          ) : submissionRows.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">No submissions yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/50">
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Person</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Company</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Project</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Response</th>
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-zinc-500 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {submissionRows.map((row, i) => (
                    <tr key={`${row.submission_id}-${i}`} className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50/50 transition-colors">
                      <td className="px-3 py-2.5">
                        {row.person_id ? (
                          <Link href={`/contacts/${row.person_id}?${buildFromParams(`/clients/${clientId}`, form.full_name)}`} className="font-medium text-black hover:underline">
                            {row.person_name}
                          </Link>
                        ) : (
                          <span className="text-zinc-500">{row.person_name}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-600">{row.company_name || "\u2014"}</td>
                      <td className="px-3 py-2.5 text-zinc-600">{row.project_name || "\u2014"}</td>
                      <td className="px-3 py-2.5">
                        {row.response ? (
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                            row.response === "love" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            row.response === "like" ? "bg-blue-50 text-blue-700 border-blue-200" :
                            row.response === "meh" ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-red-50 text-red-700 border-red-200"
                          }`}>
                            {row.response.charAt(0).toUpperCase() + row.response.slice(1)}
                          </span>
                        ) : (
                          <span className="text-zinc-400">\u2014</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Link href={`/submissions/${row.submission_id}?${buildFromParams(`/clients/${clientId}`, form.full_name)}`} className="inline-flex text-zinc-400 hover:text-black transition-colors">
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

      {/* Client Material Tab */}
      {activeTab === "materials" && (
        <div>
          {relatedMaterials.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">No materials yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/50">
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">Title</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">Type</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">Format</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">Genre</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">Sub-genre</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {relatedMaterials.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => router.push(`/materials/${m.id}`)}
                      className="cursor-pointer border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50/50 transition-colors"
                    >
                      <td className="px-3 py-2.5 font-medium text-black whitespace-nowrap">{m.title}</td>
                      <td className="px-3 py-2.5 text-zinc-600 whitespace-nowrap">{m.material_type ? m.material_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "\u2014"}</td>
                      <td className="px-3 py-2.5 text-zinc-600 whitespace-nowrap">{m.format || "\u2014"}</td>
                      <td className="px-3 py-2.5 text-zinc-600 whitespace-nowrap">{m.genre || "\u2014"}</td>
                      <td className="px-3 py-2.5 text-zinc-600 whitespace-nowrap">{m.sub_genre || "\u2014"}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Credits Tab */}
      {activeTab === "credits" && (
        <div>
          <div className="overflow-x-auto rounded-lg border border-zinc-200">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/50">
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Project</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Staff Level</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Status</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Start Year</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">End Year</th>
                  <th className="px-3 py-2.5 text-center text-xs font-medium text-zinc-500 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {credits.filter((c) => !c._deleted).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-zinc-400">
                      No credits yet.
                    </td>
                  </tr>
                ) : (
                  credits.map((credit, index) =>
                    credit._deleted ? null : (
                      <tr key={credit.id || `new-${index}`} className="border-b border-zinc-100 last:border-b-0">
                        <td className="px-2 py-1.5">
                          <RelationPicker
                            value={credit.project_id}
                            onChange={(id) => {
                              const proj = projects.find((p) => p.id === id);
                              updateCredit(index, "project_id", id);
                              if (proj) updateCredit(index, "project_name", proj.name);
                            }}
                            options={projectOptions}
                            placeholder="Select project..."
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            value={credit.level}
                            onChange={(e) => updateCredit(index, "level", e.target.value)}
                            placeholder="Staff level"
                            className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-sm outline-none placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-400 transition-colors"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            value={credit.credit_status || ""}
                            onChange={(e) => updateCredit(index, "credit_status", e.target.value || null)}
                            className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-sm outline-none hover:border-zinc-300 focus:border-zinc-400 transition-colors"
                          >
                            <option value="">--</option>
                            {creditStatusOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            value={credit.start_year ?? ""}
                            onChange={(e) => updateCredit(index, "start_year", e.target.value ? parseInt(e.target.value) : null)}
                            placeholder="YYYY"
                            className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-sm outline-none placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-400 transition-colors"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            value={credit.end_year ?? ""}
                            onChange={(e) => updateCredit(index, "end_year", e.target.value ? parseInt(e.target.value) : null)}
                            placeholder="YYYY"
                            className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-sm outline-none placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-400 transition-colors"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <button
                            onClick={() => deleteCreditRow(index)}
                            className="text-zinc-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={addCreditRow}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
            <button
              onClick={saveCredits}
              disabled={creditsSaving}
              className="rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {creditsSaving ? "Saving..." : "Save Credits"}
            </button>
          </div>
        </div>
      )}

      {/* Calls Tab - TABLE */}
      {activeTab === "calls" && (
        <div>
          {!callsLoaded ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          ) : callRows.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">No calls yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/50">
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Date / Time</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Status</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Contact</th>
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-zinc-500 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {callRows.map((c) => (
                    <tr key={c.id} className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50/50 transition-colors">
                      <td className="px-3 py-2.5 text-zinc-700">
                        {c.due_date ? new Date(c.due_date).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "\u2014"}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={c.call_status} />
                      </td>
                      <td className="px-3 py-2.5 text-zinc-600">{c.contact_name || "\u2014"}</td>
                      <td className="px-3 py-2.5 text-center">
                        <Link href={`/calls?open=${c.id}`} className="inline-flex text-zinc-400 hover:text-black transition-colors">
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

      {/* Danger Zone */}
      <div className="mt-12 border-t border-zinc-200 pt-6">
        <p className="text-xs text-zinc-400 mb-3">Danger Zone</p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete this client"}
        </button>
      </div>

    </div>
  );
}

// ─── Macros Section ──────────────────────────────────

interface MacroRow {
  id?: string;
  label: string;
  content: string;
  sort_order: number;
  updated_at?: string | null;
}

function MacrosSection({
  macros,
  onChange,
}: {
  macros: MacroRow[];
  onChange: (macros: MacroRow[]) => void;
}) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  function update(index: number, patch: Partial<MacroRow>) {
    onChange(macros.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  }

  function remove(index: number) {
    onChange(macros.filter((_, i) => i !== index));
  }

  function add() {
    onChange([
      ...macros,
      { label: "", content: "", sort_order: macros.length },
    ]);
  }

  async function copyMacro(idx: number, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((current) => (current === idx ? null : current)), 1500);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  }

  function formatTimestamp(iso: string | null | undefined) {
    if (!iso) return "Not saved yet";
    const d = new Date(iso);
    return `Last updated ${d.toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}`;
  }

  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
        Macros
      </p>
      <div className="space-y-3">
        {macros.map((macro, i) => (
          <div key={macro.id || `new-${i}`} className="group rounded-md border border-zinc-200 bg-white p-2">
            <div className="flex items-center gap-2 mb-1.5">
              <input
                value={macro.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder="Label (optional)"
                className="flex-1 bg-transparent text-xs font-medium text-zinc-600 outline-none placeholder:text-zinc-300"
              />
              <button
                type="button"
                onClick={() => copyMacro(i, macro.content)}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-black transition-colors"
                title="Copy to clipboard"
                disabled={!macro.content}
              >
                {copiedIdx === i ? (
                  <>
                    <CheckIcon className="h-3 w-3 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete macro"
              >
                <Trash2 className="h-3.5 w-3.5 text-zinc-400 hover:text-red-500 transition-colors" />
              </button>
            </div>
            <textarea
              value={macro.content}
              onChange={(e) => update(i, { content: e.target.value })}
              placeholder="Snippet text..."
              rows={3}
              className="w-full resize-y rounded border border-zinc-100 bg-zinc-50/50 px-2 py-1.5 text-sm text-zinc-800 outline-none focus:border-zinc-300 placeholder:text-zinc-300"
            />
            <p className="mt-1 text-[10px] text-zinc-400">
              {formatTimestamp(macro.updated_at)}
            </p>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-1 inline-flex items-center gap-1 px-1.5 py-1 text-xs text-zinc-400 hover:text-black transition-colors"
      >
        <Plus className="h-3 w-3" />
        Add Macro
      </button>
    </div>
  );
}

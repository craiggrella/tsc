"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ExternalLink } from "lucide-react";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { createClient } from "@/lib/supabase/client";
import { formatPhone } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  RelationPicker,
  type RelationOption,
} from "@/components/shared/relation-picker";
import { Field, Input, Select, Textarea } from "@/components/shared/detail-panel";
import { PicklistSelect } from "@/components/shared/picklist-select";
import { MailIconButton } from "@/components/shared/email-link";
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
import { toPersonName } from "@/lib/format-name";
import { useAutoSave } from "@/hooks/use-auto-save";
import { SavedIndicator } from "@/components/shared/saved-indicator";

interface CompanyData {
  id: string;
  name: string;
  buyer_type?: string | null;
}

const emptyForm = {
  full_name: "",
  first_name: null as string | null,
  last_name: null as string | null,
  title: null as string | null,
  type: null as string | null,
  exec_level: null as string | null,
  company_id: null as string | null,
  department: [] as string[],
  assistant_id: null as string | null,
  notes: null as string | null,
};

interface ContactDetailProps {
  contactId: string;
  userId: string;
}

export function ContactDetail({ contactId, userId }: ContactDetailProps) {
  const supabase = createClient();
  const router = useRouter();
  const personTypesItems = usePicklist("list_contact_types");
  const PERSON_TYPES = toSelectOptions(personTypesItems);
  const execLevelsItems = usePicklist("list_contact_levels");
  const EXEC_LEVELS = toSelectOptions(execLevelsItems);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [companyBuyerType, setCompanyBuyerType] = useState<string | null>(null);
  const [contactPeople, setContactPeople] = useState<{ id: string; full_name: string }[]>([]);

  // Sub-records
  const [phones, setPhones] = useState<PhoneRecord[]>([]);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [addresses, setAddresses] = useState<AddressRecord[]>([]);
  const [socials, setSocials] = useState<SocialRecord[]>([]);
  const [origPhoneIds, setOrigPhoneIds] = useState<Set<string>>(new Set());
  const [origEmailIds, setOrigEmailIds] = useState<Set<string>>(new Set());
  const [origAddressIds, setOrigAddressIds] = useState<Set<string>>(new Set());
  const [origSocialIds, setOrigSocialIds] = useState<Set<string>>(new Set());

  // Related records
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
  const [relatedMaterials, setRelatedMaterials] = useState<
    { id: string; title: string; material_type: string | null; response: string | null }[]
  >([]);

  // Grid tab state
  const [gridMetWith, setGridMetWith] = useState<{ id: string; full_name: string; meetingCount: number; lastMeeting: string | null }[]>([]);
  const [gridNotMet, setGridNotMet] = useState<{ id: string; full_name: string }[]>([]);
  const [gridMaterials, setGridMaterials] = useState<{ id: string; title: string; client_name: string | null; response: string | null }[]>([]);
  const [gridLoading, setGridLoading] = useState(false);
  const [gridLoaded, setGridLoaded] = useState(false);
  const [assistantInfo, setAssistantInfo] = useState<{ phone: string | null; email: string | null } | null>(null);

  const loadAssistantInfo = useCallback(async (assistantId: string) => {
    const [{ data: phoneData }, { data: emailData }] = await Promise.all([
      supabase
        .from("contact_phones")
        .select("number")
        .eq("entity_type", "person")
        .eq("entity_id", assistantId)
        .order("is_primary", { ascending: false })
        .limit(1),
      supabase
        .from("contact_emails")
        .select("address")
        .eq("entity_type", "person")
        .eq("entity_id", assistantId)
        .order("is_primary", { ascending: false })
        .limit(1),
    ]);
    setAssistantInfo({
      phone: phoneData?.[0]?.number || null,
      email: emailData?.[0]?.address || null,
    });
  }, [supabase]);

  useEffect(() => {
    async function load() {
      const [
        { data: contact },
        { data: companiesData },
        { data: peopleData },
        { data: phonesData },
        { data: emailsData },
        { data: addressesData },
        { data: socialsData },
        { data: meetings },
        { data: calls },
        { data: submissions },
      ] = await Promise.all([
        supabase
          .from("people")
          .select("*, company:companies!company_id(id, name, buyer_type)")
          .eq("id", contactId)
          .single(),
        supabase.from("companies").select("id, name, buyer_type").order("name"),
        supabase.from("people").select("id, full_name").order("full_name"),
        supabase
          .from("contact_phones")
          .select("id, designation, number, is_primary")
          .eq("entity_type", "person")
          .eq("entity_id", contactId)
          .order("is_primary", { ascending: false }),
        supabase
          .from("contact_emails")
          .select("id, designation, address, is_primary")
          .eq("entity_type", "person")
          .eq("entity_id", contactId)
          .order("is_primary", { ascending: false }),
        supabase
          .from("contact_addresses")
          .select("id, designation, street, street2, street3, city, state, zip, country, is_primary")
          .eq("entity_type", "person")
          .eq("entity_id", contactId)
          .order("is_primary", { ascending: false }),
        supabase
          .from("contact_socials")
          .select("id, platform, url")
          .eq("entity_type", "person")
          .eq("entity_id", contactId),
        supabase
          .from("meeting_people")
          .select("meeting:meetings(id, title, meeting_status, meeting_at)")
          .eq("person_id", contactId),
        supabase
          .from("calls")
          .select("id, about, call_status, due_date")
          .eq("contact_id", contactId)
          .order("due_date", { ascending: false })
          .range(0, 20),
        supabase
          .from("submission_items")
          .select("id, submission_id, submission:submissions!submission_id(id, description, status)")
          .eq("person_id", contactId),
      ]);

      if (!contact) {
        router.replace("/contacts");
        return;
      }

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
      setCompanyBuyerType((contact as { company?: { buyer_type?: string | null } | null }).company?.buyer_type || null);

      setCompanies(companiesData || []);
      setContactPeople(peopleData || []);

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

      // Fetch materials from submission_items for this person
      const itemsWithMaterials = (submissions || []).filter((s: Record<string, unknown>) => s.submission);
      if (itemsWithMaterials.length > 0) {
        // submission_items already fetched above; now get materials for this person's items
        const { data: personItems } = await supabase
          .from("submission_items")
          .select("id, response, material:client_materials!material_id(id, title, material_type)")
          .eq("person_id", contactId)
          .not("material_id", "is", null);
        const seen = new Set<string>();
        const uniqueMats: { id: string; title: string; material_type: string | null; response: string | null }[] = [];
        for (const item of personItems || []) {
          const mat = (item as Record<string, unknown>).material as { id: string; title: string; material_type: string | null } | null;
          if (mat && !seen.has(mat.id)) {
            seen.add(mat.id);
            uniqueMats.push({ ...mat, response: item.response || null });
          }
        }
        setRelatedMaterials(uniqueMats);
      } else {
        setRelatedMaterials([]);
      }

      // Load assistant info if set
      if (contact.assistant_id) {
        loadAssistantInfo(contact.assistant_id);
      }

      setLoading(false);
    }
    load();
  }, [contactId]);

  const companyOptions: RelationOption[] = useMemo(
    () => companies.map((c) => ({ id: c.id, label: c.name })),
    [companies]
  );

  const assistantOptions: RelationOption[] = useMemo(
    () => contactPeople.filter((p) => p.id !== contactId).map((p) => ({ id: p.id, label: p.full_name })),
    [contactPeople, contactId]
  );

  // Load grid data when tab is selected
  useEffect(() => {
    if (activeTab !== "grid" || gridLoaded || !companyBuyerType) return;
    setGridLoading(true);
    async function loadGrid() {
      // Get all clients
      const { data: allClients } = await supabase.from("clients").select("id, full_name").order("full_name");

      // Get meeting IDs this person attended
      const { data: personMeetings } = await supabase.from("meeting_people").select("meeting_id").eq("person_id", contactId);
      const meetingIds = (personMeetings || []).map((m) => m.meeting_id);

      // Get clients on those meetings
      let metClientMap: Record<string, { count: number; lastDate: string | null }> = {};
      if (meetingIds.length > 0) {
        const { data: meetingClients } = await supabase
          .from("meeting_clients")
          .select("client_id, meeting:meetings(meeting_at)")
          .in("meeting_id", meetingIds);
        for (const row of meetingClients || []) {
          const r = row as unknown as { client_id: string; meeting: { meeting_at: string | null } | null };
          if (!metClientMap[r.client_id]) metClientMap[r.client_id] = { count: 0, lastDate: null };
          metClientMap[r.client_id].count++;
          if (r.meeting?.meeting_at && (!metClientMap[r.client_id].lastDate || r.meeting.meeting_at > metClientMap[r.client_id].lastDate!)) {
            metClientMap[r.client_id].lastDate = r.meeting.meeting_at;
          }
        }
      }

      // Also check submissions via submission_items
      const { data: personSubItems } = await supabase.from("submission_items").select("client_id").eq("person_id", contactId).not("client_id", "is", null);
      for (const si of personSubItems || []) {
        if (si.client_id && !metClientMap[si.client_id]) metClientMap[si.client_id] = { count: 0, lastDate: null };
      }

      const clientMap = new Map((allClients || []).map((c) => [c.id, c.full_name]));
      const met = Object.entries(metClientMap).map(([id, data]) => ({
        id,
        full_name: clientMap.get(id) || "Unknown",
        meetingCount: data.count,
        lastMeeting: data.lastDate,
      })).sort((a, b) => a.full_name.localeCompare(b.full_name));

      const metIds = new Set(Object.keys(metClientMap));
      const notMet = (allClients || []).filter((c) => !metIds.has(c.id)).map((c) => ({ id: c.id, full_name: c.full_name }));

      setGridMetWith(met);
      setGridNotMet(notMet);

      // Materials read by this person via submission_items
      const { data: matItems } = await supabase
        .from("submission_items")
        .select("response, material:client_materials!material_id(id, title, client:clients!client_id(full_name))")
        .eq("person_id", contactId)
        .not("material_id", "is", null);
      if (matItems && matItems.length > 0) {
        const matIds = new Set<string>();
        const mats: typeof gridMaterials = [];
        for (const item of matItems) {
          const mat = (item as Record<string, unknown>).material as { id: string; title: string; client: { full_name: string } | null } | null;
          if (mat && !matIds.has(mat.id)) {
            matIds.add(mat.id);
            mats.push({ id: mat.id, title: mat.title, client_name: mat.client?.full_name || null, response: item.response || null });
          }
        }
        setGridMaterials(mats);
      }

      setGridLoading(false);
      setGridLoaded(true);
    }
    loadGrid();
  }, [activeTab, gridLoaded, companyBuyerType, contactId, supabase]);

  async function loadMoreCalls() {
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

  // Auto-save: any change to form/phones/emails/addresses/socials is debounced and persisted.
  type AutoSaveSnapshot = {
    form: typeof emptyForm;
    phones: PhoneRecord[];
    emails: EmailRecord[];
    addresses: AddressRecord[];
    socials: SocialRecord[];
  };

  const autoSaveState: AutoSaveSnapshot = useMemo(
    () => ({ form, phones, emails, addresses, socials }),
    [form, phones, emails, addresses, socials]
  );

  const autoSaveRestore = useCallback(
    (snap: unknown) => {
      const s = snap as Partial<AutoSaveSnapshot> & Record<string, unknown>;
      // In-memory snapshots have a `form` key; server snapshots are the raw people row.
      if (s && typeof s === "object" && "form" in s && s.form) {
        setForm(s.form as typeof emptyForm);
        if (s.phones) setPhones(s.phones as PhoneRecord[]);
        if (s.emails) setEmails(s.emails as EmailRecord[]);
        if (s.addresses) setAddresses(s.addresses as AddressRecord[]);
        if (s.socials) setSocials(s.socials as SocialRecord[]);
      } else if (s && typeof s === "object") {
        const row = s as Record<string, unknown>;
        setForm({
          full_name: (row.full_name as string) ?? "",
          first_name: (row.first_name as string | null) ?? null,
          last_name: (row.last_name as string | null) ?? null,
          title: (row.title as string | null) ?? null,
          type: (row.type as string | null) ?? null,
          exec_level: (row.exec_level as string | null) ?? null,
          company_id: (row.company_id as string | null) ?? null,
          department: (row.department as string[] | null) ?? [],
          assistant_id: (row.assistant_id as string | null) ?? null,
          notes: (row.notes as string | null) ?? null,
        });
      }
    },
    []
  );

  const autoSave = useAutoSave<AutoSaveSnapshot>({
    recordId: contactId,
    tableName: "people",
    state: autoSaveState,
    restore: autoSaveRestore,
    enabled: !loading,
    save: async (snap) => {
      const cleaned = {
        ...snap.form,
        first_name: snap.form.first_name ? toPersonName(snap.form.first_name) : snap.form.first_name,
        last_name: snap.form.last_name ? toPersonName(snap.form.last_name) : snap.form.last_name,
        full_name: snap.form.full_name ? toPersonName(snap.form.full_name) : snap.form.full_name,
      };
      await supabase.from("people").update(cleaned).eq("id", contactId);
      await Promise.all([
        syncPhones("person", contactId, snap.phones, origPhoneIds),
        syncEmails("person", contactId, snap.emails, origEmailIds),
        syncAddresses("person", contactId, snap.addresses, origAddressIds),
        syncSocials("person", contactId, snap.socials, origSocialIds),
      ]);
      setOrigPhoneIds(new Set(snap.phones.filter((p) => p.id).map((p) => p.id!)));
      setOrigEmailIds(new Set(snap.emails.filter((e) => e.id).map((e) => e.id!)));
      setOrigAddressIds(new Set(snap.addresses.filter((a) => a.id).map((a) => a.id!)));
      setOrigSocialIds(new Set(snap.socials.filter((s) => s.id).map((s) => s.id!)));
    },
  });

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this contact?")) return;
    setDeleting(true);
    try {
      await supabase.from("people").delete().eq("id", contactId);
      router.push("/contacts");
    } finally {
      setDeleting(false);
    }
  }, [contactId, supabase, router]);

  const tabs = [
    { id: "info", label: "Info" },
    ...(companyBuyerType ? [{ id: "grid", label: "Grid" }] : []),
    { id: "meetings", label: "Meetings" },
    { id: "calls", label: "Calls" },
    { id: "submissions", label: "Submissions" },
    { id: "materials", label: "Materials" },
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
      <Breadcrumb fallbackHref="/contacts" fallbackLabel="Contacts" currentLabel={form.full_name || "Untitled"} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-black">
          {form.full_name || "Untitled Contact"}
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
          <div className="grid grid-cols-2 gap-4">
            <Field label={
              <span className="flex items-center gap-1.5">
                Company
                {form.company_id && (
                  <Link
                    href={`/companies/${form.company_id}`}
                    className="inline-flex items-center gap-0.5 text-2xs font-normal text-zinc-400 hover:text-black transition-colors"
                    title="View full company record"
                    prefetch
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </span>
            }>
              <RelationPicker
                value={form.company_id}
                onChange={(id) => {
                  setForm({ ...form, company_id: id });
                  setCompanyBuyerType(companies.find((c) => c.id === id)?.buyer_type || null);
                }}
                options={companyOptions}
                placeholder="Select company..."
              />
            </Field>
            <Field label="Title">
              <Input
                value={form.title || ""}
                onChange={(e) => setForm({ ...form, title: e.target.value || null })}
                placeholder="Job title"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <PicklistSelect
                value={form.type}
                onChange={(v) => setForm({ ...form, type: v })}
                options={PERSON_TYPES}
                placeholder="Select..."
                manageTable="list_contact_types"
              />
            </Field>
            <Field label="Level">
              <PicklistSelect
                value={form.exec_level}
                onChange={(v) => setForm({ ...form, exec_level: v })}
                options={EXEC_LEVELS}
                placeholder="Select..."
                manageTable="list_contact_levels"
              />
            </Field>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 grid grid-cols-1 md:grid-cols-2 gap-x-24 gap-y-12">
            <PhoneSection phones={phones} onChange={setPhones} />
            <EmailSection emails={emails} onChange={setEmails} />
            <AddressSection addresses={addresses} onChange={setAddresses} />
            <SocialSection socials={socials} onChange={setSocials} />
          </div>

          <Field label={
            <span className="flex items-center gap-1.5">
              Assistant
              {form.assistant_id && (
                <Link
                  href={`/contacts/${form.assistant_id}`}
                  className="inline-flex items-center gap-0.5 text-2xs font-normal text-zinc-400 hover:text-black transition-colors"
                  title="View full assistant record"
                  prefetch
                >
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </span>
          }>
            <RelationPicker
              value={form.assistant_id}
              onChange={(id) => {
                setForm({ ...form, assistant_id: id });
                setAssistantInfo(null);
                if (id) {
                  loadAssistantInfo(id);
                }
              }}
              options={assistantOptions}
              placeholder="Select assistant..."
            />
            {form.assistant_id && assistantInfo && (
              <div className="mt-1.5 ml-0.5 space-y-0.5">
                {assistantInfo.phone && (
                  <p className="text-xs text-zinc-500">{formatPhone(assistantInfo.phone)}</p>
                )}
                {assistantInfo.email && (
                  <p className="text-xs text-zinc-500">{assistantInfo.email}</p>
                )}
                {!assistantInfo.phone && !assistantInfo.email && (
                  <p className="text-xs text-zinc-400">No primary contact info</p>
                )}
              </div>
            )}
          </Field>

          <Field label="Notes">
            <Textarea
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
              placeholder="Notes..."
            />
          </Field>
        </div>
      )}

      {/* Meetings Tab */}
      {activeTab === "meetings" && (
        <div className="space-y-2">
          {relatedMeetings.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">No meetings yet.</p>
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

      {/* Calls Tab */}
      {activeTab === "calls" && (
        <div className="space-y-2">
          {relatedCalls.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">No calls yet.</p>
          ) : (
            <>
              {relatedCalls.map((c) => (
                <Link
                  key={c.id}
                  href={`/calls?open=${c.id}`}
                  className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-3 hover:bg-zinc-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-black">{c.about}</p>
                    <p className="text-xs text-zinc-500">{c.due_date ? new Date(c.due_date).toLocaleDateString() : "No date"}</p>
                  </div>
                  <StatusBadge status={c.call_status} />
                </Link>
              ))}
              {callsHasMore && (
                <button
                  onClick={loadMoreCalls}
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

      {/* Submissions Tab */}
      {activeTab === "submissions" && (
        <div className="space-y-2">
          {relatedSubmissions.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">No submissions yet.</p>
          ) : (
            relatedSubmissions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-3">
                <p className="text-sm font-medium text-black">{s.description}</p>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-2xs font-medium ${
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

      {/* Materials Tab */}
      {activeTab === "materials" && (
        <div className="space-y-2">
          {relatedMaterials.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">No materials yet.</p>
          ) : (
            relatedMaterials.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-black">{m.title}</p>
                  <p className="text-xs text-zinc-500">
                    {m.material_type ? (m.material_type as string).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "\u2014"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {m.response ? (
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-2xs font-medium ${
                      m.response === "love" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      m.response === "like" ? "bg-blue-50 text-blue-700 border-blue-200" :
                      m.response === "meh" ? "bg-amber-50 text-amber-700 border-amber-200" :
                      "bg-red-50 text-red-700 border-red-200"
                    }`}>
                      {m.response.charAt(0).toUpperCase() + m.response.slice(1)}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400">No response</span>
                  )}
                  <select
                    value={m.response || ""}
                    onChange={async (e) => {
                      const val = e.target.value;
                      if (val) {
                        await supabase.from("material_responses").upsert(
                          { material_id: m.id, person_id: contactId, response: val },
                          { onConflict: "material_id,person_id" }
                        );
                      } else {
                        await supabase.from("material_responses")
                          .delete()
                          .eq("material_id", m.id)
                          .eq("person_id", contactId);
                      }
                      setRelatedMaterials((prev) =>
                        prev.map((mat) => mat.id === m.id ? { ...mat, response: val || null } : mat)
                      );
                    }}
                    className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-2xs text-zinc-600 outline-none"
                  >
                    <option value="">&mdash;</option>
                    <option value="love">Love</option>
                    <option value="like">Like</option>
                    <option value="meh">Meh</option>
                    <option value="hate">Hate</option>
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      {/* Grid tab */}
      {activeTab === "grid" && (
        <div>
          {gridLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          ) : (
            <>
              {/* Person summary card */}
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-black">{form.full_name}</h3>
                    {form.title && <p className="text-sm text-zinc-600">{form.title}</p>}
                    <p className="text-sm text-zinc-500">{companies.find((c) => c.id === form.company_id)?.name || "No company"}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {form.type && (
                      <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-2xs font-medium text-zinc-600">
                        {form.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    )}
                    {form.exec_level && (
                      <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-2xs font-medium text-zinc-600">
                        {form.exec_level.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    )}
                    {companyBuyerType && (
                      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-2xs font-medium text-amber-700">
                        {companyBuyerType}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
                  {phones.length > 0 && (
                    <span>{phones.find((p) => p.is_primary)?.number || phones[0]?.number}</span>
                  )}
                  {emails.length > 0 && (() => {
                    const addr = emails.find((e) => e.is_primary)?.address || emails[0]?.address;
                    return (
                      <span className="inline-flex items-center gap-1.5">
                        {addr}
                        <MailIconButton email={addr} />
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Met With / Not Met / Materials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Met With */}
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-4">
                  <h4 className="text-base font-semibold text-emerald-800 mb-3">
                    Met With <span className="font-normal text-emerald-600">({gridMetWith.length})</span>
                  </h4>
                  {gridMetWith.length === 0 ? (
                    <p className="text-sm text-emerald-600/60">No meetings with any clients yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {gridMetWith.map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-sm">
                          <span className="font-medium text-emerald-900">{c.full_name}</span>
                          <span className="text-emerald-600">
                            {c.meetingCount} meeting{c.meetingCount !== 1 ? "s" : ""}
                            {c.lastMeeting && ` · ${new Date(c.lastMeeting).toLocaleDateString()}`}
                          </span>
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
                  Submissions <span className="font-normal text-blue-600">({gridMaterials.length})</span>
                </h4>
                {gridMaterials.length === 0 ? (
                  <p className="text-sm text-blue-600/60">No materials submitted to this contact yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {gridMaterials.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium text-blue-900">{m.title}</span>
                          {m.client_name && <span className="ml-2 text-blue-600">({m.client_name})</span>}
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
          {deleting ? "Deleting..." : "Delete this contact"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  RelationPicker,
  type RelationOption,
} from "@/components/shared/relation-picker";
import { Field, Input, Select, Textarea } from "@/components/shared/detail-panel";
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

interface ContactDetailProps {
  contactId: string;
  userId: string;
}

export function ContactDetail({ contactId, userId }: ContactDetailProps) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  const [companies, setCompanies] = useState<CompanyData[]>([]);
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
    { id: string; title: string; material_type: string | null; direction: string | null; response: string | null }[]
  >([]);

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
          .select("*, company:companies!company_id(id, name)")
          .eq("id", contactId)
          .single(),
        supabase.from("companies").select("id, name").order("name"),
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
          .select("id, designation, street, city, state, zip, country, is_primary")
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
          .from("submission_people")
          .select("submission:submissions(id, description, status)")
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

      setCompanies(companiesData || []);
      setContactPeople(peopleData || []);

      const pList = (phonesData || []) as PhoneRecord[];
      const eList = (emailsData || []) as EmailRecord[];
      const aList = (addressesData || []).map((a) => ({ ...a, street: a.street || "", city: a.city || "", state: a.state || "", zip: a.zip || "", country: a.country || "" })) as AddressRecord[];
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

      // Fetch materials
      const subIds = (submissions || [])
        .map((s: Record<string, unknown>) => (s.submission as { id: string } | null)?.id)
        .filter(Boolean) as string[];
      if (subIds.length > 0) {
        const { data: subMats } = await supabase
          .from("submission_materials")
          .select("material:client_materials(id, title, material_type, direction)")
          .in("submission_id", subIds);
        const seen = new Set<string>();
        const uniqueMats: { id: string; title: string; material_type: string | null; direction: string | null }[] = [];
        for (const row of subMats || []) {
          const mat = (row as Record<string, unknown>).material as { id: string; title: string; material_type: string | null; direction: string | null } | null;
          if (mat && !seen.has(mat.id)) {
            seen.add(mat.id);
            uniqueMats.push(mat);
          }
        }
        const matIds = uniqueMats.map((m) => m.id);
        if (matIds.length > 0) {
          const { data: responses } = await supabase
            .from("material_responses")
            .select("material_id, response")
            .eq("person_id", contactId)
            .in("material_id", matIds);
          const respMap: Record<string, string> = {};
          for (const r of responses || []) {
            respMap[r.material_id] = r.response;
          }
          setRelatedMaterials(
            uniqueMats.map((m) => ({ ...m, response: respMap[m.id] || null }))
          );
        } else {
          setRelatedMaterials([]);
        }
      } else {
        setRelatedMaterials([]);
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

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await supabase
        .from("people")
        .update({ ...form })
        .eq("id", contactId);

      await Promise.all([
        syncPhones("person", contactId, phones, origPhoneIds),
        syncEmails("person", contactId, emails, origEmailIds),
        syncAddresses("person", contactId, addresses, origAddressIds),
        syncSocials("person", contactId, socials, origSocialIds),
      ]);

      setOrigPhoneIds(new Set(phones.filter((p) => p.id).map((p) => p.id!)));
      setOrigEmailIds(new Set(emails.filter((e) => e.id).map((e) => e.id!)));
      setOrigAddressIds(new Set(addresses.filter((a) => a.id).map((a) => a.id!)));
      setOrigSocialIds(new Set(socials.filter((s) => s.id).map((s) => s.id!)));

      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }, [form, contactId, supabase, phones, emails, addresses, socials, origPhoneIds, origEmailIds, origAddressIds, origSocialIds]);

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
    <div className="mx-auto max-w-4xl">
      {/* Back link */}
      <Link
        href="/contacts"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-black transition-colors mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Contacts
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-black">
          {form.full_name || "Untitled Contact"}
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
          <Field label="Company">
            <RelationPicker
              value={form.company_id}
              onChange={(id) => setForm({ ...form, company_id: id })}
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
          <div className="grid grid-cols-2 gap-4">
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

          <PhoneSection phones={phones} onChange={setPhones} />
          <EmailSection emails={emails} onChange={setEmails} />
          <AddressSection addresses={addresses} onChange={setAddresses} />
          <SocialSection socials={socials} onChange={setSocials} />

          <Field label="Assistant">
            <RelationPicker
              value={form.assistant_id}
              onChange={(id) => setForm({ ...form, assistant_id: id })}
              options={assistantOptions}
              placeholder="Select assistant..."
            />
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
                    {[m.material_type, m.direction].filter(Boolean).map((v) => (v as string).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())).join(" \u00b7 ") || "\u2014"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {m.response ? (
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
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
                    className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] text-zinc-600 outline-none"
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
    </div>
  );
}

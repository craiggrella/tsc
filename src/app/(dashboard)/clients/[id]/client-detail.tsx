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

interface CompanyData {
  id: string;
  name: string;
}

const emptyForm = {
  full_name: "",
  first_name: null as string | null,
  last_name: null as string | null,
  company_id: null as string | null,
  staff_level: null as string | null,
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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  const [companies, setCompanies] = useState<CompanyData[]>([]);

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
    { id: string; title: string; status: string; format: string | null; genre: string | null }[]
  >([]);

  useEffect(() => {
    async function load() {
      const [
        { data: client },
        { data: companiesData },
        { data: phonesData },
        { data: emailsData },
        { data: addressesData },
        { data: socialsData },
        { data: meetings },
        { data: submissions },
        { data: materials },
        { data: calls },
      ] = await Promise.all([
        supabase
          .from("clients")
          .select("*, company:companies!company_id(id, name)")
          .eq("id", clientId)
          .single(),
        supabase.from("companies").select("id, name").order("name"),
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
          .select("id, designation, street, city, state, zip, country, is_primary")
          .eq("entity_type", "client")
          .eq("entity_id", clientId)
          .order("is_primary", { ascending: false }),
        supabase
          .from("contact_socials")
          .select("id, platform, url")
          .eq("entity_type", "client")
          .eq("entity_id", clientId),
        supabase
          .from("meeting_clients")
          .select("meeting:meetings(id, title, meeting_status, meeting_at)")
          .eq("client_id", clientId),
        supabase
          .from("submission_clients")
          .select("submission:submissions(id, description, status)")
          .eq("client_id", clientId),
        supabase
          .from("client_materials")
          .select("id, title, status, format, genre")
          .eq("client_id", clientId)
          .order("updated_at", { ascending: false }),
        supabase
          .from("calls")
          .select("id, about, call_status, due_date")
          .eq("client_id", clientId)
          .order("due_date", { ascending: false })
          .range(0, 20),
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
        notes: client.notes,
      });

      setCompanies(companiesData || []);

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
      setRelatedMaterials(materials || []);

      setLoading(false);
    }
    load();
  }, [clientId]);

  const companyOptions: RelationOption[] = useMemo(
    () => companies.map((c) => ({ id: c.id, label: c.name })),
    [companies]
  );

  async function loadMoreCalls() {
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
      await supabase
        .from("clients")
        .update({ ...form })
        .eq("id", clientId);

      await Promise.all([
        syncPhones("client", clientId, phones, origPhoneIds),
        syncEmails("client", clientId, emails, origEmailIds),
        syncAddresses("client", clientId, addresses, origAddressIds),
        syncSocials("client", clientId, socials, origSocialIds),
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
  }, [form, clientId, supabase, phones, emails, addresses, socials, origPhoneIds, origEmailIds, origAddressIds, origSocialIds]);

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
    { id: "calls", label: "Calls" },
    { id: "materials", label: "Materials" },
    { id: "meetings", label: "Meetings" },
    { id: "submissions", label: "Submissions" },
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
        href="/clients"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-black transition-colors mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Clients
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-black">
          {form.full_name || "Untitled Client"}
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
          <Field label="Staff Level">
            <Input
              value={form.staff_level || ""}
              onChange={(e) => setForm({ ...form, staff_level: e.target.value || null })}
              placeholder="Staff level"
            />
          </Field>

          <PhoneSection phones={phones} onChange={setPhones} />
          <EmailSection emails={emails} onChange={setEmails} />
          <AddressSection addresses={addresses} onChange={setAddresses} />
          <SocialSection socials={socials} onChange={setSocials} />

          <Field label="Notes">
            <Textarea
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
              placeholder="Notes..."
            />
          </Field>
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
                    <p className="text-sm font-medium text-black">{c.about || "\u2014"}</p>
                    <p className="text-xs text-zinc-500">
                      {c.due_date ? new Date(c.due_date).toLocaleDateString() : "No date"}
                    </p>
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

      {/* Meetings Tab */}
      {activeTab === "meetings" && (
        <div className="space-y-2">
          {relatedMeetings.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">No meetings yet.</p>
          ) : (
            relatedMeetings.map((m) => (
              <Link
                key={m.id}
                href={`/meetings/${m.id}`}
                className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-3 hover:bg-zinc-50 transition-colors"
              >
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
              </Link>
            ))
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
    </div>
  );
}

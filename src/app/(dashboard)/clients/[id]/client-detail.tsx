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
    { id: string; title: string; material_type: string | null; format: string | null; genre: string | null; sub_genre: string | null; direction: string | null; status: string }[]
  >([]);

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
          .select("id, title, material_type, format, genre, sub_genre, direction, status")
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

  useEffect(() => {
    if (activeTab !== "grid" || gridLoaded) return;
    setGridLoading(true);
    async function loadGrid() {
      // 1. Get meeting_ids for this client
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

      // 2. Get people on those meetings
      let metMap: Record<string, { count: number; lastDate: string | null; full_name: string; company: string | null; buyer_type: string | null }> = {};
      if (meetingIds.length > 0) {
        const { data: meetingPeople } = await supabase
          .from("meeting_people")
          .select("person_id, meeting_id, person:people(full_name, buyer_type, company:companies!company_id(name))")
          .in("meeting_id", meetingIds);
        for (const row of meetingPeople || []) {
          const r = row as unknown as { person_id: string; meeting_id: string; person: { full_name: string; buyer_type: string | null; company: { name: string } | null } | null };
          if (!r.person) continue;
          if (!metMap[r.person_id]) {
            metMap[r.person_id] = { count: 0, lastDate: null, full_name: r.person.full_name, company: r.person.company?.name || null, buyer_type: r.person.buyer_type };
          }
          metMap[r.person_id].count++;
          const meetDate = meetingDateMap.get(r.meeting_id) || null;
          if (meetDate && (!metMap[r.person_id].lastDate || meetDate > metMap[r.person_id].lastDate!)) {
            metMap[r.person_id].lastDate = meetDate;
          }
        }
      }

      // 3. Get all buyers (people with buyer_type set)
      const { data: allBuyers } = await supabase
        .from("people")
        .select("id, full_name, title, buyer_type, company:companies!company_id(name)")
        .not("buyer_type", "is", null)
        .order("full_name");

      // 4. Build met/notMet arrays
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
          const bb = b as unknown as { id: string; full_name: string; title: string | null; buyer_type: string | null; company: { name: string } | null };
          return { id: bb.id, full_name: bb.full_name, company_name: bb.company?.name || null, title: bb.title, buyer_type: bb.buyer_type };
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
    // Find submissions where both this client and this person appear
    const { data: personSubs } = await supabase
      .from("submission_people")
      .select("submission_id")
      .eq("person_id", personId);
    const { data: clientSubs } = await supabase
      .from("submission_clients")
      .select("submission_id")
      .eq("client_id", clientId);

    const personSubIds = new Set((personSubs || []).map((s) => s.submission_id));
    const sharedSubIds = (clientSubs || []).filter((s) => personSubIds.has(s.submission_id)).map((s) => s.submission_id);

    if (sharedSubIds.length > 0) {
      const { data: subMats } = await supabase
        .from("submission_materials")
        .select("material:client_materials(id, title), submission:submissions(submission_date)")
        .in("submission_id", sharedSubIds);

      const matIds = new Set<string>();
      const materials: { title: string; date: string | null; response: string | null }[] = [];
      for (const row of subMats || []) {
        const r = row as unknown as { material: { id: string; title: string } | null; submission: { submission_date: string | null } | null };
        if (r.material && !matIds.has(r.material.id)) {
          matIds.add(r.material.id);
          materials.push({ title: r.material.title, date: r.submission?.submission_date || null, response: null });
        }
      }

      // Get responses
      if (materials.length > 0) {
        const matIdArr = Array.from(matIds);
        const { data: responses } = await supabase
          .from("material_responses")
          .select("material_id, response")
          .eq("person_id", personId)
          .in("material_id", matIdArr);
        const respMap = new Map((responses || []).map((r) => [r.material_id, r.response]));
        const matIdList = Array.from(matIds);
        for (let i = 0; i < matIdList.length; i++) {
          materials[i].response = respMap.get(matIdList[i]) || null;
        }
      }

      setSelectedPersonDetail({ materials });
    } else {
      setSelectedPersonDetail({ materials: [] });
    }
  }

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
    { id: "grid", label: "Grid" },
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
      {/* Grid Tab */}
      {activeTab === "grid" && (
        <div>
          {gridLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          ) : (
            <>
              {/* Client summary card */}
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-black">{form.full_name}</h3>
                    {form.staff_level && <p className="text-sm text-zinc-600">{form.staff_level}</p>}
                    <p className="text-sm text-zinc-500">{companies.find((c) => c.id === form.company_id)?.name || "No company"}</p>
                  </div>
                </div>
              </div>

              {/* Met With / Not Yet Met */}
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
                            {p.lastMeeting && ` · ${new Date(p.lastMeeting).toLocaleDateString()}`}
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
                            {p.buyer_type && <span className="ml-1 text-zinc-400">· {p.buyer_type}</span>}
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

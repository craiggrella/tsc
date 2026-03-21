"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Field, Input, Textarea } from "@/components/shared/detail-panel";
import { MultiRelationPicker, type RelationOption } from "@/components/shared/relation-picker";
import { formatPhone } from "@/lib/utils";
import { usePicklist, toRelationOptions } from "@/lib/picklists";
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

interface PersonRow {
  id: string;
  full_name: string;
  title: string | null;
  exec_level: string | null;
  department: string[];
  buyer_type: string | null;
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  const [form, setForm] = useState({
    name: "",
    types: [] as string[],
    outlet: [] as string[],
    department: [] as string[],
    phone: null as string | null,
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
          .select("id, full_name, title, exec_level, department, buyer_type")
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
          .select("id, designation, street, city, state, zip, country, is_primary")
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
            .select("entity_id, number")
            .eq("entity_type", "person")
            .in("entity_id", personIds)
            .eq("is_primary", true),
          supabase
            .from("contact_emails")
            .select("entity_id, address")
            .eq("entity_type", "person")
            .in("entity_id", personIds)
            .eq("is_primary", true),
        ]);
        for (const p of personPhones || []) phoneMap[p.entity_id] = p.number;
        for (const e of personEmails || []) emailMap[e.entity_id] = e.address;
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

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await supabase.from("companies").update({ ...form }).eq("id", companyId);

      await Promise.all([
        syncPhones("company" as "person", companyId, phones, origPhoneIds),
        syncEmails("company" as "person", companyId, emails, origEmailIds),
        syncAddresses("company" as "person", companyId, addresses, origAddressIds),
        syncSocials("company" as "client", companyId, socials, origSocialIds),
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
  }, [form, companyId, supabase, phones, emails, addresses, socials, origPhoneIds, origEmailIds, origAddressIds, origSocialIds]);

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
    <div className="mx-auto max-w-4xl">
      {/* Back link */}
      <Link
        href="/companies"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-black transition-colors mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Companies
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-black">
          {form.name || "Untitled Company"}
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
          <Field label="Company Name">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Company name"
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
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
                          href={`/contacts/${person.id}`}
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
                          href={`/projects/${proj.id}`}
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

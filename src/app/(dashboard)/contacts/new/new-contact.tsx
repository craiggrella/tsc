"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  RelationPicker,
  type RelationOption,
} from "@/components/shared/relation-picker";
import { Field, Input, Select, Textarea } from "@/components/shared/detail-panel";
import { PicklistSelect } from "@/components/shared/picklist-select";
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

interface CompanyData {
  id: string;
  name: string;
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

interface NewContactProps {
  userId: string;
}

export function NewContact({ userId }: NewContactProps) {
  const supabase = createClient();
  const router = useRouter();
  const personTypesItems = usePicklist("list_contact_types");
  const PERSON_TYPES = toSelectOptions(personTypesItems);
  const execLevelsItems = usePicklist("list_contact_levels");
  const EXEC_LEVELS = toSelectOptions(execLevelsItems);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [contactPeople, setContactPeople] = useState<{ id: string; full_name: string }[]>([]);

  // Sub-records
  const [phones, setPhones] = useState<PhoneRecord[]>([]);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [addresses, setAddresses] = useState<AddressRecord[]>([]);
  const [socials, setSocials] = useState<SocialRecord[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("companies").select("id, name").order("name"),
      supabase.from("people").select("id, full_name").order("full_name"),
    ]).then(([{ data: companiesData }, { data: peopleData }]) => {
      setCompanies(companiesData || []);
      setContactPeople(peopleData || []);
    });
  }, []);

  const companyOptions: RelationOption[] = useMemo(
    () => companies.map((c) => ({ id: c.id, label: c.name })),
    [companies]
  );

  const assistantOptions: RelationOption[] = useMemo(
    () => contactPeople.map((p) => ({ id: p.id, label: p.full_name })),
    [contactPeople]
  );

  const handleSave = useCallback(async () => {
    if (!form.full_name.trim()) return;
    setSaving(true);
    try {
      const cleaned = {
        ...form,
        first_name: form.first_name ? toPersonName(form.first_name) : form.first_name,
        last_name: form.last_name ? toPersonName(form.last_name) : form.last_name,
        full_name: toPersonName(form.full_name),
      };
      const { data } = await supabase
        .from("people")
        .insert(cleaned)
        .select("id")
        .single();

      if (data) {
        await Promise.all([
          syncPhones("person", data.id, phones, new Set()),
          syncEmails("person", data.id, emails, new Set()),
          syncAddresses("person", data.id, addresses, new Set()),
          syncSocials("person", data.id, socials, new Set()),
        ]);
        router.push(`/contacts/${data.id}`);
      }
    } finally {
      setSaving(false);
    }
  }, [form, supabase, phones, emails, addresses, socials, router]);

  return (
    <div>
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
        <h1 className="text-xl font-semibold tracking-tight text-black">New Contact</h1>
        <button
          onClick={handleSave}
          disabled={saving || !form.full_name.trim()}
          className="rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Create Contact"}
        </button>
      </div>

      {/* Form */}
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
    </div>
  );
}

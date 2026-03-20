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

interface NewClientProps {
  userId: string;
}

export function NewClient({ userId }: NewClientProps) {
  const supabase = createClient();
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [companies, setCompanies] = useState<CompanyData[]>([]);

  // Sub-records
  const [phones, setPhones] = useState<PhoneRecord[]>([]);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [addresses, setAddresses] = useState<AddressRecord[]>([]);
  const [socials, setSocials] = useState<SocialRecord[]>([]);

  useEffect(() => {
    supabase.from("companies").select("id, name").order("name").then(({ data }) => {
      setCompanies(data || []);
    });
  }, []);

  const companyOptions: RelationOption[] = useMemo(
    () => companies.map((c) => ({ id: c.id, label: c.name })),
    [companies]
  );

  const handleSave = useCallback(async () => {
    if (!form.full_name.trim()) return;
    setSaving(true);
    try {
      const { data } = await supabase
        .from("clients")
        .insert({ ...form })
        .select("id")
        .single();

      if (data) {
        await Promise.all([
          syncPhones("client", data.id, phones, new Set()),
          syncEmails("client", data.id, emails, new Set()),
          syncAddresses("client", data.id, addresses, new Set()),
          syncSocials("client", data.id, socials, new Set()),
        ]);
        router.push(`/clients/${data.id}`);
      }
    } finally {
      setSaving(false);
    }
  }, [form, supabase, phones, emails, addresses, socials, router]);

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
        <h1 className="text-xl font-semibold tracking-tight text-black">New Client</h1>
        <button
          onClick={handleSave}
          disabled={saving || !form.full_name.trim()}
          className="rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Create Client"}
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
    </div>
  );
}

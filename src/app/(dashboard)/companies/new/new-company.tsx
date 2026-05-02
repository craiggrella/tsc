"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Field, Input, Select, Textarea } from "@/components/shared/detail-panel";
import { usePicklist, toSelectOptions } from "@/lib/picklists";

const COMPANY_TYPES = [
  "Pod",
  "Studio",
  "Network",
  "Streamer",
  "Production Company",
  "Agency",
  "Other",
];

const emptyForm = {
  name: "",
  types: [] as string[],
  outlet: null as string | null,
  department: null as string | null,
  phone: null as string | null,
  buyer_type: null as string | null,
  notes: null as string | null,
};

interface NewCompanyProps {
  userId: string;
}

export function NewCompany({ userId }: NewCompanyProps) {
  const supabase = createClient();
  const router = useRouter();
  const buyerTypesItems = usePicklist("list_buyer_types");
  const BUYER_TYPES = toSelectOptions(buyerTypesItems);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function toggleType(t: string) {
    setForm((prev) => ({
      ...prev,
      types: prev.types.includes(t) ? prev.types.filter((v) => v !== t) : [...prev.types, t],
    }));
  }

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const { data } = await supabase
        .from("companies")
        .insert({ ...form })
        .select("id")
        .single();
      if (data) {
        router.push(`/companies/${data.id}`);
      }
    } finally {
      setSaving(false);
    }
  }, [form, supabase, router]);

  return (
    <div>
      <Link
        href="/companies"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-black transition-colors mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Companies
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-black">New Company</h1>
        <button
          onClick={handleSave}
          disabled={saving || !form.name.trim()}
          className="rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Create Company"}
        </button>
      </div>

      <div className="space-y-5">
        <Field label="Name">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Company name"
          />
        </Field>

        <Field label="Types">
          <div className="flex flex-wrap gap-1.5">
            {COMPANY_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleType(t)}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  form.types.includes(t)
                    ? "border-black bg-black text-white"
                    : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Outlet">
            <Input
              value={form.outlet || ""}
              onChange={(e) => setForm({ ...form, outlet: e.target.value || null })}
              placeholder="Outlet name"
            />
          </Field>
          <Field label="Department">
            <Input
              value={form.department || ""}
              onChange={(e) => setForm({ ...form, department: e.target.value || null })}
              placeholder="Department"
            />
          </Field>
        </div>

        <Field label="Phone">
          <Input
            value={form.phone || ""}
            onChange={(e) => setForm({ ...form, phone: e.target.value || null })}
            placeholder="Phone number"
          />
        </Field>

        <Field label="Buyer Type">
          <Select
            value={form.buyer_type || ""}
            onChange={(e) => setForm({ ...form, buyer_type: (e.target.value || null) as string | null })}
            options={BUYER_TYPES}
            placeholder="Not a buyer"
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

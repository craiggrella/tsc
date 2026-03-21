"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Field, Input, Textarea } from "@/components/shared/detail-panel";
import { MultiRelationPicker, type RelationOption } from "@/components/shared/relation-picker";
import { formatPhone } from "@/lib/utils";
import { usePicklist, toRelationOptions } from "@/lib/picklists";

interface PersonRow {
  id: string;
  full_name: string;
  title: string | null;
  exec_level: string | null;
  department: string[];
  buyer_type: string | null;
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

  const [form, setForm] = useState({
    name: "",
    types: [] as string[],
    outlet: [] as string[],
    department: [] as string[],
    phone: null as string | null,
    notes: null as string | null,
  });

  const [people, setPeople] = useState<PersonRow[]>([]);

  useEffect(() => {
    async function load() {
      const [{ data: company }, { data: peopleData }] = await Promise.all([
        supabase.from("companies").select("*").eq("id", companyId).single(),
        supabase
          .from("people")
          .select("id, full_name, title, exec_level, department, buyer_type")
          .eq("company_id", companyId)
          .order("full_name"),
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
      setPeople(peopleData || []);
      setLoading(false);
    }
    load();
  }, [companyId]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await supabase.from("companies").update({ ...form }).eq("id", companyId);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }, [form, companyId, supabase]);

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

  function toggleArrayField(field: "types" | "outlet" | "department", value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
  }

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

      {/* Edit fields */}
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

        <Field label="Phone">
          <Input
            value={form.phone || ""}
            onChange={(e) => setForm({ ...form, phone: e.target.value || null })}
            placeholder="Company phone"
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

      {/* People at this company */}
      <div className="mt-10">
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
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/50">
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Name</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Title</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Level</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Department</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Buyer Type</th>
                </tr>
              </thead>
              <tbody>
                {people.map((person) => (
                  <tr
                    key={person.id}
                    onClick={() => router.push(`/contacts/${person.id}`)}
                    className="border-b border-zinc-100 last:border-0 cursor-pointer hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="px-3 py-2.5 font-medium text-black whitespace-nowrap">
                      {person.full_name}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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

"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  MultiRelationPicker,
  type RelationOption,
} from "@/components/shared/relation-picker";
import { Field, Input, Select } from "@/components/shared/detail-panel";
import { usePicklist, toSelectOptions } from "@/lib/picklists";
import { quickCreatePerson } from "@/lib/quick-create-person";

interface ProjectCompanyRow {
  company_id: string;
  designation: string;
}

const emptyForm = {
  name: "",
  status: "development" as string,
  person_ids: [] as string[],
};

interface NewProjectProps {
  userId: string;
}

export function NewProject({ userId }: NewProjectProps) {
  const supabase = createClient();
  const router = useRouter();
  const statusItems = usePicklist("list_project_statuses");
  const STATUSES = toSelectOptions(statusItems);
  const companyTypeItems = usePicklist("list_company_types");
  const COMPANY_DESIGNATIONS = companyTypeItems.map((i) => i.label);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [people, setPeople] = useState<{ id: string; full_name: string; title: string | null }[]>([]);
  const [companyList, setCompanyList] = useState<{ id: string; name: string }[]>([]);
  const [projectCompanies, setProjectCompanies] = useState<ProjectCompanyRow[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("companies").select("id, name").order("name"),
      supabase.from("people").select("id, full_name, title").order("full_name"),
    ]).then(([{ data: c }, { data: p }]) => {
      setCompanyList(c || []);
      setPeople(p || []);
    });
  }, []);

  const companyOptions: RelationOption[] = useMemo(
    () => companyList.map((c) => ({ id: c.id, label: c.name })),
    [companyList]
  );
  const personOptions: RelationOption[] = useMemo(
    () => people.map((p) => ({ id: p.id, label: p.full_name, sublabel: p.title || undefined })),
    [people]
  );

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const { data } = await supabase
        .from("projects")
        .insert({ name: form.name, status: form.status })
        .select("id")
        .single();

      if (data) {
        const projectId = data.id;

        // Insert companies
        if (projectCompanies.length > 0) {
          const validCompanies = projectCompanies.filter((pc) => pc.company_id);
          if (validCompanies.length > 0) {
            await supabase.from("project_companies").insert(
              validCompanies.map((pc) => ({ project_id: projectId, company_id: pc.company_id, designation: pc.designation }))
            );
          }
        }

        // Insert people
        if (form.person_ids.length > 0) {
          await supabase.from("project_people").insert(
            form.person_ids.map((id) => ({ project_id: projectId, person_id: id }))
          );
        }

        router.push(`/projects/${projectId}`);
      }
    } finally {
      setSaving(false);
    }
  }, [form, supabase, projectCompanies, router]);

  return (
    <div>
      {/* Back link */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-black transition-colors mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Projects
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-black">New Project</h1>
        <button
          onClick={handleSave}
          disabled={saving || !form.name.trim()}
          className="rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Create Project"}
        </button>
      </div>

      {/* Form */}
      <div className="space-y-5">
        <Field label="Name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Project name" />
        </Field>
        <Field label="Status">
          <Select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as string })}
            options={STATUSES}
          />
        </Field>
        {/* Companies with designation */}
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">Companies</p>
          <div className="space-y-1.5">
            {projectCompanies.map((pc, i) => (
              <div key={`new-${i}`} className="group flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-zinc-50 transition-colors">
                <select
                  value={pc.designation}
                  onChange={(e) => setProjectCompanies((prev) => prev.map((r, j) => j === i ? { ...r, designation: e.target.value } : r))}
                  className="w-36 flex-shrink-0 appearance-none bg-transparent text-xs font-medium text-zinc-500 outline-none cursor-pointer hover:text-black transition-colors"
                >
                  {COMPANY_DESIGNATIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <div className="flex-1">
                  <select
                    value={pc.company_id}
                    onChange={(e) => setProjectCompanies((prev) => prev.map((r, j) => j === i ? { ...r, company_id: e.target.value } : r))}
                    className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-xs outline-none"
                  >
                    <option value="">Select company...</option>
                    {companyOptions.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setProjectCompanies((prev) => prev.filter((_, j) => j !== i))}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3.5 w-3.5 text-zinc-400 hover:text-red-500 transition-colors" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setProjectCompanies((prev) => [...prev, { company_id: "", designation: "Network" }])}
            className="mt-1 inline-flex items-center gap-1 px-1.5 py-1 text-xs text-zinc-400 hover:text-black transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add Company
          </button>
        </div>
        <Field label="People">
          <MultiRelationPicker
            value={form.person_ids}
            onChange={(ids) => setForm({ ...form, person_ids: ids })}
            options={personOptions}
            placeholder="Select people..."
            onAdd={(name) => quickCreatePerson(supabase, name, userId)}
            addLabel="Create"
          />
        </Field>
      </div>
    </div>
  );
}

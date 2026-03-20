"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  MultiRelationPicker,
  type RelationOption,
} from "@/components/shared/relation-picker";
import { Field, Input, Select, Textarea } from "@/components/shared/detail-panel";
import type { MeetingStatus } from "@/types/database";

const MEETING_STATUSES: { value: MeetingStatus; label: string }[] = [
  { value: "need_to_set", label: "Need to Set" },
  { value: "need_to_reschedule", label: "Reschedule" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const RESPONSES = [
  { value: "love", label: "Love" },
  { value: "like", label: "Like" },
  { value: "meh", label: "Meh" },
  { value: "hate", label: "Hate" },
];

const emptyForm = {
  title: "",
  meeting_status: "need_to_set" as MeetingStatus,
  meeting_at: null as string | null,
  location_link: null as string | null,
  response: null as "love" | "like" | "meh" | "hate" | null,
  notes: null as string | null,
  client_ids: [] as string[],
  person_ids: [] as string[],
  project_ids: [] as string[],
  attendee_ids: [] as string[],
};

interface NewMeetingProps {
  userId: string;
}

export function NewMeeting({ userId }: NewMeetingProps) {
  const supabase = createClient();
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [clients, setClients] = useState<{ id: string; full_name: string }[]>([]);
  const [people, setPeople] = useState<{ id: string; full_name: string }[]>([]);
  const [projectList, setProjectList] = useState<{ id: string; name: string }[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string; role: string }[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("clients").select("id, full_name").order("full_name"),
      supabase.from("people").select("id, full_name").order("full_name"),
      supabase.from("projects").select("id, name").order("name"),
      supabase.from("profiles").select("id, full_name, role").order("full_name"),
    ]).then(([{ data: c }, { data: p }, { data: pr }, { data: prof }]) => {
      setClients(c || []);
      setPeople(p || []);
      setProjectList(pr || []);
      setProfiles(prof || []);
    });
  }, []);

  const clientOptions: RelationOption[] = useMemo(
    () => clients.map((c) => ({ id: c.id, label: c.full_name })),
    [clients]
  );
  const personOptions: RelationOption[] = useMemo(
    () => people.map((p) => ({ id: p.id, label: p.full_name })),
    [people]
  );
  const projectOptions: RelationOption[] = useMemo(
    () => projectList.map((p) => ({ id: p.id, label: p.name })),
    [projectList]
  );
  const profileOptions: RelationOption[] = useMemo(
    () => profiles.map((p) => ({ id: p.id, label: p.full_name, sublabel: p.role })),
    [profiles]
  );

  const createProject = useCallback(async (name: string): Promise<RelationOption | null> => {
    const { data, error } = await supabase
      .from("projects")
      .insert({ name, status: "development" })
      .select("id, name")
      .single();
    if (error || !data) return null;
    setProjectList((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return { id: data.id, label: data.name };
  }, [supabase]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Auto-generate title from clients + people
      const clientNames = form.client_ids.map((id) => clientOptions.find((c) => c.id === id)?.label).filter(Boolean);
      const personNames = form.person_ids.map((id) => personOptions.find((p) => p.id === id)?.label).filter(Boolean);
      const autoTitle = [clientNames.join(", "), personNames.join(", ")].filter(Boolean).join(" \u2014 ") || "Meeting";

      const payload = {
        title: autoTitle,
        meeting_status: form.meeting_status,
        meeting_at: form.meeting_at || null,
        location_link: form.location_link || null,
        response: form.response,
        notes: form.notes || null,
      };

      const { data } = await supabase
        .from("meetings")
        .insert(payload)
        .select("id")
        .single();

      if (data) {
        const meetingId = data.id;
        await Promise.all([
          form.client_ids.length > 0
            ? supabase.from("meeting_clients").insert(
                form.client_ids.map((id) => ({ meeting_id: meetingId, client_id: id }))
              )
            : Promise.resolve(),
          form.person_ids.length > 0
            ? supabase.from("meeting_people").insert(
                form.person_ids.map((id) => ({ meeting_id: meetingId, person_id: id }))
              )
            : Promise.resolve(),
          form.project_ids.length > 0
            ? supabase.from("meeting_projects").insert(
                form.project_ids.map((id) => ({ meeting_id: meetingId, project_id: id }))
              )
            : Promise.resolve(),
          form.attendee_ids.length > 0
            ? supabase.from("meeting_attendees").insert(
                form.attendee_ids.map((id) => ({ meeting_id: meetingId, profile_id: id }))
              )
            : Promise.resolve(),
        ]);
        router.push(`/meetings/${meetingId}`);
      }
    } finally {
      setSaving(false);
    }
  }, [form, supabase, clientOptions, personOptions, router]);

  return (
    <div className="mx-auto max-w-4xl">
      {/* Back link */}
      <Link
        href="/meetings"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-black transition-colors mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Meetings
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-black">New Meeting</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Create Meeting"}
        </button>
      </div>

      {/* Form */}
      <div className="space-y-5">
        <Field label="Client">
          <MultiRelationPicker
            value={form.client_ids}
            onChange={(ids) => setForm({ ...form, client_ids: ids })}
            options={clientOptions}
            placeholder="Select clients..."
          />
        </Field>
        <Field label="Meeting With">
          <MultiRelationPicker
            value={form.person_ids}
            onChange={(ids) => setForm({ ...form, person_ids: ids })}
            options={personOptions}
            placeholder="Search contacts..."
          />
        </Field>
        <Field label="Our Team">
          <MultiRelationPicker
            value={form.attendee_ids}
            onChange={(ids) => setForm({ ...form, attendee_ids: ids })}
            options={profileOptions}
            placeholder="Select team members..."
          />
        </Field>
        <Field label="Projects">
          <MultiRelationPicker
            value={form.project_ids}
            onChange={(ids) => setForm({ ...form, project_ids: ids })}
            options={projectOptions}
            placeholder="Select projects..."
            onAdd={createProject}
            addLabel="Create project"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Status">
            <Select
              value={form.meeting_status}
              onChange={(e) => setForm({ ...form, meeting_status: e.target.value as MeetingStatus })}
              options={MEETING_STATUSES}
            />
          </Field>
          <Field label="Response">
            <Select
              value={form.response || ""}
              onChange={(e) => setForm({ ...form, response: (e.target.value || null) as typeof form.response })}
              options={RESPONSES}
              placeholder="None"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date & Time">
            <Input
              type="datetime-local"
              value={form.meeting_at?.slice(0, 16) || ""}
              onChange={(e) => setForm({ ...form, meeting_at: e.target.value || null })}
            />
          </Field>
          <Field label="Location / Link">
            <Input
              value={form.location_link || ""}
              onChange={(e) => setForm({ ...form, location_link: e.target.value || null })}
              placeholder="Office, Zoom link, etc."
            />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea
            value={form.notes || ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
            placeholder="Meeting notes..."
          />
        </Field>
      </div>
    </div>
  );
}

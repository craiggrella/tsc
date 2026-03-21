"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { createClient } from "@/lib/supabase/client";
import {
  MultiRelationPicker,
  type RelationOption,
} from "@/components/shared/relation-picker";
import { Field, Input, Select, Textarea } from "@/components/shared/detail-panel";
import { usePicklist, toSelectOptions } from "@/lib/picklists";
import type { MeetingStatus } from "@/types/database";

const MEETING_STATUSES: { value: MeetingStatus; label: string }[] = [
  { value: "need_to_set", label: "Need to Set" },
  { value: "need_to_reschedule", label: "Reschedule" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const emptyForm = {
  title: "",
  meeting_status: "need_to_set" as MeetingStatus,
  meeting_at: null as string | null,
  location_link: null as string | null,
  location_type: null as string | null,
  virtual_info: null as string | null,
  meeting_address: null as string | null,
  notes: null as string | null,
  client_ids: [] as string[],
  person_ids: [] as string[],
  project_ids: [] as string[],
  attendee_ids: [] as string[],
};

interface MeetingDetailProps {
  meetingId: string;
  userId: string;
}

export function MeetingDetail({ meetingId, userId }: MeetingDetailProps) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [clients, setClients] = useState<{ id: string; full_name: string }[]>([]);
  const [people, setPeople] = useState<{ id: string; full_name: string }[]>([]);
  const [projectList, setProjectList] = useState<{ id: string; name: string }[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string; role: string }[]>([]);
  const locationTypes = usePicklist("list_location_types");

  // Linked submission context (if this meeting was created from a submission)
  const [linkedSubmission, setLinkedSubmission] = useState<{
    id: string;
    description: string;
    submission_date: string | null;
    materials: { title: string; client_name: string | null; person_name: string | null; response: string | null }[];
  } | null>(null);

  useEffect(() => {
    async function load() {
      const [
        { data: meeting },
        { data: clientsData },
        { data: peopleData },
        { data: projectsData },
        { data: profilesData },
        { data: mc },
        { data: mp },
        { data: mpr },
        { data: ma },
      ] = await Promise.all([
        supabase.from("meetings").select("*").eq("id", meetingId).single(),
        supabase.from("clients").select("id, full_name").order("full_name"),
        supabase.from("people").select("id, full_name").order("full_name"),
        supabase.from("projects").select("id, name").order("name"),
        supabase.from("profiles").select("id, full_name, role").order("full_name"),
        supabase.from("meeting_clients").select("client_id").eq("meeting_id", meetingId),
        supabase.from("meeting_people").select("person_id").eq("meeting_id", meetingId),
        supabase.from("meeting_projects").select("project_id").eq("meeting_id", meetingId),
        supabase.from("meeting_attendees").select("profile_id").eq("meeting_id", meetingId),
      ]);

      if (!meeting) {
        router.replace("/meetings");
        return;
      }

      setClients(clientsData || []);
      setPeople(peopleData || []);
      setProjectList(projectsData || []);
      setProfiles(profilesData || []);

      setForm({
        title: meeting.title,
        meeting_status: meeting.meeting_status,
        meeting_at: meeting.meeting_at,
        location_link: meeting.location_link,
        location_type: meeting.location_type || null,
        virtual_info: meeting.virtual_info || null,
        meeting_address: meeting.meeting_address || null,
        notes: meeting.notes,
        client_ids: (mc || []).map((r) => r.client_id),
        person_ids: (mp || []).map((r) => r.person_id),
        project_ids: (mpr || []).map((r) => r.project_id),
        attendee_ids: (ma || []).map((r) => r.profile_id),
      });

      // Check if this meeting was created from a submission
      const { data: smLink } = await supabase
        .from("submission_meetings")
        .select("submission_id")
        .eq("meeting_id", meetingId)
        .limit(1);

      if (smLink && smLink.length > 0) {
        const subId = smLink[0].submission_id;
        const [{ data: sub }, { data: subMats }, { data: subPeople }] = await Promise.all([
          supabase.from("submissions").select("id, description, submission_date").eq("id", subId).single(),
          supabase.from("submission_materials").select("material_id, material:client_materials(id, title, client:clients!client_id(full_name))").eq("submission_id", subId),
          supabase.from("submission_people").select("person_id").eq("submission_id", subId),
        ]);

        if (sub) {
          const personIds = (subPeople || []).map((r) => r.person_id);
          const matIds = (subMats || []).map((r) => r.material_id).filter(Boolean);

          // Fetch responses for these material×person combos
          let respMap: Record<string, Record<string, string>> = {};
          if (matIds.length > 0 && personIds.length > 0) {
            const { data: respData } = await supabase
              .from("material_responses")
              .select("material_id, person_id, response")
              .in("material_id", matIds)
              .in("person_id", personIds);
            for (const r of respData || []) {
              if (!respMap[r.material_id]) respMap[r.material_id] = {};
              if (r.response) respMap[r.material_id][r.person_id] = r.response;
            }
          }

          const materials: { title: string; client_name: string | null; person_name: string | null; response: string | null }[] = [];
          for (const sm of subMats || []) {
            const mat = (sm as unknown as { material: { id: string; title: string; client: { full_name: string } | null } | null }).material;
            if (!mat) continue;
            for (const pid of personIds) {
              const personName = (peopleData || []).find((p) => p.id === pid)?.full_name || null;
              materials.push({
                title: mat.title,
                client_name: mat.client?.full_name || null,
                person_name: personName,
                response: respMap[mat.id]?.[pid] || null,
              });
            }
          }

          setLinkedSubmission({
            id: sub.id,
            description: sub.description,
            submission_date: sub.submission_date,
            materials,
          });
        }
      }

      setLoading(false);
    }
    load();
  }, [meetingId]);

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
        location_type: form.location_type || null,
        virtual_info: form.virtual_info || null,
        meeting_address: form.meeting_address || null,
        notes: form.notes || null,
      };

      await supabase.from("meetings").update(payload).eq("id", meetingId);

      // Sync join tables
      await Promise.all([
        supabase.from("meeting_clients").delete().eq("meeting_id", meetingId),
        supabase.from("meeting_people").delete().eq("meeting_id", meetingId),
        supabase.from("meeting_projects").delete().eq("meeting_id", meetingId),
        supabase.from("meeting_attendees").delete().eq("meeting_id", meetingId),
      ]);
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

      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }, [form, meetingId, supabase, clientOptions, personOptions]);

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this meeting?")) return;
    setDeleting(true);
    try {
      await supabase.from("meetings").delete().eq("id", meetingId);
      router.push("/meetings");
    } finally {
      setDeleting(false);
    }
  }, [meetingId, supabase, router]);

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
        href="/meetings"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-black transition-colors mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Meetings
      </Link>

      {/* Linked Submission Context */}
      {linkedSubmission && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Send className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-xs font-medium text-blue-800">From Submission</span>
            <Link
              href={`/submissions/${linkedSubmission.id}`}
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              {linkedSubmission.description}
              {linkedSubmission.submission_date && ` · ${new Date(linkedSubmission.submission_date).toLocaleDateString()}`}
            </Link>
          </div>
          {linkedSubmission.materials.length > 0 && (
            <div className="space-y-1 ml-5">
              {linkedSubmission.materials.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-blue-900 font-medium">{m.client_name || "—"}</span>
                  <span className="text-blue-700">→</span>
                  <span className="text-blue-800">{m.title}</span>
                  <span className="text-blue-700">→</span>
                  <span className="text-blue-700">{m.person_name || "—"}</span>
                  {m.response ? (
                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      m.response === "love" ? "bg-emerald-100 text-emerald-700" :
                      m.response === "like" ? "bg-blue-100 text-blue-700" :
                      m.response === "meh" ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {m.response.charAt(0).toUpperCase() + m.response.slice(1)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-blue-400">No response</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-black">
          {form.title || "Untitled Meeting"}
        </h1>
        <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "Saved \u2713" : "Save"}
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
        <Field label="Status">
          <Select
            value={form.meeting_status}
            onChange={(e) => setForm({ ...form, meeting_status: e.target.value as MeetingStatus })}
            options={MEETING_STATUSES}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date & Time">
            <Input
              type="datetime-local"
              value={form.meeting_at?.slice(0, 16) || ""}
              onChange={(e) => setForm({ ...form, meeting_at: e.target.value || null })}
            />
          </Field>
        </div>
        <Field label="Location Type">
          <Select
            value={form.location_type || ""}
            onChange={(e) => setForm({ ...form, location_type: e.target.value || null })}
            options={toSelectOptions(locationTypes)}
            placeholder="Select..."
          />
        </Field>
        {(form.location_type === "virtual" || form.location_type === "hybrid") && (
          <Field label="Virtual Meeting Info">
            <Textarea
              value={form.virtual_info || ""}
              onChange={(e) => setForm({ ...form, virtual_info: e.target.value || null })}
              placeholder="Zoom link, phone conference number, etc."
            />
          </Field>
        )}
        {(form.location_type === "in_person" || form.location_type === "hybrid") && (
          <Field label="Meeting Address">
            <Textarea
              value={form.meeting_address || ""}
              onChange={(e) => setForm({ ...form, meeting_address: e.target.value || null })}
              placeholder="Office address, room number, etc."
            />
          </Field>
        )}
        <Field label="Notes">
          <Textarea
            value={form.notes || ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
            placeholder="Meeting notes..."
          />
        </Field>
      </div>
      {/* Danger Zone */}
      <div className="mt-12 border-t border-zinc-200 pt-6">
        <p className="text-xs text-zinc-400 mb-3">Danger Zone</p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete this meeting"}
        </button>
      </div>
    </div>
  );
}

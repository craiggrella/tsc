"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  ArrowUpDown,
  Phone,
  Filter,
  ChevronDown,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  RelationPicker,
  type RelationOption,
} from "@/components/shared/relation-picker";
import {
  DetailPanel,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/shared/detail-panel";
import { cn, formatPhone } from "@/lib/utils";
import type { CallStatus } from "@/types/database";

// ─── Types ──────────────────────────────────────────

interface ContactData {
  id: string;
  full_name: string;
}

interface ClientData {
  id: string;
  full_name: string;
}

interface PhoneRecord {
  id: string;
  designation: string;
  number: string;
  is_primary: boolean;
}

interface EmailRecord {
  id: string;
  designation: string;
  address: string;
  is_primary: boolean;
}

interface ProfileData {
  id: string;
  full_name: string;
  role: string;
}

interface PersonOption {
  id: string;
  full_name: string;
  title?: string | null;
}

interface CallRow {
  id: string;
  about: string;
  contact_id: string | null;
  client_id: string | null;
  user_id: string;
  call_status: CallStatus;
  priority: "high" | "medium" | "low" | null;
  preferred_phone: string | null;
  phone_custom: string | null;
  quick_connect: boolean;
  log_time: string | null;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  contact: ContactData | null;
  client: ClientData | null;
}

interface CallLogClientProps {
  userId: string;
}

// ─── Constants ──────────────────────────────────────

const CALL_STATUSES: { value: CallStatus; label: string }[] = [
  { value: "to_call", label: "To Call" },
  { value: "incoming", label: "Incoming" },
  { value: "left_word", label: "Left Word" },
  { value: "returning", label: "Returning" },
  { value: "completed", label: "Completed" },
];

const PRIORITIES = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];


type SortField = "due_date" | "log_time" | "priority" | "call_status";

function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const emptyCall = {
  about: "",
  contact_id: null as string | null,
  client_id: null as string | null,
  contact_type: null as "person" | "client" | null,
  user_id: null as string | null,
  call_status: "to_call" as CallStatus,
  priority: null as "high" | "medium" | "low" | null,
  preferred_phone: null as string | null,
  phone_custom: null as string | null,
  log_time: null as string | null,
  due_date: null as string | null,
  notes: null as string | null,
};

// ─── Component ──────────────────────────────────────

export function CallLogClient({ userId }: CallLogClientProps) {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof emptyCall>({ ...emptyCall, user_id: userId, log_time: nowLocal() });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkActing, setBulkActing] = useState(false);
  // Cache of people/clients we've fetched (for selected contact details)
  const [peopleCache, setPeopleCache] = useState<Map<string, PersonOption>>(new Map());
  const [clientsCache, setClientsCache] = useState<Map<string, ClientData>>(new Map());
  // Phone/email sub-records for the currently selected caller
  const [callerPhones, setCallerPhones] = useState<PhoneRecord[]>([]);
  const [callerEmails, setCallerEmails] = useState<EmailRecord[]>([]);
  // New phones being added inline on the call panel
  const [newPhones, setNewPhones] = useState<{ designation: string; number: string }[]>([]);


  // Filters — default to "open" (everything except completed) + current user
  const [statusFilter, setStatusFilter] = useState<CallStatus | "open" | "">("open");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [teamFilter, setTeamFilter] = useState<string>(userId);

  // Sorting
  const [sortField, setSortField] = useState<SortField>("due_date");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: callsData }, { data: clientsData }, { data: profilesData }] = await Promise.all([
        supabase
          .from("calls")
          .select("*, contact:people!contact_id(id, full_name), client:clients!client_id(id, full_name)")
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(200),
        supabase.from("clients").select("id, full_name").order("full_name"),
        supabase.from("profiles").select("id, full_name, role").order("full_name"),
      ]);
      setCalls(callsData || []);
      setClients(clientsData || []);
      setProfiles(profilesData || []);
      setLoading(false);
    }
    load();
  }, []);

  // Auto-open new call or specific call from URL params
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditingId(null);
      setForm({ ...emptyCall, user_id: userId, log_time: nowLocal() });
      setPanelOpen(true);
      router.replace("/calls", { scroll: false });
    } else if (searchParams.get("open")) {
      const callId = searchParams.get("open")!;
      const call = calls.find((c) => c.id === callId);
      if (call) {
        openEdit(call);
      }
      router.replace("/calls", { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    function handleNewCall() {
      setEditingId(null);
      setForm({ ...emptyCall, user_id: userId, log_time: nowLocal() });
      setPanelOpen(true);
    }
    window.addEventListener("new-call", handleNewCall);
    return () => window.removeEventListener("new-call", handleNewCall);
  }, [userId]);

  const clientOptions: RelationOption[] = useMemo(
    () => clients.map((c) => ({ id: c.id, label: c.full_name })),
    [clients]
  );

  const profileOptions: RelationOption[] = useMemo(
    () =>
      profiles.map((p) => ({
        id: p.id,
        label: p.full_name,
        sublabel: p.role,
      })),
    [profiles]
  );

  // Search people AND clients from DB
  const searchPeople = useCallback(
    async (query: string): Promise<RelationOption[]> => {
      const [{ data: people }, { data: clientResults }] = await Promise.all([
        supabase
          .from("people")
          .select("id, full_name, title")
          .ilike("full_name", `%${query}%`)
          .order("full_name")
          .limit(15),
        supabase
          .from("clients")
          .select("id, full_name")
          .ilike("full_name", `%${query}%`)
          .order("full_name")
          .limit(5),
      ]);

      const results: RelationOption[] = [];

      if (people) {
        setPeopleCache((prev) => {
          const next = new Map(prev);
          people.forEach((p) => next.set(p.id, p as PersonOption));
          return next;
        });
        results.push(...people.map((p) => ({ id: p.id, label: p.full_name, sublabel: p.title || undefined })));
      }

      if (clientResults) {
        setClientsCache((prev) => {
          const next = new Map(prev);
          clientResults.forEach((c) => next.set(c.id, c as ClientData));
          return next;
        });
        results.push(...clientResults.map((c) => ({ id: c.id, label: c.full_name, tag: "Client" })));
      }

      return results;
    },
    [supabase]
  );

  // Add new contact inline
  const addContact = useCallback(
    async (name: string) => {
      const parts = name.split(" ");
      const first_name = parts[0] || name;
      const last_name = parts.slice(1).join(" ") || null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", userId)
        .single();

      if (!profile?.org_id) return null;

      const { data, error } = await supabase
        .from("people")
        .insert({
          full_name: name,
          first_name,
          last_name,
          org_id: profile.org_id,
          department: [],
        })
        .select("id, full_name, title")
        .single();

      if (error || !data) return null;

      setPeopleCache((prev) => new Map(prev).set(data.id, data as PersonOption));
      return { id: data.id, label: data.full_name };
    },
    [supabase, userId]
  );

  // Fetch contact details when a contact is selected (e.g. editing existing call)
  useEffect(() => {
    if (form.contact_id && !peopleCache.has(form.contact_id)) {
      supabase
        .from("people")
        .select("id, full_name, title")
        .eq("id", form.contact_id)
        .single()
        .then(({ data }) => {
          if (data) {
            setPeopleCache((prev) => new Map(prev).set(data.id, data as PersonOption));
          }
        });
    }
  }, [form.contact_id, peopleCache, supabase]);

  // Fetch client details when a client is selected as caller
  useEffect(() => {
    if (form.contact_type === "client" && form.client_id && !clientsCache.has(form.client_id)) {
      supabase
        .from("clients")
        .select("id, full_name")
        .eq("id", form.client_id)
        .single()
        .then(({ data }) => {
          if (data) {
            setClientsCache((prev) => new Map(prev).set(data.id, data as ClientData));
          }
        });
    }
  }, [form.contact_type, form.client_id, clientsCache, supabase]);

  // Get selected contact/client data from cache
  const selectedContact = form.contact_id ? peopleCache.get(form.contact_id) || null : null;
  const selectedClient = form.contact_type === "client" && form.client_id ? clientsCache.get(form.client_id) || null : null;
  const callerRecord = form.contact_type === "client" ? selectedClient : selectedContact;

  // Fetch phone/email sub-records when caller changes
  useEffect(() => {
    const entityType = form.contact_type === "client" ? "client" : "person";
    const entityId = form.contact_type === "client" ? form.client_id : form.contact_id;
    if (!entityId) {
      setCallerPhones([]);
      setCallerEmails([]);
      setNewPhones([]);
      return;
    }
    Promise.all([
      supabase
        .from("contact_phones")
        .select("id, designation, number, is_primary")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("is_primary", { ascending: false }),
      supabase
        .from("contact_emails")
        .select("id, designation, address, is_primary")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("is_primary", { ascending: false }),
    ]).then(([{ data: phones }, { data: emails }]) => {
      setCallerPhones((phones || []) as PhoneRecord[]);
      setCallerEmails((emails || []) as EmailRecord[]);
    });
  }, [form.contact_type, form.contact_id, form.client_id, supabase]);

  // Filtered & sorted calls
  const filteredCalls = useMemo(() => {
    let list = [...calls];
    if (teamFilter) list = list.filter((c) => c.user_id === teamFilter);
    if (statusFilter === "open") list = list.filter((c) => c.call_status !== "completed");
    else if (statusFilter) list = list.filter((c) => c.call_status === statusFilter);
    if (priorityFilter) list = list.filter((c) => c.priority === priorityFilter);

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "priority") {
        const order = { high: 0, medium: 1, low: 2 };
        const aVal = a.priority ? order[a.priority] : 3;
        const bVal = b.priority ? order[b.priority] : 3;
        cmp = aVal - bVal;
      } else if (sortField === "due_date" || sortField === "log_time") {
        const aVal = a[sortField] || "";
        const bVal = b[sortField] || "";
        cmp = aVal.localeCompare(bVal);
      } else {
        cmp = (a.call_status || "").localeCompare(b.call_status || "");
      }
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [calls, statusFilter, priorityFilter, sortField, sortAsc]);

  // ─── Handlers ───────────────────────────────────

  function openNew() {
    setEditingId(null);
    setForm({ ...emptyCall, user_id: userId, log_time: nowLocal() });
    setPanelOpen(true);
  }

  function openEdit(call: CallRow) {
    setEditingId(call.id);
    // Detect contact_type: if no contact but has client, it's a client call
    const contactType = call.contact_id ? "person" as const : call.client_id ? "client" as const : null;
    setForm({
      about: call.about,
      contact_id: call.contact_id,
      client_id: call.client_id,
      contact_type: contactType,
      user_id: call.user_id,
      call_status: call.call_status,
      priority: call.priority,
      preferred_phone: call.preferred_phone,
      phone_custom: call.phone_custom,
      log_time: call.log_time,
      due_date: call.due_date,
      notes: call.notes,
    });
    setPanelOpen(true);
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  }

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        about: form.about,
        contact_id: form.contact_id,
        client_id: form.client_id,
        call_status: form.call_status,
        priority: form.priority,
        preferred_phone: form.preferred_phone === "new" ? null : form.preferred_phone,
        phone_custom: null,
        quick_connect: false,
        log_time: form.log_time || null,
        due_date: form.due_date || null,
        notes: form.notes || null,
        user_id: form.user_id || userId,
      };

      const selectQuery =
        "*, contact:people!contact_id(id, full_name), client:clients!client_id(id, full_name)";

      let savedCallId: string | null = editingId;
      if (editingId) {
        const { data, error } = await supabase
          .from("calls")
          .update(payload)
          .eq("id", editingId)
          .select(selectQuery)
          .single();
        if (error) { console.error("Update call error:", error); return; }
        if (data) {
          setCalls((prev) =>
            prev.map((c) => (c.id === editingId ? (data as CallRow) : c))
          );
        }
      } else {
        const { data, error } = await supabase
          .from("calls")
          .insert(payload)
          .select(selectQuery)
          .single();
        if (error) { console.error("Insert call error:", error); return; }
        if (data) {
          savedCallId = data.id;
          setCalls((prev) => [data as CallRow, ...prev]);
        }
      }
      // Save any new phones to the contact record
      const entityType = form.contact_type === "client" ? "client" : "person";
      const entityId = form.contact_type === "client" ? form.client_id : form.contact_id;
      const phonesToSave = newPhones.filter((p) => p.number.trim());
      if (phonesToSave.length > 0 && entityId) {
        const rows = phonesToSave.map((p, i) => ({
          entity_type: entityType,
          entity_id: entityId,
          designation: p.designation,
          number: p.number,
          is_primary: callerPhones.length === 0 && i === 0,
        }));
        const { data: inserted } = await supabase.from("contact_phones").insert(rows).select("id");
        // If the preferred phone was set to "new", link the first new phone to this call
        if (form.preferred_phone === "new" && inserted && inserted.length > 0 && savedCallId) {
          await supabase.from("calls").update({ preferred_phone: inserted[0].id, phone_custom: null }).eq("id", savedCallId);
          setForm((prev) => ({ ...prev, preferred_phone: inserted[0].id }));
        }
        // Refresh callerPhones so they show immediately
        const { data: refreshed } = await supabase
          .from("contact_phones")
          .select("id, designation, number, is_primary")
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .order("is_primary", { ascending: false });
        if (refreshed) setCallerPhones(refreshed as PhoneRecord[]);
        setNewPhones([]);
      }

      // If this was a new call, switch to editing mode so panel stays consistent
      if (!editingId && savedCallId) {
        setEditingId(savedCallId);
      }

      // Flash "Saved" briefly
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }, [form, editingId, userId, supabase, newPhones, callerPhones]);

  const handleDelete = useCallback(async () => {
    if (!editingId || !confirm("Delete this call?")) return;
    setDeleting(true);
    try {
      await supabase.from("calls").delete().eq("id", editingId);
      setCalls((prev) => prev.filter((c) => c.id !== editingId));
      setPanelOpen(false);
    } finally {
      setDeleting(false);
    }
  }, [editingId, supabase]);

  // Quick status change directly from table
  async function quickStatusChange(callId: string, newStatus: CallStatus) {
    const { data } = await supabase
      .from("calls")
      .update({ call_status: newStatus })
      .eq("id", callId)
      .select(
        "*, contact:people!contact_id(id, full_name), client:clients!client_id(id, full_name)"
      )
      .single();
    if (data) {
      setCalls((prev) =>
        prev.map((c) => (c.id === callId ? (data as CallRow) : c))
      );
    }
  }

  // ─── Bulk actions ──────────────────────────────

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filteredCalls.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredCalls.map((c) => c.id)));
    }
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selected.size} call${selected.size !== 1 ? "s" : ""}?`)) return;
    setBulkActing(true);
    try {
      const ids = Array.from(selected);
      await supabase.from("calls").delete().in("id", ids);
      setCalls((prev) => prev.filter((c) => !selected.has(c.id)));
      setSelected(new Set());
    } finally {
      setBulkActing(false);
    }
  }

  async function bulkStatusChange(newStatus: CallStatus) {
    setBulkActing(true);
    try {
      const ids = Array.from(selected);
      await supabase.from("calls").update({ call_status: newStatus }).in("id", ids);
      setCalls((prev) =>
        prev.map((c) => (selected.has(c.id) ? { ...c, call_status: newStatus } : c))
      );
      setSelected(new Set());
    } finally {
      setBulkActing(false);
    }
  }

  // ─── Phone display helper ───────────────────────

  function getPhoneDisplay(call: CallRow): string {
    if (call.preferred_phone === "custom" && call.phone_custom) return formatPhone(call.phone_custom);
    // preferred_phone now stores a phone record UUID — we can't resolve it without a fetch
    // Just show the custom number or "—" in the table; full info is in the detail panel
    if (call.phone_custom) return formatPhone(call.phone_custom);
    return "—";
  }

  // ─── Render ─────────────────────────────────────

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-zinc-400">Loading...</p></div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-black">
            Call Log
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Track and log your calls.
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Call
        </button>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Filter className="h-3.5 w-3.5" />
          Filters
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CallStatus | "open" | "")}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 outline-none hover:border-zinc-300"
        >
          <option value="open">Open</option>
          <option value="">All Statuses</option>
          {CALL_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 outline-none hover:border-zinc-300"
        >
          <option value="">All Priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 outline-none hover:border-zinc-300"
        >
          <option value={userId}>Me</option>
          <option value="">All Team</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id === userId ? `Me (${p.full_name})` : p.full_name}
            </option>
          ))}
        </select>
        {(statusFilter || priorityFilter || teamFilter) && (
          <button
            onClick={() => {
              setStatusFilter("");
              setPriorityFilter("");
              setTeamFilter("");
            }}
            className="text-xs text-zinc-400 hover:text-zinc-600"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-zinc-400">
          {filteredCalls.length} call{filteredCalls.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2">
          <span className="text-xs font-medium text-zinc-700">
            {selected.size} selected
          </span>
          <div className="h-4 w-px bg-zinc-300" />
          <select
            disabled={bulkActing}
            onChange={(e) => {
              if (e.target.value) bulkStatusChange(e.target.value as CallStatus);
              e.target.value = "";
            }}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 outline-none hover:border-zinc-300"
            defaultValue=""
          >
            <option value="" disabled>Change status...</option>
            {CALL_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={bulkDelete}
            disabled={bulkActing}
            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-zinc-400 hover:text-zinc-600"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/50">
              <th className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={filteredCalls.length > 0 && selected.size === filteredCalls.length}
                  onChange={toggleSelectAll}
                  className="accent-black"
                />
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">
                About
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">
                Contact
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">
                Re: Client
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">
                <button
                  onClick={() => toggleSort("call_status")}
                  className="inline-flex items-center gap-1 hover:text-black transition-colors"
                >
                  Status
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">
                <button
                  onClick={() => toggleSort("priority")}
                  className="inline-flex items-center gap-1 hover:text-black transition-colors"
                >
                  Priority
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">
                Phone
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">
                <button
                  onClick={() => toggleSort("due_date")}
                  className="inline-flex items-center gap-1 hover:text-black transition-colors"
                >
                  Due Date
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">
                <button
                  onClick={() => toggleSort("log_time")}
                  className="inline-flex items-center gap-1 hover:text-black transition-colors"
                >
                  Log Time
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredCalls.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-12 text-center text-sm text-zinc-400"
                >
                  <Phone className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
                  No calls found.
                </td>
              </tr>
            ) : (
              filteredCalls.map((call) => (
                <tr
                  key={call.id}
                  onClick={() => openEdit(call)}
                  className={cn(
                    "border-b border-zinc-100 last:border-0 cursor-pointer hover:bg-zinc-50/50 transition-colors",
                    selected.has(call.id) && "bg-zinc-50"
                  )}
                >
                  <td className="w-10 px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(call.id)}
                      onChange={() => toggleSelect(call.id)}
                      className="accent-black"
                    />
                  </td>
                  <td className="px-3 py-2.5 font-medium text-black whitespace-nowrap">
                    {call.about || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-700 whitespace-nowrap">
                    {call.contact?.full_name || call.client?.full_name || "—"}
                    {!call.contact_id && call.client_id && (
                      <span className="ml-1 text-[10px] text-amber-600 font-medium">Client</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-700 whitespace-nowrap">
                    {call.client?.full_name || "—"}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <StatusDropdown
                      status={call.call_status}
                      onChange={(s) => quickStatusChange(call.id, s)}
                    />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <StatusBadge status={call.priority} />
                  </td>
                  <td className="px-3 py-2.5 text-zinc-500 text-xs whitespace-nowrap">
                    {getPhoneDisplay(call)}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-500 text-xs whitespace-nowrap">
                    {call.due_date
                      ? new Date(call.due_date).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-500 text-xs whitespace-nowrap">
                    {call.log_time
                      ? new Date(call.log_time).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Panel */}
      <DetailPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editingId ? "Edit Call" : "New Call"}
        footer={
          <div className="flex items-center justify-between">
            <div>
              {editingId && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPanelOpen(false)}
                className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : saved ? "Saved ✓" : "Save"}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Contact / Client (unified picker) */}
          <Field label={
            <span className="flex items-center gap-1.5">
              Contact
              {form.contact_id && selectedContact && (
                <Link
                  href={`/contacts?open=${selectedContact.id}`}
                  className="inline-flex items-center gap-0.5 text-[11px] font-normal text-zinc-400 hover:text-black transition-colors"
                  title="View full contact record"
                  prefetch
                >
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </span>
          }>
            <RelationPicker
              value={form.contact_type === "client" ? form.client_id : form.contact_id}
              onChange={(id) => {
                if (!id) {
                  setForm({ ...form, contact_id: null, client_id: null, contact_type: null, preferred_phone: null, phone_custom: null });
                  return;
                }
                // Check if this ID is in clientsCache (i.e. it's a client)
                if (clientsCache.has(id)) {
                  setForm({ ...form, contact_id: null, client_id: id, contact_type: "client", preferred_phone: null, phone_custom: null });
                } else {
                  setForm({ ...form, contact_id: id, client_id: null, contact_type: "person", preferred_phone: null, phone_custom: null });
                }
                // Note: Re: Client auto-fill for client calls is handled separately below
              }}
              options={[]}
              onSearch={searchPeople}
              selectedLabel={
                form.contact_type === "client"
                  ? clientsCache.get(form.client_id || "")?.full_name
                  : selectedContact?.full_name
              }
              placeholder="Search contacts or clients..."
              onAdd={addContact}
              addLabel="Add contact"
            />
          </Field>

          {/* Contact/Client info card — shows when caller is selected */}
          {callerRecord && (callerPhones.length > 0 || callerEmails.length > 0) && (
            <div className="rounded-md border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 space-y-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                Contact Info
              </p>
              {callerPhones.map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-xs">
                  <span className="w-16 font-medium text-zinc-400">{p.designation}</span>
                  <span className="text-zinc-700">{formatPhone(p.number)}</span>
                  {p.is_primary && <span className="text-amber-500 text-[10px]">★</span>}
                </div>
              ))}
              {callerEmails.map((e) => (
                <div key={e.id} className="flex items-center gap-2 text-xs">
                  <span className="w-16 font-medium text-zinc-400">{e.designation}</span>
                  <span className="text-zinc-700">{e.address}</span>
                  {e.is_primary && <span className="text-amber-500 text-[10px]">★</span>}
                </div>
              ))}
            </div>
          )}

          {/* Preferred phone — shows when a contact/client is selected */}
          {(form.contact_id || (form.contact_type === "client" && form.client_id)) && (
            <Field label="Preferred Phone">
              <div className="space-y-1">
                {callerPhones.map((p) => (
                  <label
                    key={p.id}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm cursor-pointer transition-colors",
                      form.preferred_phone === p.id
                        ? "border-black bg-zinc-50"
                        : "border-zinc-200 hover:border-zinc-300"
                    )}
                  >
                    <input
                      type="radio"
                      name="phone"
                      checked={form.preferred_phone === p.id}
                      onChange={() =>
                        setForm({ ...form, preferred_phone: p.id, phone_custom: null })
                      }
                      className="accent-black"
                    />
                    <span className="text-xs font-medium text-zinc-500 w-16">
                      {p.designation}
                    </span>
                    <span className="text-xs text-black">
                      {formatPhone(p.number)}
                    </span>
                  </label>
                ))}
                {callerPhones.length === 0 && (
                  <p className="text-xs text-zinc-400">
                    No phone numbers on file.
                  </p>
                )}
                {/* New phones being added */}
                {newPhones.map((np, i) => (
                  <div key={`new-${i}`} className="flex items-center gap-2 rounded-md border border-dashed border-zinc-300 px-3 py-1.5">
                    <input
                      type="radio"
                      name="phone"
                      checked={form.preferred_phone === "new" && i === 0}
                      onChange={() => setForm({ ...form, preferred_phone: "new" })}
                      className="accent-black"
                    />
                    <select
                      value={np.designation}
                      onChange={(e) => setNewPhones((prev) => prev.map((p, j) => j === i ? { ...p, designation: e.target.value } : p))}
                      className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs outline-none"
                    >
                      {["Cell", "Office", "Home", "Assistant", "Fax", "Other"].map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <input
                      value={np.number}
                      onChange={(e) => setNewPhones((prev) => prev.map((p, j) => j === i ? { ...p, number: e.target.value } : p))}
                      placeholder="Phone number"
                      className="flex-1 rounded border border-zinc-200 bg-white px-2 py-1 text-xs outline-none"
                      autoFocus={i === newPhones.length - 1}
                    />
                    <button
                      type="button"
                      onClick={() => setNewPhones((prev) => prev.filter((_, j) => j !== i))}
                      className="text-zinc-400 hover:text-red-500 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {newPhones.length > 0 && (
                  <p className="text-[10px] text-zinc-400 px-1">New numbers will be saved to the contact record.</p>
                )}
                <button
                  type="button"
                  onClick={() => setNewPhones((prev) => [...prev, { designation: "Cell", number: "" }])}
                  className="inline-flex items-center gap-1 px-1 py-1 text-xs text-zinc-400 hover:text-black transition-colors"
                >
                  + Add Phone
                </button>
              </div>
            </Field>
          )}

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <Select
                value={form.call_status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    call_status: e.target.value as CallStatus,
                  })
                }
                options={CALL_STATUSES}
              />
            </Field>
            <Field label="Priority">
              <Select
                value={form.priority || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    priority: (e.target.value || null) as "high" | "medium" | "low" | null,
                  })
                }
                options={PRIORITIES}
                placeholder="None"
              />
            </Field>
          </div>

          {/* About */}
          <Field label="About">
            <Input
              value={form.about}
              onChange={(e) => setForm({ ...form, about: e.target.value })}
              placeholder="What is this call about?"
            />
          </Field>

          {/* Re: Client — auto-filled when a client is the caller */}
          <Field label="Re: Client">
            {form.contact_type === "client" ? (
              <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-600">
                {clientsCache.get(form.client_id || "")?.full_name || "—"}
                <span className="ml-1 text-[10px] text-zinc-400">(caller)</span>
              </div>
            ) : (
              <RelationPicker
                value={form.client_id}
                onChange={(id) => setForm({ ...form, client_id: id })}
                options={clientOptions}
                placeholder="Select client..."
              />
            )}
          </Field>

          {/* Who Makes the Call */}
          <Field label="Who Makes the Call">
            <RelationPicker
              value={form.user_id}
              onChange={(id) => setForm({ ...form, user_id: id })}
              options={profileOptions}
              placeholder="Select team member..."
            />
          </Field>

          {/* Due Date & Log Time */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Due Date">
              <Input
                type="date"
                value={form.due_date || ""}
                onChange={(e) =>
                  setForm({ ...form, due_date: e.target.value || null })
                }
              />
            </Field>
            <Field label="Log Time">
              <Input
                type="datetime-local"
                value={form.log_time?.slice(0, 16) || ""}
                onChange={(e) =>
                  setForm({ ...form, log_time: e.target.value || null })
                }
              />
            </Field>
          </div>

          {/* Notes — rich text via contentEditable */}
          <Field label="Notes">
            <div
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) =>
                setForm({
                  ...form,
                  notes: e.currentTarget.innerHTML || null,
                })
              }
              dangerouslySetInnerHTML={{ __html: form.notes || "" }}
              className="min-h-[120px] rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 transition-colors [&_b]:font-bold [&_i]:italic [&_u]:underline"
              data-placeholder="Call notes..."
            />
            <div className="mt-1 flex items-center gap-1">
              <button
                type="button"
                onClick={() => document.execCommand("bold")}
                className="rounded px-1.5 py-0.5 text-xs font-bold text-zinc-500 hover:bg-zinc-100"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => document.execCommand("italic")}
                className="rounded px-1.5 py-0.5 text-xs italic text-zinc-500 hover:bg-zinc-100"
              >
                I
              </button>
              <button
                type="button"
                onClick={() => document.execCommand("underline")}
                className="rounded px-1.5 py-0.5 text-xs underline text-zinc-500 hover:bg-zinc-100"
              >
                U
              </button>
              <button
                type="button"
                onClick={() => document.execCommand("insertUnorderedList")}
                className="rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100"
              >
                &bull; List
              </button>
            </div>
          </Field>
        </div>
      </DetailPanel>
    </div>
  );
}

// ─── Inline Status Dropdown ───────────────────────

function StatusDropdown({
  status,
  onChange,
}: {
  status: CallStatus;
  onChange: (s: CallStatus) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1"
      >
        <StatusBadge status={status} />
        <ChevronDown className="h-3 w-3 text-zinc-400" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 z-40 mt-1 w-36 rounded-md border border-zinc-200 bg-white py-1 shadow-lg">
            {(
              [
                "to_call",
                "incoming",
                "left_word",
                "returning",
                "completed",
              ] as CallStatus[]
            ).map((s) => (
              <button
                key={s}
                onClick={() => {
                  onChange(s);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-zinc-50 transition-colors"
              >
                <StatusBadge status={s} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

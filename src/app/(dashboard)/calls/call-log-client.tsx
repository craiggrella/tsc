"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Plus,
  ArrowUpDown,
  Phone,
  Filter,
  ChevronDown,
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
import { cn } from "@/lib/utils";
import type { CallStatus } from "@/types/database";

// ─── Types ──────────────────────────────────────────

interface ContactData {
  id: string;
  full_name: string;
  phone_cell: string | null;
  phone_office: string | null;
  phone_home: string | null;
  phone_other: string | null;
  preferred_phone: string | null;
}

interface ClientData {
  id: string;
  full_name: string;
}

interface PersonOption extends ContactData {
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
  initialCalls: CallRow[];
  people: PersonOption[];
  clients: ClientData[];
  userId: string;
}

// ─── Constants ──────────────────────────────────────

const CALL_STATUSES: { value: CallStatus; label: string }[] = [
  { value: "to_call", label: "To Call" },
  { value: "incoming", label: "Incoming" },
  { value: "left_word", label: "Left Word" },
  { value: "returning", label: "Returning" },
  { value: "connected", label: "Connected" },
];

const PRIORITIES = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const PHONE_OPTIONS = [
  { value: "cell", label: "Cell" },
  { value: "office", label: "Office" },
  { value: "home", label: "Home" },
  { value: "other", label: "Other" },
  { value: "custom", label: "Custom" },
];

type SortField = "due_date" | "log_time" | "priority" | "call_status";

const emptyCall = {
  about: "",
  contact_id: null as string | null,
  client_id: null as string | null,
  call_status: "to_call" as CallStatus,
  priority: null as "high" | "medium" | "low" | null,
  preferred_phone: null as string | null,
  phone_custom: null as string | null,
  quick_connect: false,
  log_time: null as string | null,
  due_date: null as string | null,
  notes: null as string | null,
};

// ─── Component ──────────────────────────────────────

export function CallLogClient({
  initialCalls,
  people,
  clients,
  userId,
}: CallLogClientProps) {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [calls, setCalls] = useState<CallRow[]>(initialCalls);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCall);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<CallStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("due_date");
  const [sortAsc, setSortAsc] = useState(true);

  // Auto-open new call from URL param or custom event
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditingId(null);
      setForm({ ...emptyCall });
      setPanelOpen(true);
      // Clean up URL
      router.replace("/calls", { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    function handleNewCall() {
      setEditingId(null);
      setForm({ ...emptyCall });
      setPanelOpen(true);
    }
    window.addEventListener("new-call", handleNewCall);
    return () => window.removeEventListener("new-call", handleNewCall);
  }, []);

  // Build relation options
  const peopleOptions: RelationOption[] = useMemo(
    () =>
      people.map((p) => ({
        id: p.id,
        label: p.full_name,
        sublabel: p.title || undefined,
      })),
    [people]
  );

  const clientOptions: RelationOption[] = useMemo(
    () => clients.map((c) => ({ id: c.id, label: c.full_name })),
    [clients]
  );

  // Get phone numbers for selected contact
  const selectedContact = useMemo(
    () => people.find((p) => p.id === form.contact_id) || null,
    [people, form.contact_id]
  );

  const contactPhones = useMemo(() => {
    if (!selectedContact) return [];
    const phones: { key: string; label: string; number: string }[] = [];
    if (selectedContact.phone_cell)
      phones.push({ key: "cell", label: "Cell", number: selectedContact.phone_cell });
    if (selectedContact.phone_office)
      phones.push({ key: "office", label: "Office", number: selectedContact.phone_office });
    if (selectedContact.phone_home)
      phones.push({ key: "home", label: "Home", number: selectedContact.phone_home });
    if (selectedContact.phone_other)
      phones.push({ key: "other", label: "Other", number: selectedContact.phone_other });
    return phones;
  }, [selectedContact]);

  // Filtered & sorted calls
  const filteredCalls = useMemo(() => {
    let list = [...calls];
    if (statusFilter) list = list.filter((c) => c.call_status === statusFilter);
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
    setForm({ ...emptyCall });
    setPanelOpen(true);
  }

  function openEdit(call: CallRow) {
    setEditingId(call.id);
    setForm({
      about: call.about,
      contact_id: call.contact_id,
      client_id: call.client_id,
      call_status: call.call_status,
      priority: call.priority,
      preferred_phone: call.preferred_phone,
      phone_custom: call.phone_custom,
      quick_connect: call.quick_connect,
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
        preferred_phone: form.preferred_phone,
        phone_custom: form.preferred_phone === "custom" ? form.phone_custom : null,
        quick_connect: form.quick_connect,
        log_time: form.log_time || null,
        due_date: form.due_date || null,
        notes: form.notes || null,
        user_id: userId,
      };

      if (editingId) {
        const { data } = await supabase
          .from("calls")
          .update(payload)
          .eq("id", editingId)
          .select(
            "*, contact:people!contact_id(id, full_name, phone_cell, phone_office, phone_home, phone_other, preferred_phone), client:clients!client_id(id, full_name)"
          )
          .single();
        if (data) {
          setCalls((prev) =>
            prev.map((c) => (c.id === editingId ? (data as CallRow) : c))
          );
        }
      } else {
        const { data } = await supabase
          .from("calls")
          .insert(payload)
          .select(
            "*, contact:people!contact_id(id, full_name, phone_cell, phone_office, phone_home, phone_other, preferred_phone), client:clients!client_id(id, full_name)"
          )
          .single();
        if (data) {
          setCalls((prev) => [data as CallRow, ...prev]);
        }
      }
      setPanelOpen(false);
    } finally {
      setSaving(false);
    }
  }, [form, editingId, userId, supabase]);

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
        "*, contact:people!contact_id(id, full_name, phone_cell, phone_office, phone_home, phone_other, preferred_phone), client:clients!client_id(id, full_name)"
      )
      .single();
    if (data) {
      setCalls((prev) =>
        prev.map((c) => (c.id === callId ? (data as CallRow) : c))
      );
    }
  }

  // ─── Phone display helper ───────────────────────

  function getPhoneDisplay(call: CallRow): string {
    if (call.preferred_phone === "custom" && call.phone_custom) return call.phone_custom;
    if (call.contact && call.preferred_phone) {
      const key = `phone_${call.preferred_phone}` as keyof ContactData;
      return (call.contact[key] as string) || "—";
    }
    return "—";
  }

  // ─── Render ─────────────────────────────────────

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
          onChange={(e) => setStatusFilter(e.target.value as CallStatus | "")}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 outline-none hover:border-zinc-300"
        >
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
        {(statusFilter || priorityFilter) && (
          <button
            onClick={() => {
              setStatusFilter("");
              setPriorityFilter("");
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

      {/* Table */}
      <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/50">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">
                About
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">
                Contact
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">
                Re: Client
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">
                <button
                  onClick={() => toggleSort("call_status")}
                  className="inline-flex items-center gap-1 hover:text-black transition-colors"
                >
                  Status
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">
                <button
                  onClick={() => toggleSort("priority")}
                  className="inline-flex items-center gap-1 hover:text-black transition-colors"
                >
                  Priority
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">
                Phone
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">
                <button
                  onClick={() => toggleSort("due_date")}
                  className="inline-flex items-center gap-1 hover:text-black transition-colors"
                >
                  Due Date
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">
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
                  colSpan={8}
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
                  className="border-b border-zinc-100 last:border-0 cursor-pointer hover:bg-zinc-50/50 transition-colors"
                >
                  <td className="px-3 py-2.5 font-medium text-black max-w-[200px] truncate">
                    {call.about || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-700">
                    {call.contact?.full_name || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-700">
                    {call.client?.full_name || "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusDropdown
                      status={call.call_status}
                      onChange={(s) => quickStatusChange(call.id, s)}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={call.priority} />
                  </td>
                  <td className="px-3 py-2.5 text-zinc-500 text-xs font-mono">
                    {getPhoneDisplay(call)}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-500 text-xs">
                    {call.due_date
                      ? new Date(call.due_date).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-500 text-xs">
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
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="About">
            <Input
              value={form.about}
              onChange={(e) => setForm({ ...form, about: e.target.value })}
              placeholder="What is this call about?"
            />
          </Field>

          <Field label="Contact">
            <RelationPicker
              value={form.contact_id}
              onChange={(id) =>
                setForm({
                  ...form,
                  contact_id: id,
                  preferred_phone: null,
                  phone_custom: null,
                })
              }
              options={peopleOptions}
              placeholder="Select contact..."
            />
          </Field>

          {/* Phone section — shows when contact is selected */}
          {form.contact_id && (
            <Field label="Phone">
              <div className="space-y-2">
                {contactPhones.length > 0 ? (
                  <div className="space-y-1">
                    {contactPhones.map((p) => (
                      <label
                        key={p.key}
                        className={cn(
                          "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm cursor-pointer transition-colors",
                          form.preferred_phone === p.key
                            ? "border-black bg-zinc-50"
                            : "border-zinc-200 hover:border-zinc-300"
                        )}
                      >
                        <input
                          type="radio"
                          name="phone"
                          checked={form.preferred_phone === p.key}
                          onChange={() =>
                            setForm({ ...form, preferred_phone: p.key })
                          }
                          className="accent-black"
                        />
                        <span className="text-xs font-medium text-zinc-500 w-12">
                          {p.label}
                        </span>
                        <span className="font-mono text-xs text-black">
                          {p.number}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400">
                    No phone numbers on file for this contact.
                  </p>
                )}
                <label
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm cursor-pointer transition-colors",
                    form.preferred_phone === "custom"
                      ? "border-black bg-zinc-50"
                      : "border-zinc-200 hover:border-zinc-300"
                  )}
                >
                  <input
                    type="radio"
                    name="phone"
                    checked={form.preferred_phone === "custom"}
                    onChange={() =>
                      setForm({ ...form, preferred_phone: "custom" })
                    }
                    className="accent-black"
                  />
                  <span className="text-xs font-medium text-zinc-500 w-12">
                    Custom
                  </span>
                  {form.preferred_phone === "custom" && (
                    <input
                      value={form.phone_custom || ""}
                      onChange={(e) =>
                        setForm({ ...form, phone_custom: e.target.value })
                      }
                      placeholder="Enter number..."
                      className="flex-1 bg-transparent text-xs font-mono outline-none placeholder:text-zinc-400"
                    />
                  )}
                </label>
              </div>
            </Field>
          )}

          <Field label="Re: Client">
            <RelationPicker
              value={form.client_id}
              onChange={(id) => setForm({ ...form, client_id: id })}
              options={clientOptions}
              placeholder="Select client..."
            />
          </Field>

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

          <Field label="Quick Connect">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.quick_connect}
                onChange={(e) =>
                  setForm({ ...form, quick_connect: e.target.checked })
                }
                className="accent-black"
              />
              <span className="text-sm text-zinc-600">
                Mark as quick connect
              </span>
            </label>
          </Field>

          <Field label="Notes">
            <Textarea
              value={form.notes || ""}
              onChange={(e) =>
                setForm({ ...form, notes: e.target.value || null })
              }
              placeholder="Call notes..."
            />
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
                "connected",
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

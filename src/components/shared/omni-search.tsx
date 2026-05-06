"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface SearchResult {
  id: string;
  label: string;
  type: string;
  url: string;
}

const TYPE_LABELS: Record<string, string> = {
  person: "Contact",
  client: "Client",
  project: "Project",
  meeting: "Meeting",
  submission: "Submission",
  call: "Call",
  material: "Material",
  contract: "Contract",
};

const TYPE_COLORS: Record<string, string> = {
  person: "bg-blue-50 text-blue-700",
  client: "bg-amber-50 text-amber-700",
  project: "bg-purple-50 text-purple-700",
  meeting: "bg-emerald-50 text-emerald-700",
  submission: "bg-orange-50 text-orange-700",
  call: "bg-zinc-100 text-zinc-700",
  material: "bg-pink-50 text-pink-700",
  contract: "bg-indigo-50 text-indigo-700",
};

export function OmniSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const supabase = createClient();
  const router = useRouter();

  // Open/close with Cmd+F / Ctrl+F
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Search across all tables
  const doSearch = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const pattern = `%${q}%`;
        const [people, clients, projects, meetings, submissions, calls, materials, contracts] =
          await Promise.all([
            supabase
              .from("people")
              .select("id, full_name")
              .ilike("full_name", pattern)
              .limit(5),
            supabase
              .from("clients")
              .select("id, full_name")
              .ilike("full_name", pattern)
              .limit(5),
            supabase
              .from("projects")
              .select("id, name")
              .ilike("name", pattern)
              .limit(5),
            supabase
              .from("meetings")
              .select("id, title")
              .ilike("title", pattern)
              .limit(5),
            supabase
              .from("submissions")
              .select("id, description")
              .ilike("description", pattern)
              .limit(5),
            supabase
              .from("calls")
              .select("id, about, contact:people!contact_id(full_name)")
              .ilike("about", pattern)
              .limit(5),
            supabase
              .from("client_materials")
              .select("id, title")
              .ilike("title", pattern)
              .limit(5),
            supabase
              .from("contracts")
              .select("id, contract_name, client_id, client:clients!client_id(full_name)")
              .ilike("contract_name", pattern)
              .limit(5),
          ]);

        // Also find calls by contact name (people results → their calls)
        const personIds = (people.data || []).map((r) => r.id);
        let callsByContact: { id: string; about: string; contact: { full_name: string } | null }[] = [];
        if (personIds.length > 0) {
          const { data: cbc } = await supabase
            .from("calls")
            .select("id, about, contact:people!contact_id(full_name)")
            .in("contact_id", personIds)
            .limit(5);
          callsByContact = (cbc || []) as unknown as typeof callsByContact;
        }

        const all: SearchResult[] = [
          ...(people.data || []).map((r) => ({
            id: r.id,
            label: r.full_name,
            type: "person",
            url: `/contacts?open=${r.id}`,
          })),
          ...(clients.data || []).map((r) => ({
            id: r.id,
            label: r.full_name,
            type: "client",
            url: `/clients`, // clients don't have ?open yet
          })),
          ...(projects.data || []).map((r) => ({
            id: r.id,
            label: r.name,
            type: "project",
            url: `/projects`,
          })),
          ...(meetings.data || []).map((r) => ({
            id: r.id,
            label: r.title,
            type: "meeting",
            url: `/meetings?open=${r.id}`,
          })),
          ...(submissions.data || []).map((r) => ({
            id: r.id,
            label: r.description,
            type: "submission",
            url: `/submissions`,
          })),
          ...(calls.data || []).map((r) => {
            const contact = (r as unknown as { contact: { full_name: string } | null }).contact;
            return {
              id: r.id,
              label: contact ? `${contact.full_name} — ${r.about}` : r.about,
              type: "call",
              url: `/calls?open=${r.id}`,
            };
          }),
          // Calls found by contact name (dedupe with calls already found by about)
          ...callsByContact
            .filter((c) => !(calls.data || []).some((existing) => existing.id === c.id))
            .map((r) => ({
              id: r.id,
              label: r.contact ? `${r.contact.full_name} — ${r.about}` : r.about,
              type: "call",
              url: `/calls?open=${r.id}`,
            })),
          ...(materials.data || []).map((r) => ({
            id: r.id,
            label: r.title,
            type: "material",
            url: `/materials`,
          })),
          ...(contracts.data || []).map((r) => {
            const client = (r as unknown as { client: { full_name: string } | null }).client;
            const clientName = client?.full_name || "—";
            return {
              id: r.id,
              label: `${clientName} — ${r.contract_name || "Contract"}`,
              type: "contract",
              url: `/clients/${r.client_id}?tab=contracts`,
            };
          }),
        ];

        setResults(all);
        setSelectedIndex(0);
      } finally {
        setSearching(false);
      }
    },
    [supabase]
  );

  // Debounced search
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    if (query.length < 2) {
      setResults([]);
      return;
    }
    searchTimeout.current = setTimeout(() => doSearch(query), 200);
    return () => clearTimeout(searchTimeout.current);
  }, [query, doSearch]);

  function navigate(result: SearchResult) {
    setOpen(false);
    router.push(result.url);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      navigate(results[selectedIndex]);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-400 hover:border-zinc-300 hover:text-zinc-600 transition-colors"
        title="Search (⌘K)"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline rounded bg-zinc-100 px-1.5 py-0.5 text-2xs font-normal text-zinc-400">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/20"
        onClick={() => setOpen(false)}
      />

      {/* Search modal */}
      <div className="fixed left-1/2 top-[15%] z-50 w-full max-w-lg -translate-x-1/2">
        <div className="rounded-xl border border-zinc-200 bg-white shadow-2xl">
          {/* Input */}
          <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
            <Search className="h-4 w-4 text-zinc-400 flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search contacts, clients, projects, meetings..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
            />
            <button
              onClick={() => setOpen(false)}
              className="text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {searching && (
              <p className="px-4 py-3 text-xs text-zinc-400">Searching...</p>
            )}
            {!searching && query.length >= 2 && results.length === 0 && (
              <p className="px-4 py-3 text-xs text-zinc-400">No results found.</p>
            )}
            {!searching && query.length < 2 && query.length > 0 && (
              <p className="px-4 py-3 text-xs text-zinc-400">
                Type at least 2 characters...
              </p>
            )}
            {results.length > 0 && (
              <div className="py-1">
                {results.map((result, i) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => navigate(result)}
                    className={`flex w-full items-center justify-between px-4 py-2 text-sm transition-colors ${
                      i === selectedIndex
                        ? "bg-zinc-50"
                        : "hover:bg-zinc-50"
                    }`}
                  >
                    <span className="text-black truncate mr-3">
                      {result.label}
                    </span>
                    <span
                      className={`flex-shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium ${
                        TYPE_COLORS[result.type] || "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {TYPE_LABELS[result.type] || result.type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="border-t border-zinc-100 px-4 py-2 flex items-center gap-3 text-2xs text-zinc-400">
            <span>↑↓ Navigate</span>
            <span>↵ Open</span>
            <span>ESC Close</span>
          </div>
        </div>
      </div>
    </>
  );
}

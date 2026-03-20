"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Grid3X3, Users, UserCheck, UserX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const BUYER_TYPES = ["Pod", "Studio", "Network", "Streamer", "Production Company", "Other"] as const;

type BuyerType = (typeof BUYER_TYPES)[number];

const BUYER_TYPE_COLORS: Record<BuyerType, string> = {
  Pod: "bg-purple-50 text-purple-700 border-purple-200",
  Studio: "bg-blue-50 text-blue-700 border-blue-200",
  Network: "bg-amber-50 text-amber-700 border-amber-200",
  Streamer: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Production Company": "bg-orange-50 text-orange-700 border-orange-200",
  Other: "bg-zinc-50 text-zinc-500 border-zinc-200",
};

interface Buyer {
  id: string;
  full_name: string;
  title: string | null;
  buyer_type: BuyerType;
  company: { id: string; name: string } | null;
}

interface Client {
  id: string;
  name: string;
}

interface MetClient {
  clientId: string;
  clientName: string;
  meetingCount: number;
  lastMeetingDate: string | null;
}

interface GridClientProps {
  userId: string;
}

export function GridClient({ userId }: GridClientProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<BuyerType | "All">("All");
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);
  const [metClients, setMetClients] = useState<MetClient[]>([]);
  const [relationLoading, setRelationLoading] = useState(false);

  // Load buyers and clients on mount
  useEffect(() => {
    async function load() {
      const [{ data: buyersData }, { data: clientsData }] = await Promise.all([
        supabase
          .from("people")
          .select("id, full_name, title, buyer_type, company:companies!company_id(id, name)")
          .not("buyer_type", "is", null)
          .order("full_name"),
        supabase.from("clients").select("id, name").order("name"),
      ]);
      const mapped = (buyersData || []).map((b: Record<string, unknown>) => ({
        ...b,
        company: Array.isArray(b.company) ? b.company[0] || null : b.company || null,
      }));
      setBuyers(mapped as Buyer[]);
      setClients((clientsData as Client[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  // Filter buyers by search and type
  const filteredBuyers = useMemo(() => {
    return buyers.filter((b) => {
      const matchesSearch =
        !search ||
        b.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (b.company?.name || "").toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "All" || b.buyer_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [buyers, search, typeFilter]);

  // When a buyer is selected, fetch meeting/submission relationships
  async function selectBuyer(buyer: Buyer) {
    setSelectedBuyer(buyer);
    setRelationLoading(true);
    setMetClients([]);

    try {
      // Get all meeting IDs this buyer attended
      const { data: buyerMeetings } = await supabase
        .from("meeting_people")
        .select("meeting_id")
        .eq("person_id", buyer.id);

      const meetingIds = (buyerMeetings || []).map((m) => m.meeting_id);

      // Get clients on those meetings (with meeting dates)
      let meetingClientMap: Record<string, { count: number; lastDate: string | null }> = {};
      if (meetingIds.length > 0) {
        const { data: meetingClients } = await supabase
          .from("meeting_clients")
          .select("client_id, meeting:meetings(meeting_at)")
          .in("meeting_id", meetingIds);

        for (const mc of meetingClients || []) {
          const cid = mc.client_id;
          const meetingRaw = mc.meeting as unknown;
          const meetingObj = Array.isArray(meetingRaw) ? meetingRaw[0] : meetingRaw;
          const meetingAt = (meetingObj as { meeting_at: string | null } | null)?.meeting_at || null;
          if (!meetingClientMap[cid]) {
            meetingClientMap[cid] = { count: 0, lastDate: null };
          }
          meetingClientMap[cid].count++;
          if (meetingAt && (!meetingClientMap[cid].lastDate || meetingAt > meetingClientMap[cid].lastDate!)) {
            meetingClientMap[cid].lastDate = meetingAt;
          }
        }
      }

      // Also check submissions
      const { data: buyerSubs } = await supabase
        .from("submission_people")
        .select("submission_id")
        .eq("person_id", buyer.id);

      const subIds = (buyerSubs || []).map((s) => s.submission_id);
      if (subIds.length > 0) {
        const { data: subClients } = await supabase
          .from("submission_clients")
          .select("client_id")
          .in("submission_id", subIds);

        for (const sc of subClients || []) {
          if (!meetingClientMap[sc.client_id]) {
            meetingClientMap[sc.client_id] = { count: 0, lastDate: null };
          }
          // Count submissions as interactions too
          meetingClientMap[sc.client_id].count++;
        }
      }

      // Build met clients list
      const met: MetClient[] = [];
      for (const [clientId, info] of Object.entries(meetingClientMap)) {
        const client = clients.find((c) => c.id === clientId);
        if (client) {
          met.push({
            clientId,
            clientName: client.name,
            meetingCount: info.count,
            lastMeetingDate: info.lastDate,
          });
        }
      }
      met.sort((a, b) => a.clientName.localeCompare(b.clientName));
      setMetClients(met);
    } finally {
      setRelationLoading(false);
    }
  }

  // Not-met clients
  const notMetClients = useMemo(() => {
    if (!selectedBuyer) return [];
    const metIds = new Set(metClients.map((m) => m.clientId));
    return clients.filter((c) => !metIds.has(c.id));
  }, [selectedBuyer, metClients, clients]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-zinc-400">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-black">Buyer Grid</h1>
          <p className="mt-1 text-sm text-zinc-500">
            See which clients have met with which buyers.
          </p>
        </div>
        <span className="text-xs text-zinc-400">
          {buyers.length} buyer{buyers.length !== 1 ? "s" : ""} &middot; {clients.length} client{clients.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Search + filter */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search buyers..."
            className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-sm outline-none placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-400 transition-colors"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as BuyerType | "All")}
          className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-600 outline-none hover:border-zinc-300 focus:border-zinc-400 transition-colors"
        >
          <option value="All">All Types</option>
          {BUYER_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Buyer list */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-zinc-200 overflow-hidden">
            <div className="bg-zinc-50/50 border-b border-zinc-200 px-3 py-2">
              <p className="text-xs font-medium text-zinc-500">
                {filteredBuyers.length} buyer{filteredBuyers.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="max-h-[600px] overflow-y-auto divide-y divide-zinc-100">
              {filteredBuyers.length === 0 ? (
                <div className="px-3 py-12 text-center">
                  <Grid3X3 className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
                  <p className="text-sm text-zinc-400">No buyers match your filters.</p>
                </div>
              ) : (
                filteredBuyers.map((buyer) => (
                  <button
                    key={buyer.id}
                    onClick={() => selectBuyer(buyer)}
                    className={`w-full text-left px-3 py-2.5 hover:bg-zinc-50/50 transition-colors ${
                      selectedBuyer?.id === buyer.id ? "bg-zinc-100" : ""
                    }`}
                  >
                    <p className="text-sm font-medium text-black">{buyer.full_name}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      {buyer.company && (
                        <p className="text-xs text-zinc-500">{buyer.company.name}</p>
                      )}
                      {buyer.title && (
                        <p className="text-xs text-zinc-400">{buyer.title}</p>
                      )}
                    </div>
                    <span
                      className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        BUYER_TYPE_COLORS[buyer.buyer_type]
                      }`}
                    >
                      {buyer.buyer_type}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Selected buyer detail */}
        <div className="lg:col-span-2">
          {!selectedBuyer ? (
            <div className="flex items-center justify-center rounded-lg border border-zinc-200 py-20">
              <div className="text-center">
                <Users className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
                <p className="text-sm text-zinc-400">Select a buyer to see their client relationships.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header card */}
              <div className="rounded-lg border border-zinc-200 px-4 py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-black">{selectedBuyer.full_name}</h2>
                    <div className="mt-0.5 flex items-center gap-2 text-sm text-zinc-500">
                      {selectedBuyer.company && <span>{selectedBuyer.company.name}</span>}
                      {selectedBuyer.company && selectedBuyer.title && <span>&middot;</span>}
                      {selectedBuyer.title && <span>{selectedBuyer.title}</span>}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                      BUYER_TYPE_COLORS[selectedBuyer.buyer_type]
                    }`}
                  >
                    {selectedBuyer.buyer_type}
                  </span>
                </div>
              </div>

              {relationLoading ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-zinc-400">Loading relationships...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Met With */}
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 overflow-hidden">
                    <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50/50 px-3 py-2">
                      <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                      <p className="text-xs font-medium text-emerald-700">
                        Met With ({metClients.length})
                      </p>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto divide-y divide-emerald-100">
                      {metClients.length === 0 ? (
                        <p className="px-3 py-6 text-center text-sm text-zinc-400">
                          No client meetings found.
                        </p>
                      ) : (
                        metClients.map((mc) => (
                          <div key={mc.clientId} className="px-3 py-2">
                            <p className="text-sm font-medium text-black">{mc.clientName}</p>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                              <span>
                                {mc.meetingCount} interaction{mc.meetingCount !== 1 ? "s" : ""}
                              </span>
                              {mc.lastMeetingDate && (
                                <>
                                  <span>&middot;</span>
                                  <span>Last: {new Date(mc.lastMeetingDate).toLocaleDateString()}</span>
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Not Met With */}
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50/30 overflow-hidden">
                    <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50/50 px-3 py-2">
                      <UserX className="h-3.5 w-3.5 text-zinc-500" />
                      <p className="text-xs font-medium text-zinc-500">
                        Not Met With ({notMetClients.length})
                      </p>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto divide-y divide-zinc-100">
                      {notMetClients.length === 0 ? (
                        <p className="px-3 py-6 text-center text-sm text-zinc-400">
                          Has met with all clients.
                        </p>
                      ) : (
                        notMetClients.map((c) => (
                          <div key={c.id} className="px-3 py-2">
                            <p className="text-sm text-zinc-600">{c.name}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, Send, Contact, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/shared/status-badge";

const navCards = [
  { label: "Meetings", href: "/meetings", icon: Calendar },
  { label: "Submissions", href: "/submissions", icon: Send },
  { label: "Contacts", href: "/contacts", icon: Contact },
  { label: "Buyers", href: "/contacts?has_buyer_type=true", icon: Users },
];

interface DashboardClientProps {
  userId: string;
}

interface RecentCall {
  id: string;
  call_status: string;
  log_time: string | null;
  contact_id: string | null;
  contact: { full_name: string } | null;
  client: { full_name: string } | null;
}

interface UpcomingMeeting {
  id: string;
  title: string;
  meeting_status: string;
  meeting_at: string | null;
}

export function DashboardClient({ userId }: DashboardClientProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<UpcomingMeeting[]>([]);
  const [callPhones, setCallPhones] = useState<Record<string, string>>({});
  const [callEmails, setCallEmails] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      const now = new Date();
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
      const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

      const [{ data: profile }, { data: calls }, { data: meetings }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", userId).single(),
        supabase
          .from("calls")
          .select("id, call_status, log_time, contact_id, contact:people!contact_id(full_name), client:clients!client_id(full_name)")
          .gte("log_time", fiveDaysAgo)
          .order("log_time", { ascending: false })
          .limit(10),
        supabase
          .from("meetings")
          .select("id, title, meeting_status, meeting_at")
          .gte("meeting_at", now.toISOString())
          .lte("meeting_at", twoWeeksOut)
          .order("meeting_at", { ascending: true })
          .limit(10),
      ]);

      setFirstName(profile?.full_name?.split(" ")[0] || "");
      const typedCalls = (calls || []) as unknown as RecentCall[];
      setRecentCalls(typedCalls);
      setUpcomingMeetings(meetings || []);

      // Fetch primary phone + email for call contacts
      const contactIds = [...new Set(typedCalls.map((c) => c.contact_id).filter(Boolean) as string[])];
      if (contactIds.length > 0) {
        const [{ data: phones }, { data: emails }] = await Promise.all([
          supabase.from("contact_phones").select("entity_id, number, is_primary").eq("entity_type", "person").in("entity_id", contactIds).order("is_primary", { ascending: false }),
          supabase.from("contact_emails").select("entity_id, address, is_primary").eq("entity_type", "person").in("entity_id", contactIds).order("is_primary", { ascending: false }),
        ]);
        const pm: Record<string, string> = {};
        for (const p of phones || []) { if (!pm[p.entity_id]) pm[p.entity_id] = p.number; }
        setCallPhones(pm);
        const em: Record<string, string> = {};
        for (const e of emails || []) { if (!em[e.entity_id]) em[e.entity_id] = e.address; }
        setCallEmails(em);
      }

      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-zinc-400">Loading...</p></div>;

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-black">Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Welcome back{firstName ? `, ${firstName}` : ""}.
      </p>

      {/* Nav cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {navCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="group flex flex-col items-center gap-2 rounded-lg border border-zinc-200 px-3 py-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
          >
            <card.icon className="h-5 w-5 text-zinc-400 group-hover:text-black transition-colors" />
            <p className="text-xs font-medium text-zinc-500 group-hover:text-black transition-colors">
              {card.label}
            </p>
          </Link>
        ))}
      </div>

      {/* Two column layout: Meetings left, Calls right */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Upcoming Meetings */}
        <div className="rounded-lg border border-zinc-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-black">Upcoming Meetings</h2>
            <Link href="/meetings" className="text-xs text-zinc-400 hover:text-black transition-colors">
              View All →
            </Link>
          </div>
          <div className="divide-y divide-zinc-100">
            {upcomingMeetings.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-zinc-400">No upcoming meetings.</p>
            ) : (
              upcomingMeetings.map((m) => (
                <Link
                  key={m.id}
                  href={`/meetings/${m.id}`}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-50 transition-colors"
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="text-sm font-medium text-black truncate">{m.title}</p>
                    <p className="text-xs text-zinc-500">
                      {m.meeting_at
                        ? new Date(m.meeting_at).toLocaleString([], {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "No date"}
                    </p>
                  </div>
                  <StatusBadge status={m.meeting_status} />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Right: Recent Calls */}
        <div className="rounded-lg border border-zinc-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-black">Recent Calls</h2>
            <Link href="/calls" className="text-xs text-zinc-400 hover:text-black transition-colors">
              View All →
            </Link>
          </div>
          <div className="divide-y divide-zinc-100">
            {recentCalls.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-zinc-400">No recent calls.</p>
            ) : (
              recentCalls.map((c) => (
                <Link
                  key={c.id}
                  href={`/calls?open=${c.id}`}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-50 transition-colors"
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="text-sm font-medium text-black truncate">
                      {c.contact?.full_name || "Unknown"}
                      {c.client?.full_name ? ` · ${c.client.full_name}` : ""}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      {c.contact_id && callPhones[c.contact_id] && (
                        <span>{callPhones[c.contact_id]}</span>
                      )}
                      {c.contact_id && callEmails[c.contact_id] && (
                        <span>{callEmails[c.contact_id]}</span>
                      )}
                      {c.log_time && (
                        <span>
                          {new Date(c.log_time).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={c.call_status} />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

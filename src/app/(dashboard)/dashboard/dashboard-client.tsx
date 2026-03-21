"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/shared/status-badge";

const navCards = [
  {
    label: "Submissions",
    href: "/submissions",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-black">
        <path d="M4 24l40-18-18 40-4-18Z" />
        <path d="M44 6L22 28" />
      </svg>
    ),
  },
  {
    label: "Clients",
    href: "/clients",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-black">
        <path d="M24 4l6.2 12.6L44 18.5l-10 9.7 2.4 13.8L24 35.6 11.6 42l2.4-13.8-10-9.7 13.8-1.9Z" />
      </svg>
    ),
  },
  {
    label: "Contacts",
    href: "/contacts",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-black">
        <circle cx="24" cy="14" r="6" />
        <path d="M14 38c0-5.523 4.477-10 10-10s10 4.477 10 10" />
        <circle cx="10" cy="18" r="4.5" />
        <path d="M2 38c0-4.418 3.582-8 8-8 1.5 0 2.9.4 4.1 1.1" />
        <circle cx="38" cy="18" r="4.5" />
        <path d="M46 38c0-4.418-3.582-8-8-8-1.5 0-2.9.4-4.1 1.1" />
      </svg>
    ),
  },
  {
    label: "Projects",
    href: "/projects",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-black">
        <rect x="4" y="8" width="40" height="28" rx="3" />
        <path d="M4 16h40" />
        <circle cx="24" cy="30" r="5" />
        <path d="M24 27v3l2 1.5" />
      </svg>
    ),
  },
];

interface DashboardClientProps {
  userId: string;
}

interface RecentCall {
  id: string;
  call_status: string;
  priority: string | null;
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
  location_link: string | null;
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
      const [{ data: profile }, { data: calls }, { data: meetings }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", userId).single(),
        supabase
          .from("calls")
          .select("id, call_status, priority, log_time, contact_id, contact:people!contact_id(full_name), client:clients!client_id(full_name)")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("meetings")
          .select("id, title, meeting_status, meeting_at, location_link")
          .eq("meeting_status", "scheduled")
          .order("meeting_at", { ascending: true })
          .limit(5),
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
      <h1 className="text-xl font-semibold tracking-tight text-black">
        Dashboard
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Welcome back{firstName ? `, ${firstName}` : ""}.
      </p>

      {/* Nav cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {navCards.map((card) => (
          <a
            key={card.label}
            href={card.href}
            className="group flex flex-col items-center gap-2 rounded-lg border border-zinc-200 px-3 py-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
          >
            <div className="transition-colors group-hover:text-zinc-600">
              {card.icon}
            </div>
            <p className="text-xs font-medium text-zinc-500 group-hover:text-black transition-colors">
              {card.label}
            </p>
          </a>
        ))}
      </div>

      {/* Recent Calls */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-black">Recent Calls</h2>
          <Link
            href="/calls"
            className="text-xs text-zinc-400 hover:text-black transition-colors"
          >
            View Full Call Log →
          </Link>
        </div>
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/50">
                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">Contact</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">Client</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">Phone</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">Email</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">Date/Time</th>
              </tr>
            </thead>
            <tbody>
              {recentCalls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-xs text-zinc-400">
                    No calls yet.
                  </td>
                </tr>
              ) : (
                recentCalls.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-3 py-2 text-zinc-700 text-xs">
                      {c.contact?.full_name || "—"}
                    </td>
                    <td className="px-3 py-2 text-zinc-600 text-xs">
                      {c.client?.full_name || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={c.call_status} />
                    </td>
                    <td className="px-3 py-2 text-zinc-500 text-xs">
                      {c.contact_id && callPhones[c.contact_id] ? callPhones[c.contact_id] : "—"}
                    </td>
                    <td className="px-3 py-2 text-zinc-500 text-xs">
                      {c.contact_id && callEmails[c.contact_id] ? callEmails[c.contact_id] : "—"}
                    </td>
                    <td className="px-3 py-2 text-zinc-500 text-xs">
                      {c.log_time
                        ? new Date(c.log_time).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming Meetings */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-black">Upcoming Meetings</h2>
          <Link
            href="/meetings"
            className="text-xs text-zinc-400 hover:text-black transition-colors"
          >
            View All Meetings →
          </Link>
        </div>
        <div className="space-y-2">
          {upcomingMeetings.length === 0 ? (
            <p className="rounded-lg border border-zinc-200 px-3 py-6 text-center text-xs text-zinc-400">
              No upcoming meetings.
            </p>
          ) : (
            upcomingMeetings.map((m) => (
              <Link
                key={m.id}
                href="/meetings"
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-black">{m.title}</p>
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
                    {m.location_link ? ` · ${m.location_link}` : ""}
                  </p>
                </div>
                <StatusBadge status={m.meeting_status} />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

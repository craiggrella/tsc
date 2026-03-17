export const revalidate = 30;

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MeetingsClient } from "./meetings-client";

export default async function MeetingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch meetings with join table data
  const { data: meetings } = await supabase
    .from("meetings")
    .select("*")
    .order("meeting_at", { ascending: true, nullsFirst: false });

  // For each meeting, we'll load relations client-side on panel open
  const [{ data: clients }, { data: people }, { data: projects }, { data: profiles }] =
    await Promise.all([
      supabase.from("clients").select("id, full_name").order("full_name"),
      supabase.from("people").select("id, full_name").order("full_name"),
      supabase.from("projects").select("id, name").order("name"),
      supabase.from("profiles").select("id, full_name, role").order("full_name"),
    ]);

  return (
    <MeetingsClient
      initialMeetings={meetings || []}
      clients={clients || []}
      people={people || []}
      projects={projects || []}
      profiles={profiles || []}
    />
  );
}

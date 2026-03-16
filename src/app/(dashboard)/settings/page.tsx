export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: teamMembers } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, avatar_url")
    .order("full_name");

  return (
    <SettingsClient
      profile={profile}
      userEmail={user.email || ""}
      teamMembers={teamMembers || []}
    />
  );
}

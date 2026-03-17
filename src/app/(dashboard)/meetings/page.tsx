import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MeetingsClient } from "./meetings-client";

export default async function MeetingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <MeetingsClient userId={user.id} />;
}

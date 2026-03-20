import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NewMeeting } from "./new-meeting";

export default async function NewMeetingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <NewMeeting userId={user.id} />;
}

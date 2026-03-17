import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CallLogClient } from "./call-log-client";

export default async function CallsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <CallLogClient userId={user.id} />;
}

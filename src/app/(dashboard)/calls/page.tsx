export const revalidate = 30;

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CallLogClient } from "./call-log-client";

export default async function CallsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch all data in parallel for speed
  const [{ data: calls }, { data: clients }, { data: profiles }] = await Promise.all([
    supabase
      .from("calls")
      .select("*, contact:people!contact_id(id, full_name), client:clients!client_id(id, full_name)")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(200),
    supabase.from("clients").select("id, full_name").order("full_name"),
    supabase.from("profiles").select("id, full_name, role").order("full_name"),
  ]);

  return (
    <CallLogClient
      initialCalls={calls || []}
      clients={clients || []}
      profiles={profiles || []}
      userId={user.id}
    />
  );
}

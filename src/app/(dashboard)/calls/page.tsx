export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CallLogClient } from "./call-log-client";

export default async function CallsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch calls with related contact and client names
  const { data: calls } = await supabase
    .from("calls")
    .select(
      "*, contact:people!contact_id(id, full_name, phone_cell, phone_office, phone_home, phone_other, preferred_phone, email_office, email_home, preferred_email), client:clients!client_id(id, full_name, phone_cell, phone_office, phone_home, phone_other, preferred_phone, email_office, email_home, preferred_email)"
    )
    .order("due_date", { ascending: true, nullsFirst: false });

  // Fetch clients and team members (small tables — load all)
  // People are loaded on-demand via client-side search in the RelationPicker
  const [{ data: clients }, { data: profiles }] = await Promise.all([
    supabase.from("clients").select("id, full_name, phone_cell, phone_office, phone_home, phone_other, preferred_phone, email_office, email_home, preferred_email").order("full_name"),
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .order("full_name"),
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

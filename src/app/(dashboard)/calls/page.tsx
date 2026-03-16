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
      "*, contact:people!contact_id(id, full_name, phone_cell, phone_office, phone_home, phone_other, preferred_phone), client:clients!client_id(id, full_name)"
    )
    .order("due_date", { ascending: true, nullsFirst: false });

  // Fetch people and clients for relation pickers
  const [{ data: people }, { data: clients }] = await Promise.all([
    supabase
      .from("people")
      .select("id, full_name, title, phone_cell, phone_office, phone_home, phone_other, preferred_phone")
      .order("full_name"),
    supabase.from("clients").select("id, full_name").order("full_name"),
  ]);

  return (
    <CallLogClient
      initialCalls={calls || []}
      people={people || []}
      clients={clients || []}
      userId={user.id}
    />
  );
}

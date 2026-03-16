export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ContactsClient } from "./contacts-client";

export default async function ContactsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: contacts }, { data: companies }] = await Promise.all([
    supabase
      .from("people")
      .select("*, company:companies!company_id(id, name)")
      .order("full_name"),
    supabase.from("companies").select("id, name").order("name"),
  ]);

  return (
    <ContactsClient
      initialContacts={contacts || []}
      companies={companies || []}
    />
  );
}

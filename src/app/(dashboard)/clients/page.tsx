export const revalidate = 30;

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClientsClient } from "./clients-client";

export default async function ClientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: clients }, { data: companies }] = await Promise.all([
    supabase
      .from("clients")
      .select("*, company:companies!company_id(id, name)")
      .order("full_name"),
    supabase.from("companies").select("id, name").order("name"),
  ]);

  return (
    <ClientsClient
      initialClients={clients || []}
      companies={companies || []}
    />
  );
}

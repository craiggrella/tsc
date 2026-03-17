import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ContactsClient } from "./contacts-client";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  return <ContactsClient userId={user.id} openContactId={params.open || null} />;
}

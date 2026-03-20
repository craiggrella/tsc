import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ContactDetail } from "./contact-detail";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { id } = await params;
  return <ContactDetail contactId={id} userId={user.id} />;
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClientDetail } from "./client-detail";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { id } = await params;
  return <ClientDetail clientId={id} userId={user.id} />;
}

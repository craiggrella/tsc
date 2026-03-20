import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CompanyDetail } from "./company-detail";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { id } = await params;
  return <CompanyDetail companyId={id} userId={user.id} />;
}

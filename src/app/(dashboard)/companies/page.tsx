import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CompaniesClient } from "./companies-client";

export default async function CompaniesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <CompaniesClient userId={user.id} />;
}

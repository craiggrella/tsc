import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NewCompany } from "./new-company";

export default async function NewCompanyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <NewCompany userId={user.id} />;
}

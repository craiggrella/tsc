import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MaterialsClient } from "./materials-client";

export default async function MaterialsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <MaterialsClient userId={user.id} />;
}

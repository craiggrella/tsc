import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NewClient } from "./new-client";

export default async function NewClientPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <NewClient userId={user.id} />;
}

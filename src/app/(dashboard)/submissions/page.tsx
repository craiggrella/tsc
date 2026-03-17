import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SubmissionsClient } from "./submissions-client";

export default async function SubmissionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <SubmissionsClient userId={user.id} />;
}

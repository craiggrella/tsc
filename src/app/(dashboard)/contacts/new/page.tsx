import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NewContact } from "./new-contact";

export default async function NewContactPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <NewContact userId={user.id} />;
}

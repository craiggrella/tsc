import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NewMaterial } from "./new-material";

export default async function NewMaterialPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <NewMaterial userId={user.id} />;
}

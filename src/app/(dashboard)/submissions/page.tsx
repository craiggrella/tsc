export const revalidate = 30;

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SubmissionsClient } from "./submissions-client";

export default async function SubmissionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: submissions }, { data: clients }, { data: people }, { data: projects }] =
    await Promise.all([
      supabase.from("submissions").select("*").order("submission_date", { ascending: false, nullsFirst: false }),
      supabase.from("clients").select("id, full_name").order("full_name"),
      supabase.from("people").select("id, full_name").order("full_name"),
      supabase.from("projects").select("id, name").order("name"),
    ]);

  return (
    <SubmissionsClient
      initialSubmissions={submissions || []}
      clients={clients || []}
      people={people || []}
      projects={projects || []}
    />
  );
}

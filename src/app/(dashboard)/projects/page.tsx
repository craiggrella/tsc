export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProjectsClient } from "./projects-client";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: projects }, { data: companies }, { data: people }] =
    await Promise.all([
      supabase.from("projects").select("*").order("name"),
      supabase.from("companies").select("id, name").order("name"),
      supabase
        .from("people")
        .select(
          "id, full_name, title, exec_level"
        )
        .order("full_name"),
    ]);

  return (
    <ProjectsClient
      initialProjects={projects || []}
      companies={companies || []}
      people={people || []}
    />
  );
}

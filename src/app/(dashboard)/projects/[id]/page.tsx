import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProjectDetail } from "./project-detail";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { id } = await params;
  return <ProjectDetail projectId={id} userId={user.id} />;
}

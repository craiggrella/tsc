import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SubmissionDetail } from "./submission-detail";

export default async function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { id } = await params;
  return <SubmissionDetail submissionId={id} userId={user.id} />;
}

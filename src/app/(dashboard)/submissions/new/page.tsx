import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NewSubmission } from "./new-submission";

export default async function NewSubmissionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <NewSubmission userId={user.id} />;
}

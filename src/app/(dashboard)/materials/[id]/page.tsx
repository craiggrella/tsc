import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MaterialDetail } from "./material-detail";

export default async function MaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { id } = await params;
  return <MaterialDetail materialId={id} userId={user.id} />;
}

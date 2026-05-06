import type { SupabaseClient } from "@supabase/supabase-js";
import type { RelationOption } from "@/components/shared/relation-picker";
import { toPersonName } from "@/lib/format-name";

// One-click create a person from a free-text name. First word → first_name,
// remaining words → last_name. "joe de silva" → "Joe", "De Silva".
// Resolves org_id from the current user's profile (required by RLS).
export async function quickCreatePerson(
  supabase: SupabaseClient,
  name: string,
  userId: string
): Promise<RelationOption | null> {
  const cleaned = toPersonName(name.trim());
  if (!cleaned) return null;
  const parts = cleaned.split(/\s+/);
  const first_name = parts[0] || "";
  const last_name = parts.slice(1).join(" ") || "";
  const full_name = cleaned;

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", userId)
    .single();
  if (!profile?.org_id) return null;

  const { data, error } = await supabase
    .from("people")
    .insert({
      first_name,
      last_name,
      full_name,
      org_id: profile.org_id,
      department: [],
    })
    .select("id, full_name")
    .single();
  if (error || !data) return null;
  return { id: data.id, label: data.full_name };
}

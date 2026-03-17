import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, first_name, last_name, role, org_id } = body;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Create auth user with a temporary password
  const tempPassword = Math.random().toString(36).slice(-12) + "A1!";
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  // Create profile
  const full_name = [first_name, last_name].filter(Boolean).join(" ");
  const { error: profileError } = await supabase.from("profiles").insert({
    id: authUser.user.id,
    org_id,
    full_name,
    first_name,
    last_name,
    email,
    role: role || "manager",
  });

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

  return NextResponse.json({ id: authUser.user.id, full_name, email, role, tempPassword });
}

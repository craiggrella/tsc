import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTransactionalEmail } from "@/lib/send-email";

// Admin sends a self-serve password reset link to a team member.
// Invalidates the member's existing password immediately by overwriting it with
// a random value, so the old password can't be used after this action — they
// must complete the email flow to regain access.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const origin = request.headers.get("origin") || new URL(request.url).origin;
  const redirectTo = `${origin}/auth/reset-password`;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Look up the user's email from profiles (id matches auth.users.id).
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", id)
    .single();

  if (profileErr || !profile?.email) {
    return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  }

  // 1) Invalidate the existing password — overwrite with a random value
  //    they will never see. Forces them through the email flow.
  const randomPw = crypto.randomUUID();
  const { error: updateErr } = await supabase.auth.admin.updateUserById(id, {
    password: randomPw,
  });
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  // 2) Generate a recovery link (does NOT send an email — we send our own).
  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email: profile.email,
    options: { redirectTo },
  });
  if (linkErr || !linkData?.properties?.action_link) {
    return NextResponse.json({ error: linkErr?.message || "Failed to generate reset link." }, { status: 500 });
  }

  const link = linkData.properties.action_link;
  const html = `
    <html>
      <body style="font-family: -apple-system, system-ui, sans-serif; color: #18181b; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="font-size: 18px; margin-bottom: 16px;">Set your password</h2>
        <p style="font-size: 14px; line-height: 1.5; color: #52525b;">
          An administrator has requested a password reset for your account at The Shuman Company.
          Your previous password (if any) is no longer valid. Click the button below to set a new one.
        </p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="display: inline-block; background: #000; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">Set Password</a>
        </p>
        <p style="font-size: 12px; color: #71717a; line-height: 1.5;">
          If the button doesn't work, paste this link into your browser:<br>
          <a href="${link}" style="color: #71717a;">${link}</a>
        </p>
      </body>
    </html>
  `;

  try {
    await sendTransactionalEmail({
      to: profile.email,
      subject: "Set your password — The Shuman Company",
      html,
    });
  } catch (err) {
    console.error("send-reset email failed:", err);
    return NextResponse.json({ error: "Failed to send reset email." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, email: profile.email });
}

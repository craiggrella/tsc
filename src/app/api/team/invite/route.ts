import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTransactionalEmail } from "@/lib/send-email";
import { toPersonName } from "@/lib/format-name";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, role, org_id } = body;
  const first_name = body.first_name ? toPersonName(body.first_name) : body.first_name;
  const last_name = body.last_name ? toPersonName(body.last_name) : body.last_name;

  const origin = request.headers.get("origin") || new URL(request.url).origin;
  const redirectTo = `${origin}/auth/reset-password`;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Create auth user with a random unknowable password — they'll set their own
  // via the email link. UUID-based so it can't be guessed.
  const randomPw = crypto.randomUUID();
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: randomPw,
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

  // Generate a recovery link (acts as the "set your password" link for the invite).
  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  if (linkErr || !linkData?.properties?.action_link) {
    // User is created. Surface a partial success so the admin knows to retry email
    // via "Send Password Reset" in the team panel.
    return NextResponse.json({
      id: authUser.user.id,
      full_name,
      email,
      role,
      emailSent: false,
      warning: "User created but invite email could not be generated. Use 'Send Password Reset' to retry.",
    });
  }

  const link = linkData.properties.action_link;
  const greeting = first_name ? `Hi ${first_name},` : "Welcome,";
  const html = `
    <html>
      <body style="font-family: -apple-system, system-ui, sans-serif; color: #18181b; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="font-size: 18px; margin-bottom: 16px;">You're invited to The Shuman Company</h2>
        <p style="font-size: 14px; line-height: 1.5; color: #52525b;">${greeting}</p>
        <p style="font-size: 14px; line-height: 1.5; color: #52525b;">
          An account has been created for you. Click the button below to set your password and sign in.
        </p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="display: inline-block; background: #000; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">Set Password &amp; Sign In</a>
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
      to: email,
      subject: "You're invited to The Shuman Company",
      html,
    });
  } catch (err) {
    console.error("invite email failed:", err);
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({
      id: authUser.user.id,
      full_name,
      email,
      role,
      emailSent: false,
      warning: `User created but invite email failed to send: ${msg}. Use 'Send Password Reset' to retry.`,
    });
  }

  return NextResponse.json({
    id: authUser.user.id,
    full_name,
    email,
    role,
    emailSent: true,
  });
}

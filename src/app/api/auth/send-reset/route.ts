import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTransactionalEmail } from "@/lib/send-email";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { email } = body as { email?: string };

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  }

  // This route is public, so don't trust the client-supplied Origin header for
  // the reset link's destination; use the host the request actually reached.
  const origin = new URL(request.url).origin;
  const redirectTo = `${origin}/auth/reset-password`;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Rate limit: 3 per address and 10 per IP per 15 minutes (see migration 027).
  // Over the limit we still return { ok: true } so the response reveals nothing.
  // Vercel sets x-forwarded-for itself; the first hop is the client.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const { data: allowed, error: limitError } = await supabase.rpc("password_reset_allowed", {
    p_email: email.trim().toLowerCase(),
    p_ip: ip,
  });
  // If the check itself errors, log it and fall through so resets keep working.
  if (limitError) console.error("send-reset rate limit check failed:", limitError);
  if (allowed === false) return NextResponse.json({ ok: true });

  // generateLink returns the link WITHOUT sending an email.
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  if (error || !data?.properties?.action_link) {
    // Don't leak whether the email exists — return ok regardless.
    return NextResponse.json({ ok: true });
  }

  const link = data.properties.action_link;
  const html = `
    <html>
      <body style="font-family: -apple-system, system-ui, sans-serif; color: #18181b; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="font-size: 18px; margin-bottom: 16px;">Reset your password</h2>
        <p style="font-size: 14px; line-height: 1.5; color: #52525b;">
          Click the button below to set a new password for your account at The Shuman Company.
        </p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="display: inline-block; background: #000; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">Reset Password</a>
        </p>
        <p style="font-size: 12px; color: #71717a; line-height: 1.5;">
          If the button doesn't work, paste this link into your browser:<br>
          <a href="${link}" style="color: #71717a;">${link}</a>
        </p>
        <p style="font-size: 12px; color: #a1a1aa; margin-top: 24px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </body>
    </html>
  `;

  try {
    await sendTransactionalEmail({
      to: email,
      subject: "Reset your password — The Shuman Company",
      html,
    });
  } catch (err) {
    console.error("send-reset email failed:", err);
    const msg = err instanceof Error ? err.message : "Failed to send reset email.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

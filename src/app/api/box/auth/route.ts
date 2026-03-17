import { NextRequest, NextResponse } from "next/server";

const BOX_CLIENT_ID = process.env.BOX_CLIENT_ID!;
const BOX_CLIENT_SECRET = process.env.BOX_CLIENT_SECRET!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET: redirect to Box OAuth
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    // Step 1: redirect to Box authorization
    const redirectUri = `${request.nextUrl.origin}/api/box/auth`;
    const boxAuthUrl = `https://account.box.com/api/oauth2/authorize?response_type=code&client_id=${BOX_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    return NextResponse.redirect(boxAuthUrl);
  }

  // Step 2: exchange code for tokens
  const redirectUri = `${request.nextUrl.origin}/api/box/auth`;
  const res = await fetch("https://api.box.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: BOX_CLIENT_ID,
      client_secret: BOX_CLIENT_SECRET,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: "Token exchange failed", details: err }, { status: 500 });
  }

  const data = await res.json();

  // Save tokens to Supabase
  await fetch(`${SUPABASE_URL}/rest/v1/box_tokens?id=eq.1`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: 1,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      updated_at: new Date().toISOString(),
    }),
  });

  // Redirect to files page
  return NextResponse.redirect(`${request.nextUrl.origin}/files`);
}

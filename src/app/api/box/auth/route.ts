import { NextRequest, NextResponse } from "next/server";

const BOX_CLIENT_ID = process.env.BOX_CLIENT_ID!;
const BOX_CLIENT_SECRET = process.env.BOX_CLIENT_SECRET!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getRedirectUri(request: NextRequest): string {
  // Use X-Forwarded-Host or Host header to get the real public URL
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}/api/box/auth`;
}

// GET: redirect to Box OAuth
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectUri = getRedirectUri(request);

  if (!code) {
    // Step 1: redirect to Box authorization
    const boxAuthUrl = `https://account.box.com/api/oauth2/authorize?response_type=code&client_id=${BOX_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    return NextResponse.redirect(boxAuthUrl);
  }
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

  // Save tokens to Supabase (upsert — creates or updates)
  const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/box_tokens`, {
    method: "POST",
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
  if (!saveRes.ok) {
    const saveErr = await saveRes.text();
    return NextResponse.json({ error: "Failed to save tokens", details: saveErr }, { status: 500 });
  }

  // Redirect to files page
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  return NextResponse.redirect(`${proto}://${host}/files`);
}

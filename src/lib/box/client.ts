const BOX_API = "https://api.box.com/2.0";
const BOX_UPLOAD_API = "https://upload.box.com/api/2.0";

const BOX_CLIENT_ID = process.env.BOX_CLIENT_ID!;
const BOX_CLIENT_SECRET = process.env.BOX_CLIENT_SECRET!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function loadTokensFromSupabase(): Promise<{ access_token: string; refresh_token: string }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/box_tokens?id=eq.1&select=access_token,refresh_token`, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to load Box tokens from Supabase: ${res.status}`);
  const rows = await res.json();
  if (!rows || rows.length === 0) throw new Error("No Box tokens found in Supabase. Visit /api/box/auth to authorize.");
  return { access_token: rows[0].access_token, refresh_token: rows[0].refresh_token };
}

async function saveTokensToSupabase(access_token: string, refresh_token: string) {
  // Upsert — creates or updates the single row
  await fetch(`${SUPABASE_URL}/rest/v1/box_tokens`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ id: 1, access_token, refresh_token, updated_at: new Date().toISOString() }),
  });
}

async function getTokens() {
  // Always read fresh from Supabase — no in-memory cache
  // Vercel serverless functions stay warm and would serve stale tokens
  return await loadTokensFromSupabase();
}

async function refreshToken(): Promise<string> {
  const tokens = await getTokens();
  const res = await fetch("https://api.box.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
      client_id: BOX_CLIENT_ID,
      client_secret: BOX_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    throw new Error(`Box token refresh failed: ${await res.text()}`);
  }

  const data = await res.json();
  // Persist new tokens to Supabase
  await saveTokensToSupabase(data.access_token, data.refresh_token);
  return data.access_token;
}

async function boxFetch(
  url: string,
  options: RequestInit = {},
  retry = true
): Promise<Response> {
  const tokens = await getTokens();
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      ...options.headers,
    },
  });

  if (res.status === 401 && retry) {
    await refreshToken();
    return boxFetch(url, options, false);
  }

  if (res.status === 429) {
    const wait =
      parseInt(res.headers.get("retry-after") || "2") * 1000 + 500;
    await new Promise((r) => setTimeout(r, wait));
    return boxFetch(url, options, retry);
  }

  return res;
}

export async function listFolder(folderId: string) {
  const res = await boxFetch(
    `${BOX_API}/folders/${folderId}/items?limit=1000&fields=id,type,name,size,modified_at,parent`
  );
  if (!res.ok) throw new Error(`Box API error: ${res.status}`);
  return res.json();
}

export async function getFolderInfo(folderId: string) {
  const res = await boxFetch(
    `${BOX_API}/folders/${folderId}?fields=id,name,parent,path_collection`
  );
  if (!res.ok) throw new Error(`Box API error: ${res.status}`);
  return res.json();
}

export async function getFileInfo(fileId: string) {
  const res = await boxFetch(
    `${BOX_API}/files/${fileId}?fields=id,name,size,modified_at,parent,extension,shared_link`
  );
  if (!res.ok) throw new Error(`Box API error: ${res.status}`);
  return res.json();
}

export async function getDownloadUrl(fileId: string): Promise<string> {
  const res = await boxFetch(`${BOX_API}/files/${fileId}/content`, {
    redirect: "manual",
  });
  if (res.status === 302) {
    return res.headers.get("location") || "";
  }
  if (res.ok) {
    return `${BOX_API}/files/${fileId}/content`;
  }
  throw new Error(`Box download error: ${res.status}`);
}

export async function getPreviewUrl(fileId: string): Promise<string> {
  const res = await boxFetch(`${BOX_API}/files/${fileId}?fields=expiring_embed_link`);
  if (!res.ok) throw new Error(`Box API error: ${res.status}`);
  const data = await res.json();
  return data.expiring_embed_link?.url || "";
}

export async function searchFiles(query: string, ancestorFolderId?: string) {
  const params = new URLSearchParams({
    query,
    limit: "50",
    fields: "id,type,name,size,modified_at,parent",
  });
  if (ancestorFolderId) {
    params.set("ancestor_folder_ids", ancestorFolderId);
  }
  const res = await boxFetch(`${BOX_API}/search?${params}`);
  if (!res.ok) throw new Error(`Box API error: ${res.status}`);
  return res.json();
}

export async function uploadFile(
  folderId: string,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string
) {
  const attributes = JSON.stringify({
    name: fileName,
    parent: { id: folderId },
  });

  const boundary = "----BoxUpload" + Date.now();
  const parts = [
    `--${boundary}\r\nContent-Disposition: form-data; name="attributes"\r\nContent-Type: application/json\r\n\r\n${attributes}\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${contentType}\r\n\r\n`,
  ];

  const prefix = Buffer.from(parts[0] + parts[1]);
  const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([prefix, fileBuffer, suffix]);

  const tokens = await getTokens();
  const res = await fetch(`${BOX_UPLOAD_API}/files/content`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Box upload error: ${err}`);
  }

  return res.json();
}

// Fetch Box's server-side extracted text for a file (PDFs, Office docs, etc).
// Box generates this representation lazily on first request — may take a few seconds.
// Returns null if no text representation is available (e.g. images, raw binaries).
export async function getExtractedText(fileId: string): Promise<string | null> {
  // 1. Ask Box for the extracted_text representation metadata
  const metaRes = await boxFetch(
    `${BOX_API}/files/${fileId}?fields=representations`,
    { headers: { "X-Rep-Hints": "[extracted_text]" } }
  );
  if (!metaRes.ok) throw new Error(`Box rep metadata error: ${metaRes.status}`);
  const meta = await metaRes.json();
  const entry = meta.representations?.entries?.find?.(
    (e: { representation: string }) => e.representation === "extracted_text"
  );
  if (!entry) return null;

  // 2. If pending, poll the info_url until status === 'success' (or timeout)
  let status: string = entry.status?.state || "none";
  let infoUrl: string | undefined = entry.info?.url;
  const start = Date.now();
  while (status === "pending" && infoUrl && Date.now() - start < 15000) {
    await new Promise((r) => setTimeout(r, 1500));
    const poll = await boxFetch(infoUrl);
    if (!poll.ok) break;
    const polled = await poll.json();
    status = polled.status?.state || "none";
  }
  if (status !== "success") return null;

  // 3. Fetch the actual text. url_template includes "{+asset_path}" which we leave empty for non-paged docs.
  const urlTemplate: string | undefined = entry.content?.url_template;
  if (!urlTemplate) return null;
  const textUrl = urlTemplate.replace("{+asset_path}", "");
  const textRes = await boxFetch(textUrl);
  if (!textRes.ok) return null;
  return await textRes.text();
}

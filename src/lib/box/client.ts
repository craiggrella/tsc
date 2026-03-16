import { execSync } from "child_process";
import { resolve } from "path";

const BOX_API = "https://api.box.com/2.0";
const BOX_UPLOAD_API = "https://upload.box.com/api/2.0";

const BOX_CLIENT_ID = process.env.BOX_CLIENT_ID!;
const BOX_CLIENT_SECRET = process.env.BOX_CLIENT_SECRET!;
const BOX_AUTH_DB = resolve(process.env.HOME || "", ".box-mcp/.auth.oauth");
const BOX_VENV_PYTHON = resolve(process.env.HOME || "", ".box-mcp/.venv/bin/python3");

let cachedTokens: { access_token: string; refresh_token: string } | null = null;

function loadTokensFromDb(): { access_token: string; refresh_token: string } {
  const script = `
import sqlite3, pickle, json
conn = sqlite3.connect("${BOX_AUTH_DB}")
rows = conn.execute("SELECT value FROM Dict WHERE key=?", (b"token",)).fetchone()
if rows:
    token = pickle.loads(rows[0])
    print(json.dumps({
        "access_token": token._raw_data.get("access_token", ""),
        "refresh_token": token._raw_data.get("refresh_token", ""),
    }))
conn.close()
`;
  const result = execSync(`${BOX_VENV_PYTHON} -c '${script}'`, {
    encoding: "utf-8",
  });
  return JSON.parse(result.trim());
}

function getTokens() {
  if (!cachedTokens) {
    cachedTokens = loadTokensFromDb();
  }
  return cachedTokens;
}

async function refreshToken(): Promise<string> {
  const tokens = getTokens();
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
  cachedTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  };
  return data.access_token;
}

async function boxFetch(
  url: string,
  options: RequestInit = {},
  retry = true
): Promise<Response> {
  const tokens = getTokens();
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
  // Box returns a 302 redirect to the actual download URL
  if (res.status === 302) {
    return res.headers.get("location") || "";
  }
  // Sometimes it returns 200 with the content directly
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

  // Box upload uses multipart form data
  const boundary = "----BoxUpload" + Date.now();
  const parts = [
    `--${boundary}\r\nContent-Disposition: form-data; name="attributes"\r\nContent-Type: application/json\r\n\r\n${attributes}\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${contentType}\r\n\r\n`,
  ];

  const prefix = Buffer.from(parts[0] + parts[1]);
  const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([prefix, fileBuffer, suffix]);

  const tokens = getTokens();
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

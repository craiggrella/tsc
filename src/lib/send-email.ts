import "server-only";
import https from "https";

// Sends transactional email via the configured ESP HTTP API.
// Wired to campaignplanner.org's /api/transactional/send shape.
//
// Required env:
//   EMAIL_API_URL      — e.g. https://mail.campaignplanner.org/api/transactional/send
//   EMAIL_API_KEY      — value sent as X-Auth-APIKey
//   EMAIL_FROM_EMAIL   — sender address
//   EMAIL_FROM_NAME    — sender display name
//
// Why the https module + rejectUnauthorized: campaignplanner's TLS cert is not
// trusted by Node's default CA bundle, so plain `fetch` fails with a cert error.
// Using the https module with rejectUnauthorized: false works (and we fall back
// to fetch with NODE_TLS_REJECT_UNAUTHORIZED=0 just in case).

async function postJSON(
  url: string,
  headers: Record<string, string>,
  body: string
): Promise<{ status: number; body: string }> {
  try {
    const result = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      const parsed = new URL(url);
      const req = https.request(
        {
          hostname: parsed.hostname,
          path: parsed.pathname,
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
          },
          rejectUnauthorized: false,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => resolve({ status: res.statusCode || 0, body: data }));
        }
      );
      req.on("error", reject);
      req.write(body);
      req.end();
    });
    return result;
  } catch (err) {
    console.error("https module failed, trying fetch:", err);
  }

  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const res = await fetch(url, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body,
    });
    const text = await res.text();
    return { status: res.status, body: text };
  } catch (err) {
    console.error("fetch also failed:", err);
    return { status: 0, body: String(err) };
  }
}

type SendArgs = {
  to: string;
  subject: string;
  html: string;
};

export async function sendTransactionalEmail({ to, subject, html }: SendArgs) {
  const url = process.env.EMAIL_API_URL;
  const key = process.env.EMAIL_API_KEY;
  const fromEmail = process.env.EMAIL_FROM_EMAIL;
  const fromName = process.env.EMAIL_FROM_NAME;

  if (!url || !key || !fromEmail || !fromName) {
    throw new Error("Email service not configured (EMAIL_API_URL/KEY/FROM_EMAIL/FROM_NAME).");
  }

  const payload = JSON.stringify({
    fromname: fromName,
    fromemail: fromEmail,
    to,
    subject,
    body: html,
  });

  const res = await postJSON(url, { "X-Auth-APIKey": key }, payload);

  if (res.status !== 200) {
    throw new Error(`Email API error ${res.status}: ${res.body}`);
  }
}

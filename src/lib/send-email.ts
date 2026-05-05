// Sends transactional email via the configured ESP HTTP API.
// Currently wired to campaignplanner.org's /api/transactional/send shape.
//
// Required env:
//   EMAIL_API_URL      — e.g. https://mail.campaignplanner.org/api/transactional/send
//   EMAIL_API_KEY      — value sent as X-Auth-APIKey
//   EMAIL_FROM_EMAIL   — sender address
//   EMAIL_FROM_NAME    — sender display name

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

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-APIKey": key,
    },
    body: JSON.stringify({
      fromname: fromName,
      fromemail: fromEmail,
      to,
      subject,
      body: html,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Email API error ${res.status}: ${text}`);
  }
}

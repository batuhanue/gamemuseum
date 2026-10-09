import "server-only";

export type MailResult = { delivered: boolean; channel: "resend" | "dev-log" | "none" };

/**
 * Transactional e-mail. Uses Resend when RESEND_API_KEY is configured. In development without a key
 * the link is printed to the server log; in production without a key nothing is sent and the caller
 * is told so (we never pretend a mail was delivered).
 */
export async function sendMail(to: string, subject: string, text: string): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY;
  if (key) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "Game Museum <no-reply@example.com>", to, subject, text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Resend error ${res.status}`);
    return { delivered: true, channel: "resend" };
  }
  if (process.env.APP_ENV !== "production") {
    console.info(`\n[mail:dev] to=${to}\nsubject=${subject}\n${text}\n`);
    return { delivered: false, channel: "dev-log" };
  }
  return { delivered: false, channel: "none" };
}

export function appUrl(path = "") {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return `${base.replace(/\/$/, "")}${path}`;
}

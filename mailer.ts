import type { ResetEmail, SendResult } from "./passwordReset";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

type Env = Record<string, string | undefined>;
type FetchLike = (url: string, init: RequestInit) => Promise<Pick<Response, "ok" | "status" | "text">>;

/** What's missing before reset emails can go out, as setting names. Empty when everything is set. */
export function missingEmailSettings(env: Env = process.env): string[] {
  return ["RESEND_API_KEY", "EMAIL_FROM", "APP_URL"].filter((name) => {
    const value = env[name]?.trim();
    return !value || value.startsWith("MY_");
  });
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

export function passwordResetEmailContent({ resetUrl, expiresInMinutes }: ResetEmail) {
  const subject = "Reset your password for The Yard";
  const text = [
    "Someone asked to reset the password for your account on The Yard.",
    "",
    `Reset your password: ${resetUrl}`,
    "",
    `This link works once and expires in ${expiresInMinutes} minutes.`,
    "If you didn't ask for this, you can ignore this email. Your password stays the same.",
  ].join("\n");
  const href = escapeHtml(resetUrl);
  const html = `<p>Someone asked to reset the password for your account on The Yard.</p>
<p><a href="${href}">Reset your password</a></p>
<p>This link works once and expires in ${expiresInMinutes} minutes.</p>
<p>If you didn't ask for this, you can ignore this email. Your password stays the same.</p>`;
  return { subject, text, html };
}

/**
 * Send the reset email through Resend's HTTP API.
 *
 * Reads RESEND_API_KEY and EMAIL_FROM from the environment. When either is
 * missing it sends nothing and says why; it never throws and never puts the
 * link in its result, so callers can log the result safely.
 */
export async function sendPasswordResetEmail(
  message: ResetEmail,
  { env = process.env, fetchImpl = fetch as FetchLike }: { env?: Env; fetchImpl?: FetchLike } = {},
): Promise<SendResult> {
  const missing = missingEmailSettings(env).filter((name) => name !== "APP_URL");
  if (missing.length > 0) return { sent: false, reason: `${missing.join(" and ")} not set` };

  const { subject, text, html } = passwordResetEmailContent(message);
  try {
    const res = await fetchImpl(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY!.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: env.EMAIL_FROM!.trim(), to: [message.to], subject, text, html }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return { sent: true };

    let detail = "";
    try {
      const body = JSON.parse(await res.text()) as { name?: unknown; message?: unknown };
      detail = [body.name, body.message].filter((part) => typeof part === "string").join(": ").slice(0, 200);
    } catch {
      // Body wasn't JSON; the status code is enough.
    }
    return { sent: false, reason: `Resend answered ${res.status}${detail ? ` (${detail})` : ""}` };
  } catch (err) {
    return { sent: false, reason: `could not reach Resend: ${err instanceof Error ? err.message : "unknown error"}` };
  }
}

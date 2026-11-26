import type { ResetEmail, SendResult } from "./passwordReset";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

type Env = Record<string, string | undefined>;
type FetchLike = (url: string, init: RequestInit) => Promise<Pick<Response, "ok" | "status" | "text">>;

/** A setting's value, or undefined when it's empty or still the .env.example placeholder. */
function setting(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && !trimmed.startsWith("MY_") ? trimmed : undefined;
}

/** What's missing before reset emails can go out, as setting names. Empty when everything is set. */
export function missingEmailSettings(env: Env = process.env): string[] {
  const missing: string[] = [];
  if (!setting(env.RESEND_API_KEY)) missing.push("RESEND_API_KEY");
  if (!setting(env.EMAIL_FROM)) missing.push("EMAIL_FROM");
  if (!setting(env.APP_URL)) missing.push("APP_URL");
  return missing;
}

/** The reset email, as plain text: mail apps turn the link into something to tap. */
export function passwordResetEmailContent({ resetUrl, expiresInMinutes }: ResetEmail) {
  const subject = "Reset your password for The Yard";
  const text = [
    "Someone asked to reset the password for your account on The Yard.",
    "",
    "Reset your password here:",
    resetUrl,
    "",
    `This link works once and expires in ${expiresInMinutes} minutes.`,
    "If you didn't ask for this, you can ignore this email. Your password stays the same.",
  ].join("\n");
  return { subject, text };
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
  const apiKey = setting(env.RESEND_API_KEY);
  const from = setting(env.EMAIL_FROM);
  if (!apiKey || !from) {
    const missing = [apiKey ? "" : "RESEND_API_KEY", from ? "" : "EMAIL_FROM"].filter(Boolean);
    return { sent: false, reason: `${missing.join(" and ")} not set` };
  }

  const { subject, text } = passwordResetEmailContent(message);
  try {
    const res = await fetchImpl(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [message.to], subject, text }),
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

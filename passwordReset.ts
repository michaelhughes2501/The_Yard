import crypto from "crypto";
import { hashPassword, isUsablePassword } from "./passwords";

/** How long an emailed reset link stays valid. */
export const RESET_TOKEN_TTL_MINUTES = 30;
const RESET_TOKEN_TTL_MS = RESET_TOKEN_TTL_MINUTES * 60 * 1000;

/** The one reply every reset request gets, so it never tells anyone whether an email is registered. */
export const RESET_REQUESTED_MESSAGE =
  `If an account uses that email, we've sent it a reset link. The link works once and expires in ${RESET_TOKEN_TTL_MINUTES} minutes.`;

export const INVALID_RESET_LINK_MESSAGE = "This reset link is invalid or has expired. Request a new one.";

/** The slice of better-sqlite3 that password resets need. */
export interface ResetStore {
  exec(sql: string): unknown;
  prepare(sql: string): {
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
    run(...params: unknown[]): { changes: number };
  };
  transaction<F extends (...args: never[]) => unknown>(fn: F): F;
}

/**
 * Create the reset-token table and remove the old one.
 *
 * The old `password_resets` table kept reset tokens in plain text and the
 * server handed them back to whoever asked, so any row left in it is unsafe.
 */
export function ensurePasswordResetSchema(db: ResetStore): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
    DROP TABLE IF EXISTS password_resets;
  `);
}

/** A reset token: 32 random bytes, URL-safe. Only its SHA-256 is ever stored. */
export function createResetToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

/** A trimmed email address, or undefined when the input can't be one. */
export function normalizeEmail(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const email = input.trim();
  if (email.length < 3 || email.length > 254 || !email.includes("@") || /\s/.test(email)) return undefined;
  return email;
}

interface UserRow {
  id: string;
  email: string;
}

function findUserByEmail(db: ResetStore, email: string): UserRow | undefined {
  const rows = db
    .prepare("SELECT id, email FROM users WHERE email = ? COLLATE NOCASE LIMIT 2")
    .all(email) as UserRow[];
  if (rows.length === 1) return rows[0];
  // Two accounts differ only by letter case: use only an exact match.
  return rows.find((row) => row.email === email);
}

export interface IssuedResetToken {
  userId: string;
  email: string;
  token: string;
  expiresAt: number;
}

/**
 * Make a reset token for the account with this email, replacing any it had.
 * Returns undefined when no account uses the email.
 */
export function issuePasswordResetToken(db: ResetStore, email: string, now = Date.now()): IssuedResetToken | undefined {
  const user = findUserByEmail(db, email);
  if (!user) return undefined;

  const token = createResetToken();
  const expiresAt = now + RESET_TOKEN_TTL_MS;
  db.transaction(() => {
    db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ? OR expires_at <= ?").run(user.id, now);
    db.prepare(
      "INSERT INTO password_reset_tokens (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    ).run(hashResetToken(token), user.id, expiresAt, now);
  })();
  return { userId: user.id, email: user.email, token, expiresAt };
}

/**
 * The link a member opens to reset their password, built only from the app's
 * configured address (never the request's Host header). The token sits in the
 * fragment so browsers don't send it to servers or in Referer headers.
 */
export function buildResetLink(appUrl: string | undefined, token: string): string | undefined {
  if (!appUrl || !appUrl.trim()) return undefined;
  let url: URL;
  try {
    url = new URL(appUrl.trim());
  } catch {
    return undefined;
  }
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocal)) return undefined;
  url.search = "";
  url.hash = `reset-token=${encodeURIComponent(token)}`;
  return url.toString();
}

export interface ResetEmail {
  to: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export type SendResult = { sent: true } | { sent: false; reason: string };

export type ResetRequestOutcome =
  | { status: "sent"; userId: string }
  | { status: "no_account" }
  | { status: "not_sent"; userId: string; reason: string };

/**
 * Email a reset link to the account that uses this email, if there is one.
 *
 * Nothing here goes back to the person who asked: the route replies before
 * calling this. When the email can't be sent, the token is deleted again.
 */
export async function requestPasswordReset(
  db: ResetStore,
  email: string,
  options: { appUrl: string | undefined; send: (message: ResetEmail) => Promise<SendResult>; now?: number },
): Promise<ResetRequestOutcome> {
  const issued = issuePasswordResetToken(db, email, options.now);
  if (!issued) return { status: "no_account" };

  const discard = () => db.prepare("DELETE FROM password_reset_tokens WHERE token_hash = ?").run(hashResetToken(issued.token));

  const resetUrl = buildResetLink(options.appUrl, issued.token);
  if (!resetUrl) {
    discard();
    return { status: "not_sent", userId: issued.userId, reason: "APP_URL is missing or not an https address" };
  }

  let result: SendResult;
  try {
    result = await options.send({ to: issued.email, resetUrl, expiresInMinutes: RESET_TOKEN_TTL_MINUTES });
  } catch (err) {
    result = { sent: false, reason: err instanceof Error ? err.message : "sending failed" };
  }
  if (!result.sent) {
    discard();
    return { status: "not_sent", userId: issued.userId, reason: result.reason };
  }
  return { status: "sent", userId: issued.userId };
}

export type ResetOutcome = { ok: true; userId: string } | { ok: false; reason: "password_required" | "invalid_link" };

/**
 * Set a new password with an emailed token. The token works once: it is
 * claimed and the password changed in one transaction, and every other reset
 * token and every session for the account are removed with it.
 */
export async function resetPasswordWithToken(
  db: ResetStore,
  token: unknown,
  newPassword: unknown,
  clock: () => number = Date.now,
): Promise<ResetOutcome> {
  if (!isUsablePassword(newPassword)) return { ok: false, reason: "password_required" };
  if (typeof token !== "string" || token.length < 16 || token.length > 256) return { ok: false, reason: "invalid_link" };

  const tokenHash = hashResetToken(token);
  // Check first so a made-up token never costs a bcrypt hash.
  const pending = db
    .prepare("SELECT user_id FROM password_reset_tokens WHERE token_hash = ? AND expires_at > ?")
    .get(tokenHash, clock());
  if (!pending) return { ok: false, reason: "invalid_link" };

  const passwordHash = await hashPassword(newPassword);

  const userId = db.transaction(() => {
    const claimed = db
      .prepare("DELETE FROM password_reset_tokens WHERE token_hash = ? AND expires_at > ? RETURNING user_id")
      .get(tokenHash, clock()) as { user_id: string } | undefined;
    if (!claimed) return undefined;
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(passwordHash, claimed.user_id);
    db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").run(claimed.user_id);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(claimed.user_id);
    return claimed.user_id;
  })();

  return userId ? { ok: true, userId } : { ok: false, reason: "invalid_link" };
}

/**
 * Counts attempts per key in fixed windows, in memory. Enough for one server
 * process; it starts empty after a restart.
 */
export class FixedWindowLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxKeys = 10_000,
  ) {}

  /** Count one attempt for this key. False once the key is over its limit for the current window. */
  take(key: string, now = Date.now()): boolean {
    let entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.delete(key);
      if (this.hits.size >= this.maxKeys) this.prune(now);
      entry = { count: 0, resetAt: now + this.windowMs };
      this.hits.set(key, entry);
    }
    entry.count += 1;
    return entry.count <= this.limit;
  }

  private prune(now: number): void {
    for (const [key, entry] of this.hits) {
      if (entry.resetAt <= now) this.hits.delete(key);
    }
    // Still full: drop the oldest windows so memory stays bounded.
    for (const key of this.hits.keys()) {
      if (this.hits.size < this.maxKeys) break;
      this.hits.delete(key);
    }
  }
}

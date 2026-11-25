import crypto from "crypto";
import bcrypt from "bcryptjs";

/** bcrypt work factor for new and upgraded password hashes. */
export const BCRYPT_ROUNDS = 12;

const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

/** The small slice of better-sqlite3 that the password migration needs. */
interface UserStore {
  prepare(sql: string): {
    all(...params: unknown[]): unknown[];
    run(...params: unknown[]): { changes: number };
  };
}

export interface PasswordCheck {
  /** The password matches what is stored for the account. */
  ok: boolean;
  /** The stored value should be replaced with a fresh hash (legacy plain text or an older work factor). */
  needsRehash: boolean;
}

/** True when a stored password value is already a bcrypt hash. */
export function isPasswordHash(stored: unknown): stored is string {
  return typeof stored === "string" && BCRYPT_HASH.test(stored);
}

/** True when a submitted password is something we can hash: a non-empty string. */
export function isUsablePassword(plain: unknown): plain is string {
  return typeof plain === "string" && plain.length > 0;
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function hashPasswordSync(plain: string): string {
  return bcrypt.hashSync(plain, BCRYPT_ROUNDS);
}

let dummyHash: string | undefined;

/** A real hash to compare against when there is no account, so a missing user takes as long as a wrong password. */
function getDummyHash(): string {
  dummyHash ??= bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), BCRYPT_ROUNDS);
  return dummyHash;
}

/** Constant-time comparison for legacy rows that still hold a plain-text password. */
function plainTextMatches(plain: string, stored: string): boolean {
  const a = crypto.createHash("sha256").update(plain).digest();
  const b = crypto.createHash("sha256").update(stored).digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * Check a submitted password against the stored value.
 *
 * Accepts bcrypt hashes and, for accounts created before hashing was added,
 * the old plain-text value. A plain-text match reports `needsRehash` so the
 * caller can replace it with a hash straight away.
 */
export async function verifyPassword(plain: unknown, stored: unknown): Promise<PasswordCheck> {
  if (!isUsablePassword(plain)) {
    return { ok: false, needsRehash: false };
  }

  if (isPasswordHash(stored)) {
    const ok = await bcrypt.compare(plain, stored);
    return { ok, needsRehash: ok && bcrypt.getRounds(stored) < BCRYPT_ROUNDS };
  }

  if (typeof stored === "string" && stored.length > 0) {
    const ok = plainTextMatches(plain, stored);
    return { ok, needsRehash: ok };
  }

  await bcrypt.compare(plain, getDummyHash());
  return { ok: false, needsRehash: false };
}

/**
 * Replace every plain-text password in the users table with a bcrypt hash.
 *
 * Safe to run on every start: rows that already hold a hash are skipped, and
 * a row is only updated if its password has not changed since it was read.
 * Returns how many rows were updated.
 */
export async function migratePlainTextPasswords(db: UserStore): Promise<number> {
  const rows = db
    .prepare("SELECT id, password FROM users WHERE password IS NOT NULL AND password != ''")
    .all() as { id: string; password: string }[];
  const update = db.prepare("UPDATE users SET password = ? WHERE id = ? AND password = ?");

  let migrated = 0;
  for (const row of rows) {
    if (isPasswordHash(row.password)) continue;
    const hash = await hashPassword(row.password);
    migrated += update.run(hash, row.id, row.password).changes;
  }
  return migrated;
}

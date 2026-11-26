import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { hashPassword, verifyPassword } from "./passwords";
import {
  buildResetLink,
  ensurePasswordResetSchema,
  FixedWindowLimiter,
  hashResetToken,
  issuePasswordResetToken,
  normalizeEmail,
  requestPasswordReset,
  RESET_TOKEN_TTL_MINUTES,
  resetPasswordWithToken,
  type ResetEmail,
  type ResetStore,
} from "./passwordReset";
import { missingEmailSettings, passwordResetEmailContent, sendPasswordResetEmail } from "./mailer";

const APP_URL = "https://yard.example.com";
const TTL_MS = RESET_TOKEN_TTL_MINUTES * 60 * 1000;

async function setup() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT UNIQUE, email TEXT UNIQUE, password TEXT);
    CREATE TABLE sessions (token TEXT PRIMARY KEY, user_id TEXT);
    CREATE TABLE password_resets (token TEXT PRIMARY KEY, user_id TEXT, expires_at DATETIME);
  `);
  db.prepare("INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)").run(
    "u1",
    "marcus",
    "marcus@example.com",
    await hashPassword("old password"),
  );
  db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run("session-1", "u1");
  ensurePasswordResetSchema(db);
  return db;
}

/** Records the emails that would have been sent, and pulls the token back out of the link. */
function fakeMailbox() {
  const sent: ResetEmail[] = [];
  return {
    sent,
    send: async (message: ResetEmail) => {
      sent.push(message);
      return { sent: true as const };
    },
    tokenFrom(message: ResetEmail) {
      return new URLSearchParams(new URL(message.resetUrl).hash.slice(1)).get("reset-token") ?? "";
    },
  };
}

function storedTokens(db: ResetStore) {
  return db.prepare("SELECT token_hash, user_id, expires_at FROM password_reset_tokens").all() as {
    token_hash: string;
    user_id: string;
    expires_at: number;
  }[];
}

async function passwordOf(db: ResetStore) {
  return (db.prepare("SELECT password FROM users WHERE id = 'u1'").get() as { password: string }).password;
}

await test("ensurePasswordResetSchema drops the old plain-text reset table", async () => {
  const db = await setup();
  const old = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'password_resets'").get();
  assert.equal(old, undefined);
  ensurePasswordResetSchema(db); // safe to run on every start
});

await test("a reset request emails a link to the account's own address and stores only a hash", async () => {
  const db = await setup();
  const mailbox = fakeMailbox();
  const now = Date.now();

  const outcome = await requestPasswordReset(db, "marcus@example.com", { appUrl: APP_URL, send: mailbox.send, now });
  assert.deepEqual(outcome, { status: "sent", userId: "u1" });

  assert.equal(mailbox.sent.length, 1);
  assert.equal(mailbox.sent[0].to, "marcus@example.com");
  assert.equal(mailbox.sent[0].expiresInMinutes, RESET_TOKEN_TTL_MINUTES);
  assert.ok(mailbox.sent[0].resetUrl.startsWith(`${APP_URL}/#reset-token=`));

  const token = mailbox.tokenFrom(mailbox.sent[0]);
  assert.ok(token.length >= 43, "token carries 32 random bytes");
  const rows = storedTokens(db);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].token_hash, hashResetToken(token));
  assert.notEqual(rows[0].token_hash, token, "the token itself is never stored");
  assert.equal(rows[0].expires_at, now + TTL_MS);
});

await test("a reset request for an unknown email sends nothing and stores nothing", async () => {
  const db = await setup();
  const mailbox = fakeMailbox();
  const outcome = await requestPasswordReset(db, "nobody@example.com", { appUrl: APP_URL, send: mailbox.send });
  assert.deepEqual(outcome, { status: "no_account" });
  assert.equal(mailbox.sent.length, 0);
  assert.equal(storedTokens(db).length, 0);
});

await test("email lookup ignores letter case and surrounding spaces", async () => {
  const db = await setup();
  const mailbox = fakeMailbox();
  const email = normalizeEmail("  Marcus@Example.com ");
  assert.equal(email, "Marcus@Example.com");
  await requestPasswordReset(db, email, { appUrl: APP_URL, send: mailbox.send });
  assert.equal(mailbox.sent[0]?.to, "marcus@example.com", "mail goes to the address on the account");
});

await test("normalizeEmail rejects things that can't be an email", () => {
  for (const bad of [undefined, null, 42, {}, "", "   ", "no-at-sign", "a b@example.com", `${"x".repeat(250)}@example.com`]) {
    assert.equal(normalizeEmail(bad), undefined, String(bad));
  }
});

await test("the emailed token resets the password once, and signs the account out everywhere", async () => {
  const db = await setup();
  const mailbox = fakeMailbox();
  await requestPasswordReset(db, "marcus@example.com", { appUrl: APP_URL, send: mailbox.send });
  const token = mailbox.tokenFrom(mailbox.sent[0]);

  assert.deepEqual(await resetPasswordWithToken(db, token, "new password"), { ok: true, userId: "u1" });
  assert.equal((await verifyPassword("new password", await passwordOf(db))).ok, true);
  assert.equal((await verifyPassword("old password", await passwordOf(db))).ok, false);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id = 'u1'").get().n, 0);
  assert.equal(storedTokens(db).length, 0);

  assert.deepEqual(await resetPasswordWithToken(db, token, "another password"), { ok: false, reason: "invalid_link" });
  assert.equal((await verifyPassword("new password", await passwordOf(db))).ok, true, "a used link changes nothing");
});

await test("two resets racing with the same token: only one wins", async () => {
  const db = await setup();
  const mailbox = fakeMailbox();
  await requestPasswordReset(db, "marcus@example.com", { appUrl: APP_URL, send: mailbox.send });
  const token = mailbox.tokenFrom(mailbox.sent[0]);

  const results = await Promise.all([
    resetPasswordWithToken(db, token, "first password"),
    resetPasswordWithToken(db, token, "second password"),
  ]);
  assert.equal(results.filter((r) => r.ok).length, 1);
});

await test("an expired token is refused", async () => {
  const db = await setup();
  const mailbox = fakeMailbox();
  const issuedAt = Date.now() - TTL_MS - 1;
  await requestPasswordReset(db, "marcus@example.com", { appUrl: APP_URL, send: mailbox.send, now: issuedAt });
  const token = mailbox.tokenFrom(mailbox.sent[0]);

  assert.deepEqual(await resetPasswordWithToken(db, token, "new password"), { ok: false, reason: "invalid_link" });
  assert.equal((await verifyPassword("old password", await passwordOf(db))).ok, true);
});

await test("a token still works just before it expires", async () => {
  const db = await setup();
  const mailbox = fakeMailbox();
  const issuedAt = 1_000_000;
  await requestPasswordReset(db, "marcus@example.com", { appUrl: APP_URL, send: mailbox.send, now: issuedAt });
  const token = mailbox.tokenFrom(mailbox.sent[0]);
  const result = await resetPasswordWithToken(db, token, "new password", () => issuedAt + TTL_MS - 1);
  assert.equal(result.ok, true);
});

await test("asking again replaces the earlier link", async () => {
  const db = await setup();
  const mailbox = fakeMailbox();
  await requestPasswordReset(db, "marcus@example.com", { appUrl: APP_URL, send: mailbox.send });
  await requestPasswordReset(db, "marcus@example.com", { appUrl: APP_URL, send: mailbox.send });
  const [first, second] = mailbox.sent.map((m) => mailbox.tokenFrom(m));

  assert.equal(storedTokens(db).length, 1);
  assert.deepEqual(await resetPasswordWithToken(db, first, "new password"), { ok: false, reason: "invalid_link" });
  assert.equal((await resetPasswordWithToken(db, second, "new password")).ok, true);
});

await test("made-up, malformed or plain-text-table tokens are refused", async () => {
  const db = await setup();
  issuePasswordResetToken(db, "marcus@example.com");
  const stored = storedTokens(db)[0].token_hash;
  for (const bad of [undefined, null, 123, "", "short", "x".repeat(300), "a".repeat(43), stored]) {
    assert.deepEqual(await resetPasswordWithToken(db, bad, "new password"), { ok: false, reason: "invalid_link" }, String(bad));
  }
  assert.equal((await verifyPassword("old password", await passwordOf(db))).ok, true);
});

await test("a missing new password is refused without using up the link", async () => {
  const db = await setup();
  const mailbox = fakeMailbox();
  await requestPasswordReset(db, "marcus@example.com", { appUrl: APP_URL, send: mailbox.send });
  const token = mailbox.tokenFrom(mailbox.sent[0]);
  assert.deepEqual(await resetPasswordWithToken(db, token, ""), { ok: false, reason: "password_required" });
  assert.equal((await resetPasswordWithToken(db, token, "new password")).ok, true);
});

await test("when the email can't be sent, no usable token is left behind", async () => {
  const db = await setup();
  const failing = async () => ({ sent: false as const, reason: "RESEND_API_KEY not set" });
  const outcome = await requestPasswordReset(db, "marcus@example.com", { appUrl: APP_URL, send: failing });
  assert.deepEqual(outcome, { status: "not_sent", userId: "u1", reason: "RESEND_API_KEY not set" });
  assert.equal(storedTokens(db).length, 0);

  const throwing = async () => {
    throw new Error("network down");
  };
  const thrown = await requestPasswordReset(db, "marcus@example.com", { appUrl: APP_URL, send: throwing });
  assert.equal(thrown.status, "not_sent");
  assert.equal(storedTokens(db).length, 0);
});

await test("without a safe APP_URL nothing is sent", async () => {
  const db = await setup();
  for (const appUrl of [undefined, "", "MY_APP_URL", "http://yard.example.com", "ftp://yard.example.com"]) {
    const mailbox = fakeMailbox();
    const outcome = await requestPasswordReset(db, "marcus@example.com", { appUrl, send: mailbox.send });
    assert.equal(outcome.status, "not_sent", String(appUrl));
    assert.equal(mailbox.sent.length, 0);
  }
  assert.equal(storedTokens(db).length, 0);
});

await test("buildResetLink keeps the app's path, drops its query and puts the token in the fragment", () => {
  assert.equal(buildResetLink("https://yard.example.com/app?x=1", "abc"), "https://yard.example.com/app#reset-token=abc");
  assert.equal(buildResetLink("http://localhost:3000", "abc"), "http://localhost:3000/#reset-token=abc");
});

await test("missingEmailSettings names what's not set, including placeholders", () => {
  assert.deepEqual(missingEmailSettings({}), ["RESEND_API_KEY", "EMAIL_FROM", "APP_URL"]);
  assert.deepEqual(missingEmailSettings({ RESEND_API_KEY: "re_x", EMAIL_FROM: "no-reply@yard.example.com", APP_URL: "MY_APP_URL" }), ["APP_URL"]);
  assert.deepEqual(missingEmailSettings({ RESEND_API_KEY: "re_x", EMAIL_FROM: "a@b.c", APP_URL: APP_URL }), []);
});

const message: ResetEmail = { to: "marcus@example.com", resetUrl: `${APP_URL}/#reset-token=abc`, expiresInMinutes: 30 };

await test("sendPasswordResetEmail sends nothing without a key or sender, and never throws", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return { ok: true, status: 200, text: async () => "{}" };
  };
  assert.deepEqual(await sendPasswordResetEmail(message, { env: {}, fetchImpl }), {
    sent: false,
    reason: "RESEND_API_KEY and EMAIL_FROM not set",
  });
  assert.deepEqual(await sendPasswordResetEmail(message, { env: { RESEND_API_KEY: "re_x" }, fetchImpl }), {
    sent: false,
    reason: "EMAIL_FROM not set",
  });
  assert.equal(calls, 0);
});

await test("sendPasswordResetEmail posts the email to Resend", async () => {
  const requests: { url: string; init: RequestInit }[] = [];
  const fetchImpl = async (url: string, init: RequestInit) => {
    requests.push({ url, init });
    return { ok: true, status: 200, text: async () => '{"id":"1"}' };
  };
  const env = { RESEND_API_KEY: "re_test", EMAIL_FROM: "no-reply@yard.example.com" };
  assert.deepEqual(await sendPasswordResetEmail(message, { env, fetchImpl }), { sent: true });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://api.resend.com/emails");
  assert.equal((requests[0].init.headers as Record<string, string>).Authorization, "Bearer re_test");
  const body = JSON.parse(String(requests[0].init.body));
  assert.equal(body.from, env.EMAIL_FROM);
  assert.deepEqual(body.to, ["marcus@example.com"]);
  assert.ok(body.text.includes(message.resetUrl));
  assert.equal(body.html, undefined, "plain text only");
});

await test("sendPasswordResetEmail reports Resend errors and network failures without throwing", async () => {
  const env = { RESEND_API_KEY: "re_test", EMAIL_FROM: "no-reply@yard.example.com" };
  const rejected = async () => ({
    ok: false,
    status: 403,
    text: async () => '{"name":"validation_error","message":"The yard.example.com domain is not verified."}',
  });
  const result = await sendPasswordResetEmail(message, { env, fetchImpl: rejected });
  assert.deepEqual(result, {
    sent: false,
    reason: "Resend answered 403 (validation_error: The yard.example.com domain is not verified.)",
  });
  assert.ok(!JSON.stringify(result).includes("reset-token"), "the link never appears in the result");

  const offline = async () => {
    throw new Error("getaddrinfo ENOTFOUND");
  };
  const down = await sendPasswordResetEmail(message, { env, fetchImpl: offline });
  assert.equal(down.sent, false);
});

await test("the email names the link's expiry", () => {
  const { subject, text } = passwordResetEmailContent(message);
  assert.equal(subject, "Reset your password for The Yard");
  assert.ok(text.includes("expires in 30 minutes"));
});

await test("FixedWindowLimiter allows the limit, then blocks until the window ends", () => {
  const limiter = new FixedWindowLimiter(3, 1000);
  assert.deepEqual([1, 2, 3, 4].map(() => limiter.take("ip", 0)), [true, true, true, false]);
  assert.equal(limiter.take("other-ip", 0), true, "keys are counted separately");
  assert.equal(limiter.take("ip", 1000), true, "a new window starts fresh");
});

await test("FixedWindowLimiter keeps memory bounded", () => {
  const limiter = new FixedWindowLimiter(1, 60_000, 100);
  for (let i = 0; i < 1000; i++) limiter.take(`key-${i}`, 0);
  assert.ok((limiter as unknown as { hits: Map<string, unknown> }).hits.size <= 100);
});

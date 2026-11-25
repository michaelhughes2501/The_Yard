import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import {
  BCRYPT_ROUNDS,
  hashPassword,
  hashPasswordSync,
  isPasswordHash,
  isUsablePassword,
  migratePlainTextPasswords,
  verifyPassword,
} from "./passwords";

function usersTable() {
  const db = new Database(":memory:");
  db.exec("CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT UNIQUE, password TEXT)");
  return db;
}

test("hashPassword stores a bcrypt hash, never the plain text", async () => {
  const hash = await hashPassword("correct horse");
  assert.notEqual(hash, "correct horse");
  assert.ok(isPasswordHash(hash));
  assert.equal(bcrypt.getRounds(hash), BCRYPT_ROUNDS);
  assert.ok(isPasswordHash(hashPasswordSync("correct horse")));
});

test("verifyPassword accepts the right password for a hash and rejects others", async () => {
  const hash = await hashPassword("correct horse");
  assert.deepEqual(await verifyPassword("correct horse", hash), { ok: true, needsRehash: false });
  assert.deepEqual(await verifyPassword("wrong", hash), { ok: false, needsRehash: false });
  assert.deepEqual(await verifyPassword("", hash), { ok: false, needsRehash: false });
  assert.deepEqual(await verifyPassword(undefined, hash), { ok: false, needsRehash: false });
});

test("verifyPassword still lets legacy plain-text accounts in and asks for a rehash", async () => {
  assert.deepEqual(await verifyPassword("password123", "password123"), { ok: true, needsRehash: true });
  assert.deepEqual(await verifyPassword("password12", "password123"), { ok: false, needsRehash: false });
});

test("verifyPassword asks to rehash hashes made with a lower work factor", async () => {
  const weak = bcrypt.hashSync("correct horse", 4);
  assert.deepEqual(await verifyPassword("correct horse", weak), { ok: true, needsRehash: true });
});

test("verifyPassword rejects accounts with no stored password", async () => {
  assert.deepEqual(await verifyPassword("anything", undefined), { ok: false, needsRehash: false });
  assert.deepEqual(await verifyPassword("anything", null), { ok: false, needsRehash: false });
  assert.deepEqual(await verifyPassword("", ""), { ok: false, needsRehash: false });
});

test("isUsablePassword only accepts non-empty strings", () => {
  assert.equal(isUsablePassword("a"), true);
  assert.equal(isUsablePassword(""), false);
  assert.equal(isUsablePassword(null), false);
  assert.equal(isUsablePassword(42), false);
});

test("migratePlainTextPasswords hashes plain-text rows and keeps their passwords working", async () => {
  const db = usersTable();
  const existing = await hashPassword("already hashed");
  const insert = db.prepare("INSERT INTO users (id, username, password) VALUES (?, ?, ?)");
  insert.run("1", "marcus", "password123");
  insert.run("2", "dana", existing);
  insert.run("3", "no-password", null);
  insert.run("4", "empty", "");

  assert.equal(await migratePlainTextPasswords(db), 1);

  const rows = Object.fromEntries(
    (db.prepare("SELECT id, password FROM users").all() as { id: string; password: string | null }[]).map((r) => [r.id, r.password]),
  );
  assert.ok(isPasswordHash(rows["1"]));
  assert.equal((await verifyPassword("password123", rows["1"])).ok, true);
  assert.equal(rows["2"], existing, "an existing hash is left alone");
  assert.equal(rows["3"], null);
  assert.equal(rows["4"], "");

  assert.equal(await migratePlainTextPasswords(db), 0, "running again changes nothing");
});

test("migratePlainTextPasswords does not overwrite a password changed while it ran", async () => {
  const db = usersTable();
  db.prepare("INSERT INTO users (id, username, password) VALUES (?, ?, ?)").run("1", "marcus", "old-plain");

  // Simulate a password reset landing between the migration's read and its write.
  const realPrepare = db.prepare.bind(db);
  let changed = false;
  const store = {
    prepare(sql: string) {
      const stmt = realPrepare(sql);
      if (!changed && sql.startsWith("UPDATE")) {
        changed = true;
        realPrepare("UPDATE users SET password = ? WHERE id = ?").run(hashPasswordSync("new-password"), "1");
      }
      return stmt;
    },
  };

  assert.equal(await migratePlainTextPasswords(store), 0);
  const { password } = db.prepare("SELECT password FROM users WHERE id = '1'").get() as { password: string };
  assert.equal((await verifyPassword("new-password", password)).ok, true);
  assert.equal((await verifyPassword("old-plain", password)).ok, false);
});

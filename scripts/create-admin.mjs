import { randomBytes, scryptSync } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { assertLocalDbFree } from "./check-local-db.mjs";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME?.trim() || "MAIGE 管理员";
const username = process.env.ADMIN_USERNAME?.trim().toLowerCase() || "admin";
const minLength = 8;
if (!email || !/^\S+@\S+\.\S+$/.test(email) || !password || password.length < minLength || !/^[a-z][a-z0-9._-]{2,31}$/.test(username)) {
  throw new Error(`Set ADMIN_EMAIL, ADMIN_USERNAME and a unique ADMIN_PASSWORD of at least ${minLength} characters in the environment`);
}
const salt = randomBytes(16).toString("hex");
const hash = `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
let db;
let close;
if (url) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  db = client;
  close = () => client.end();
} else {
  if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL_UNPOOLED required in production");
  await assertLocalDbFree(process.cwd());
  const dir = join(process.env.MAIGE_DATA_DIR || join(process.cwd(), ".data"), "postgres");
  await mkdir(dir, { recursive: true });
  const client = new PGlite(dir);
  await client.waitReady;
  db = client;
  close = () => client.close();
}
try {
  const existing = await db.query("SELECT id FROM users WHERE lower(email)=lower($1) OR lower(username)=lower($2) LIMIT 1", [email, username]);
  if (existing.rows.length && process.env.ADMIN_RESET_EXISTING !== "YES") {
    console.log(`Administrator already exists for ${username}; no credentials changed.`);
  } else if (existing.rows.length) {
    await db.query("UPDATE users SET username=$2,email=$3,display_name=$4,password_hash=$5,role_id='superadmin',active=true,must_change_password=true,locked_until=NULL,updated_at=now() WHERE id=$1", [existing.rows[0].id, username, email, name, hash]);
    await db.query("UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL", [existing.rows[0].id]);
    console.log(`Administrator credentials rotated for ${username}. Password was not printed.`);
  } else {
    await db.query("INSERT INTO users(username,email,display_name,password_hash,role_id,must_change_password) VALUES($1,$2,$3,$4,'superadmin',true)", [username, email, name, hash]);
    console.log(`Initial administrator ready: ${username}. Password was not printed.`);
  }
} finally { await close(); }

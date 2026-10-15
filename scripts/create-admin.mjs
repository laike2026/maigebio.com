import { randomBytes, scryptSync } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { assertLocalDbFree } from "./check-local-db.mjs";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME?.trim() || "MAIGE 管理员";
if (!email || !/^\S+@\S+\.\S+$/.test(email) || !password || password.length < 14) {
  throw new Error("Set ADMIN_EMAIL and a unique ADMIN_PASSWORD of at least 14 characters in the environment");
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
  await db.query("INSERT INTO users(email,display_name,password_hash,role_id,must_change_password) VALUES($1,$2,$3,'superadmin',true) ON CONFLICT(email) DO NOTHING", [email, name, hash]);
  console.log(`Initial administrator ready: ${email}. Password was not printed.`);
} finally { await close(); }

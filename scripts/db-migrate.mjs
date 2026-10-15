import { readFile, readdir, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { assertLocalDbFree } from "./check-local-db.mjs";

const root = process.cwd();
const dir = join(root, "db", "migrations");
const files = (await readdir(dir)).filter((name) => /^\d+_.*\.sql$/.test(name)).sort();
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
let db;
let close;
if (url) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  db = { query: (sql, params = []) => client.query(sql, params), exec: (sql) => client.query(sql) };
  close = () => client.end();
} else {
  if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL_UNPOOLED required in production");
  await assertLocalDbFree(root);
  const dataDir = join(process.env.MAIGE_DATA_DIR || join(root, ".data"), "postgres");
  await mkdir(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  await client.waitReady;
  db = { query: (sql, params = []) => client.query(sql, params), exec: (sql) => client.exec(sql) };
  close = () => client.close();
}
try {
  await db.query("CREATE TABLE IF NOT EXISTS schema_migrations(id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  for (const name of files) {
    if ((await db.query("SELECT id FROM schema_migrations WHERE id=$1", [name])).rows.length) continue;
    const sql = await readFile(join(dir, name), "utf8");
    await db.query("BEGIN");
    try {
      await db.exec(sql);
      await db.query("INSERT INTO schema_migrations(id) VALUES($1)", [name]);
      await db.query("COMMIT");
      console.log(`Applied ${name}`);
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    }
  }
  console.log("Database migrations complete");
} finally { await close(); }

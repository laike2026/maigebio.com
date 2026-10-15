import { readFile, mkdir, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { PGlite } from "@electric-sql/pglite";

const source = process.argv[2];
if (!source) throw new Error("Usage: pnpm db:restore <backup-file> (RESTORE_TARGET for local or RESTORE_CONFIRM=YES for remote)");
const file = resolve(source);
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (url) {
  if (process.env.RESTORE_CONFIRM !== "YES") throw new Error("Set RESTORE_CONFIRM=YES to restore the remote database");
  await new Promise((resolvePromise, reject) => {
    const child = spawn("pg_restore", ["--clean", "--if-exists", "--no-owner", "--no-acl", "--dbname", url, file], { stdio: ["ignore", "inherit", "inherit"] });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolvePromise() : reject(new Error(`pg_restore exited ${code}`)));
  });
  console.log("Remote database restore completed; run migrations before serving traffic");
} else {
  const target = process.env.RESTORE_TARGET;
  if (!target) throw new Error("Set RESTORE_TARGET to a NEW directory; the active local database is never overwritten");
  const destination = resolve(target);
  if (destination === resolve(process.env.MAIGE_DATA_DIR || ".data", "postgres")) throw new Error("Active database cannot be overwritten");
  await mkdir(destination, { recursive: true, mode: 0o700 });
  if ((await readdir(destination)).length) throw new Error("RESTORE_TARGET must be empty");
  const bytes = await readFile(file);
  const db = new PGlite({ dataDir: destination, loadDataDir: new Blob([bytes]) });
  await db.waitReady;
  try { const check = await db.query("SELECT count(*)::int AS count FROM schema_migrations"); console.log(`Restore verified: ${check.rows[0].count} migrations in ${destination}`); }
  finally { await db.close(); }
}

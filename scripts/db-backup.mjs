import { mkdir, writeFile, readdir, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { PGlite } from "@electric-sql/pglite";
import { assertLocalDbFree } from "./check-local-db.mjs";

const root = process.cwd();
const dataRoot = process.env.MAIGE_DATA_DIR || join(root, ".data");
const directory = process.env.BACKUP_DIR || join(dataRoot, "backups");
await mkdir(directory, { recursive: true, mode: 0o700 });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (url) {
  const target = join(directory, `maige-${stamp}.dump`);
  await new Promise((resolve, reject) => {
    const child = spawn("pg_dump", ["--format=custom", "--no-owner", "--no-acl", "--file", target, url], { stdio: ["ignore", "inherit", "inherit"] });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`pg_dump exited ${code}`)));
  });
  console.log(`Backup saved: ${target}`);
} else {
  await assertLocalDbFree(root);
  const source = join(dataRoot, "postgres");
  const db = new PGlite(source);
  await db.waitReady;
  try {
    const blob = await db.dumpDataDir("gzip");
    const target = join(directory, `maige-${stamp}.tar.gz`);
    await writeFile(target, Buffer.from(await blob.arrayBuffer()), { mode: 0o600, flag: "wx" });
    console.log(`Backup saved: ${target}`);
  } finally { await db.close(); }
}
const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS || 30);
if (Number.isInteger(retentionDays) && retentionDays > 0) {
  const cutoff = Date.now() - retentionDays * 86400_000;
  for (const name of await readdir(directory)) {
    if (!/^maige-\d{4}-\d{2}-\d{2}T[\dZ-]+\.(dump|tar\.gz)$/.test(name)) continue;
    const path = join(directory, name);
    if ((await stat(path)).mtimeMs < cutoff) await unlink(path);
  }
}

import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function assertLocalDbFree(root = process.cwd()) {
  const lock = join(process.env.MAIGE_DATA_DIR || join(root, ".data"), "postgres.server.pid");
  let pid;
  try { pid = Number((await readFile(lock, "utf8")).trim()); } catch { return; }
  if (!Number.isInteger(pid) || pid <= 0) return;
  try { process.kill(pid, 0); } catch { return; }
  throw new Error(`Local development server (PID ${pid}) is using PGlite. Stop it before running database maintenance scripts.`);
}

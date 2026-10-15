import "server-only";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { unlinkSync } from "node:fs";
import { join } from "node:path";
import type { QueryResultRow } from "pg";

export type DbRow = Record<string, unknown>;
export type QueryResult<T extends DbRow = DbRow> = { rows: T[]; rowCount: number };
export type DbClient = {
  query<T extends DbRow = DbRow>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  transaction<T>(work: (client: Pick<DbClient, "query">) => Promise<T>): Promise<T>;
};

type DbState = { client?: Promise<DbClient> };
const state = globalThis as typeof globalThis & { __maigeDb?: DbState };

async function createClient(): Promise<DbClient> {
  if (process.env.DATABASE_URL) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 20_000 });
    return {
      async query<T extends DbRow = DbRow>(sql: string, params: unknown[] = []) {
        const result = await pool.query<QueryResultRow>(sql, params);
        return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
      },
      async transaction<T>(work: (client: Pick<DbClient, "query">) => Promise<T>) {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const value = await work({ query: async <R extends DbRow = DbRow>(sql: string, params: unknown[] = []) => {
            const result = await client.query<QueryResultRow>(sql, params);
            return { rows: result.rows as R[], rowCount: result.rowCount ?? 0 };
          } });
          await client.query("COMMIT");
          return value;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally { client.release(); }
      },
    };
  }
  if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL is required in production");
  const dataRoot = process.env.MAIGE_DATA_DIR || join(process.cwd(), ".data");
  const dir = join(dataRoot, "postgres");
  await mkdir(dir, { recursive: true });
  const lock = join(dataRoot, "postgres.server.pid");
  try {
    const owner = Number((await readFile(lock, "utf8")).trim());
    if (owner !== process.pid && Number.isInteger(owner)) {
      try { process.kill(owner, 0); throw new Error(`PGlite is already open in process ${owner}`); }
      catch (error) { if (error instanceof Error && error.message.startsWith("PGlite is already")) throw error; await unlink(lock); }
    }
  } catch (error) { if (error instanceof Error && error.message.startsWith("PGlite is already")) throw error; }
  await writeFile(lock, String(process.pid), { mode: 0o600 });
  process.once("exit", () => { try { unlinkSync(lock); } catch { /* process already cleaned */ } });
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite(dir);
  await db.waitReady;
  return {
    async query<T extends DbRow = DbRow>(sql: string, params: unknown[] = []) {
      const result = await db.query<T>(sql, params);
      return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
    },
    async transaction<T>(work: (client: Pick<DbClient, "query">) => Promise<T>) {
      return db.transaction(async (tx) => work({ query: async <R extends DbRow = DbRow>(sql: string, params: unknown[] = []) => {
        const result = await tx.query<R>(sql, params);
        return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
      } }));
    },
  };
}

export async function getDb(): Promise<DbClient> {
  state.__maigeDb ??= {};
  state.__maigeDb.client ??= createClient();
  return state.__maigeDb.client;
}

export async function query<T extends DbRow = DbRow>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
  return (await getDb()).query<T>(sql, params);
}

export async function transaction<T>(work: (client: Pick<DbClient, "query">) => Promise<T>): Promise<T> {
  return (await getDb()).transaction(work);
}

export function isUniqueViolation(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "23505");
}

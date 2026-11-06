import "server-only";
import type { DbClient } from "@/lib/db";

export async function recoverInterruptedJobs(db: Pick<DbClient, "query">, source?: string) {
  // The longest scheduled handler is capped at 60 seconds. Leave room for the runtime to wind down.
  return db.query(`UPDATE sync_jobs SET status='failed',finished_at=now(),run_after=now(),
    error_code='SYNC_INTERRUPTED',error_detail='SYNC_INTERRUPTED'
    WHERE status='running' AND (started_at IS NULL OR started_at<now()-interval '5 minutes')
      AND ($1::text IS NULL OR source_id=$1)`, [source ?? null]);
}

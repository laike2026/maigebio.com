import "server-only";
import { query } from "@/lib/db";

export async function allowAdminRate(scope: string, userId: string, maxPerMinute: number) {
  const result = await query<{ request_count: number }>(`INSERT INTO api_rate_limits(scope,actor_id,minute_bucket,request_count)
    VALUES($1,$2,date_trunc('minute',now()),1)
    ON CONFLICT(scope,actor_id,minute_bucket) DO UPDATE SET request_count=api_rate_limits.request_count+1
    RETURNING request_count`, [scope, userId]);
  return Number(result.rows[0]?.request_count || 0) <= maxPerMinute;
}

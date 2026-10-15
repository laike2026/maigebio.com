CREATE TABLE IF NOT EXISTS api_rate_limits (
  scope text NOT NULL,
  actor_id text NOT NULL,
  minute_bucket timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  PRIMARY KEY(scope,actor_id,minute_bucket)
);
CREATE INDEX IF NOT EXISTS api_rate_limits_bucket_idx ON api_rate_limits(minute_bucket);

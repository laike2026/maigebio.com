ALTER TABLE export_jobs ADD COLUMN IF NOT EXISTS query_text text NOT NULL DEFAULT '';
ALTER TABLE export_jobs ADD COLUMN IF NOT EXISTS total_count integer NOT NULL DEFAULT 0;
ALTER TABLE export_jobs ADD COLUMN IF NOT EXISTS processed_count integer NOT NULL DEFAULT 0;
ALTER TABLE export_jobs ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE export_jobs ADD COLUMN IF NOT EXISTS error_text text;
CREATE INDEX IF NOT EXISTS export_jobs_pending_idx ON export_jobs(status,created_at);
CREATE TABLE IF NOT EXISTS export_job_chunks (
  job_id uuid NOT NULL REFERENCES export_jobs(id) ON DELETE CASCADE,
  sequence integer NOT NULL,
  csv_text text NOT NULL,
  PRIMARY KEY (job_id,sequence)
);

ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS source_key text;
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS total_count integer NOT NULL DEFAULT 0;
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS processed_count integer NOT NULL DEFAULT 0;
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS import_jobs_status_idx ON import_jobs(status, updated_at);

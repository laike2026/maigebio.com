CREATE TABLE IF NOT EXISTS data_sync_state (
  source_id text PRIMARY KEY REFERENCES sync_sources(id) ON DELETE CASCADE,
  covered_through date NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO data_sync_state(source_id,covered_through)
SELECT id,date '2026-10-13'
FROM sync_sources WHERE id IN ('ga4','search_console')
ON CONFLICT(source_id) DO NOTHING;

UPDATE sync_sources SET enabled=true,frequency_minutes=4320,
  next_run_at=COALESCE(last_success_at + interval '72 hours',now()),updated_at=now()
WHERE id IN ('ga4','search_console');
UPDATE sync_sources SET frequency_minutes=1440,updated_at=now() WHERE id='email_retry';

UPDATE news_articles SET status='draft',updated_at=now(),version=version+1
WHERE status='published' AND published_at>now();

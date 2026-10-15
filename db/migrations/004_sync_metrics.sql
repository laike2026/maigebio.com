CREATE TABLE IF NOT EXISTS ga4_daily_metrics (
  day date PRIMARY KEY,
  users bigint NOT NULL DEFAULT 0,
  sessions bigint NOT NULL DEFAULT 0,
  page_views bigint NOT NULL DEFAULT 0,
  synced_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS seo_metrics_day_idx ON seo_metrics(day DESC);
CREATE INDEX IF NOT EXISTS sync_jobs_created_idx ON sync_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS lead_notes_submission_idx ON lead_notes(submission_id,created_at DESC);
INSERT INTO system_settings(key,value) VALUES
 ('tracking','{"addressLabel":"","addressUrl":"","whatsappLabel":"WhatsApp","whatsappUrl":"https://wa.me/qr/HLNDA5AQMXHME1"}'),
 ('seo','{"searchConsoleProperty":"sc-domain:maigebio.com","indexingEnabled":true}')
ON CONFLICT (key) DO NOTHING;

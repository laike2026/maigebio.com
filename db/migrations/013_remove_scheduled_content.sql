UPDATE products SET status='draft', updated_at=now(), version=version+1 WHERE status='scheduled';
UPDATE news_articles SET status='draft', updated_at=now(), version=version+1 WHERE status='scheduled';

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE products ADD CONSTRAINT products_status_check CHECK (status IN ('draft','review','published','unlisted','archived'));
ALTER TABLE news_articles DROP CONSTRAINT IF EXISTS news_articles_status_check;
ALTER TABLE news_articles ADD CONSTRAINT news_articles_status_check CHECK (status IN ('draft','review','published','unlisted','archived'));
ALTER TABLE products DROP COLUMN IF EXISTS scheduled_at;
ALTER TABLE news_articles DROP COLUMN IF EXISTS scheduled_at;

CREATE TABLE IF NOT EXISTS retired_content_publish_jobs AS SELECT * FROM sync_jobs WHERE false;
INSERT INTO retired_content_publish_jobs SELECT * FROM sync_jobs WHERE source_id='content_publish';
DELETE FROM sync_jobs WHERE source_id='content_publish';
DELETE FROM sync_sources WHERE id='content_publish';

INSERT INTO sync_sources(id,name_zh,enabled,frequency_minutes,next_run_at)
VALUES (
  'google_sitemap','Google 站点地图提交',true,10080,
  ((date_trunc('week', now() AT TIME ZONE 'Asia/Shanghai') + interval '9 hours'
    + CASE WHEN (now() AT TIME ZONE 'Asia/Shanghai') > (date_trunc('week', now() AT TIME ZONE 'Asia/Shanghai') + interval '9 hours')
      THEN interval '7 days' ELSE interval '0 days' END) AT TIME ZONE 'Asia/Shanghai')
)
ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
  id text PRIMARY KEY,
  name_zh text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  system_role boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  role_id text NOT NULL REFERENCES roles(id),
  active boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT true,
  locked_until timestamptz,
  last_login_at timestamptz,
  last_login_ip text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS login_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL,
  ip text,
  success boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_attempts_email_time_idx ON login_attempts(email, created_at DESC);

CREATE TABLE IF NOT EXISTS password_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_key text NOT NULL UNIQUE,
  url text NOT NULL,
  original_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  sha256 text NOT NULL,
  kind text NOT NULL DEFAULT 'other',
  alt_text text NOT NULL DEFAULT '',
  caption text NOT NULL DEFAULT '',
  width integer,
  height integer,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS media_sha_idx ON media_assets(sha256) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_zh text NOT NULL DEFAULT '',
  parent_id uuid REFERENCES product_categories(id),
  summary_en text NOT NULL DEFAULT '',
  description_html_en text NOT NULL DEFAULT '',
  image_id uuid REFERENCES media_assets(id),
  icon text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  show_in_nav boolean NOT NULL DEFAULT false,
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES users(id),
  updated_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT category_not_self_parent CHECK (id <> parent_id)
);
CREATE INDEX IF NOT EXISTS product_categories_parent_idx ON product_categories(parent_id, sort_order) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  primary_category_id uuid REFERENCES product_categories(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','published','scheduled','unlisted','archived')),
  name_en text NOT NULL,
  summary_en text NOT NULL DEFAULT '',
  description_html_en text NOT NULL DEFAULT '',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  applications jsonb NOT NULL DEFAULT '[]'::jsonb,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  specifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  media_id uuid REFERENCES media_assets(id),
  video_url text NOT NULL DEFAULT '',
  minimum_order text NOT NULL DEFAULT '',
  lead_time text NOT NULL DEFAULT '',
  price_mode text NOT NULL DEFAULT 'quote' CHECK (price_mode IN ('hidden','fixed','range','contact','quote')),
  price_min numeric(14,2),
  price_max numeric(14,2),
  featured boolean NOT NULL DEFAULT false,
  pinned boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz,
  scheduled_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES users(id),
  updated_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS products_status_pub_idx ON products(status, published_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS products_category_idx ON products(primary_category_id, sort_order) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS product_category_links (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);
CREATE TABLE IF NOT EXISTS product_media (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES media_assets(id),
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, media_id)
);
CREATE TABLE IF NOT EXISTS product_relations (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  related_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, related_id),
  CONSTRAINT product_not_self_related CHECK (product_id <> related_id)
);
CREATE TABLE IF NOT EXISTS product_translations (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  locale text NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  summary text NOT NULL DEFAULT '',
  description_html text NOT NULL DEFAULT '',
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  translation_status text NOT NULL DEFAULT 'missing' CHECK (translation_status IN ('missing','in_progress','complete')),
  PRIMARY KEY (product_id, locale),
  UNIQUE (locale, slug)
);

CREATE TABLE IF NOT EXISTS news_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_zh text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  category_id uuid REFERENCES news_categories(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','published','scheduled','unlisted','archived')),
  title_en text NOT NULL,
  excerpt_en text NOT NULL DEFAULT '',
  body_html_en text NOT NULL DEFAULT '',
  author text NOT NULL DEFAULT '',
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  cover_id uuid REFERENCES media_assets(id),
  featured boolean NOT NULL DEFAULT false,
  pinned boolean NOT NULL DEFAULT false,
  views bigint NOT NULL DEFAULT 0,
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz,
  scheduled_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES users(id),
  updated_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS news_status_pub_idx ON news_articles(status, published_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS news_category_idx ON news_articles(category_id, published_at DESC) WHERE deleted_at IS NULL;
CREATE TABLE IF NOT EXISTS news_translations (
  article_id uuid NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
  locale text NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  translation_status text NOT NULL DEFAULT 'missing' CHECK (translation_status IN ('missing','in_progress','complete')),
  PRIMARY KEY (article_id, locale),
  UNIQUE (locale, slug)
);

CREATE TABLE IF NOT EXISTS form_definitions (
  id text PRIMARY KEY,
  name_zh text NOT NULL,
  type text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lead_statuses (
  id text PRIMARY KEY,
  name_zh text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  system_status boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id text REFERENCES form_definitions(id),
  type text NOT NULL DEFAULT 'contact',
  name text NOT NULL,
  company text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  country text NOT NULL,
  message text NOT NULL,
  product_interest text NOT NULL DEFAULT '',
  product_id uuid REFERENCES products(id),
  source_page text NOT NULL DEFAULT '',
  page_url text NOT NULL DEFAULT '',
  referrer text NOT NULL DEFAULT '',
  utm_source text NOT NULL DEFAULT '',
  utm_medium text NOT NULL DEFAULT '',
  utm_campaign text NOT NULL DEFAULT '',
  utm_content text NOT NULL DEFAULT '',
  utm_term text NOT NULL DEFAULT '',
  locale text NOT NULL DEFAULT 'en',
  consent boolean NOT NULL DEFAULT false,
  ip_hash text,
  browser text NOT NULL DEFAULT '',
  device_type text NOT NULL DEFAULT '',
  status_id text NOT NULL DEFAULT 'new' REFERENCES lead_statuses(id),
  owner_id uuid REFERENCES users(id),
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  notification_status text NOT NULL DEFAULT 'pending' CHECK (notification_status IN ('pending','sent','failed')),
  notification_attempts integer NOT NULL DEFAULT 0,
  message_id text,
  duplicate_of uuid REFERENCES form_submissions(id),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS form_submissions_time_idx ON form_submissions(submitted_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS form_submissions_status_idx ON form_submissions(status_id, submitted_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS form_submissions_email_idx ON form_submissions(lower(email));
CREATE INDEX IF NOT EXISTS form_submissions_country_idx ON form_submissions(country, submitted_at DESC);
CREATE TABLE IF NOT EXISTS lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  page_path text NOT NULL DEFAULT '',
  placement text NOT NULL DEFAULT '',
  locale text NOT NULL DEFAULT '',
  form_id text NOT NULL DEFAULT '',
  product_slug text NOT NULL DEFAULT '',
  session_hash text,
  field_name text NOT NULL DEFAULT '',
  event_key text UNIQUE
);
CREATE INDEX IF NOT EXISTS analytics_events_time_name_idx ON analytics_events(occurred_at DESC, event_name);
CREATE INDEX IF NOT EXISTS analytics_events_page_idx ON analytics_events(page_path, occurred_at DESC);
CREATE TABLE IF NOT EXISTS analytics_daily_summary (
  day date NOT NULL,
  event_name text NOT NULL,
  page_path text NOT NULL DEFAULT '',
  placement text NOT NULL DEFAULT '',
  locale text NOT NULL DEFAULT '',
  field_name text NOT NULL DEFAULT '',
  event_count bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (day,event_name,page_path,placement,locale,field_name)
);

CREATE TABLE IF NOT EXISTS seo_metrics (
  day date NOT NULL,
  page_path text NOT NULL,
  query text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  device text NOT NULL DEFAULT '',
  clicks bigint NOT NULL DEFAULT 0,
  impressions bigint NOT NULL DEFAULT 0,
  position numeric(8,2),
  PRIMARY KEY (day,page_path,query,country,device)
);
CREATE TABLE IF NOT EXISTS seo_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  page_path text NOT NULL,
  details text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  owner_id uuid REFERENCES users(id),
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  UNIQUE (issue_type,page_path)
);
CREATE TABLE IF NOT EXISTS redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_path text NOT NULL UNIQUE,
  target_path text NOT NULL,
  status_code integer NOT NULL DEFAULT 301 CHECK (status_code IN (301,302)),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sync_sources (
  id text PRIMARY KEY,
  name_zh text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  frequency_minutes integer NOT NULL DEFAULT 60,
  last_success_at timestamptz,
  last_error text,
  next_run_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL REFERENCES sync_sources(id),
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','succeeded','failed')),
  attempt integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  run_after timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  duration_ms integer,
  processed_count integer NOT NULL DEFAULT 0,
  error_code text,
  error_detail text,
  cursor text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sync_jobs_due_idx ON sync_jobs(status,run_after) WHERE status IN ('pending','failed');
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  action text NOT NULL,
  module text NOT NULL,
  object_type text NOT NULL DEFAULT '',
  object_id text NOT NULL DEFAULT '',
  before_summary jsonb,
  after_summary jsonb,
  ip text,
  user_agent text,
  success boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_time_idx ON audit_logs(created_at DESC);
CREATE TABLE IF NOT EXISTS system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  filename text NOT NULL,
  success_count integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  error_report jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE TABLE IF NOT EXISTS export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  object_key text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

INSERT INTO roles(id,name_zh,permissions,system_role) VALUES
 ('superadmin','超级管理员','["*"]',true),
 ('admin','管理员','["dashboard:view","products:*","categories:*","news:*","news_categories:*","media:*","leads:*","analytics:*","seo:*","sync:*","users:view","audit:view","settings:view"]',true),
 ('editor','内容编辑','["dashboard:view","products:view","products:create","products:update","products:publish","categories:view","news:view","news:create","news:update","news:publish","news_categories:view","media:view","media:create","seo:view"]',true),
 ('marketing','市场人员','["dashboard:view","products:view","news:view","news:create","news:update","news:publish","media:view","media:create","analytics:view","seo:view","seo:update"]',true),
 ('sales','销售人员','["dashboard:view","products:view","leads:view","leads:update","leads:export","analytics:view"]',true),
 ('analyst','数据分析人员','["dashboard:view","analytics:view","analytics:export","seo:view","sync:view"]',true),
 ('readonly','只读用户','["dashboard:view","products:view","categories:view","news:view","news_categories:view","analytics:view","seo:view"]',true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO lead_statuses(id,name_zh,sort_order,system_status) VALUES
 ('new','新询盘',10,true),('pending','待联系',20,true),('contacted','已联系',30,true),
 ('qualified','有效线索',40,true),('unqualified','无效线索',50,true),('quoting','报价中',60,true),
 ('won','已成交',70,true),('lost','未成交',80,true),('spam','垃圾信息',90,true),('archived','已归档',100,true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_definitions(id,name_zh,type) VALUES ('contact','联系与询价','contact') ON CONFLICT (id) DO NOTHING;
INSERT INTO sync_sources(id,name_zh,frequency_minutes) VALUES
 ('ga4','GA4 访问分析',60),('search_console','Google Search Console',360),('seo_audit','站内 SEO 检查',1440),('content_publish','定时内容发布',5),('email_retry','询盘邮件重试',5)
ON CONFLICT (id) DO NOTHING;
INSERT INTO system_settings(key,value) VALUES
 ('site','{"name":"MAIGE Bio","defaultLocale":"en","timezone":"Asia/Shanghai","dateFormat":"yyyy-MM-dd","pageSize":20}'),
 ('retention','{"analyticsDays":365,"loginDays":90,"auditDays":730}'),
 ('upload','{"maxBytes":10485760,"allowedTypes":["image/jpeg","image/png","image/webp","application/pdf"]}')
ON CONFLICT (key) DO NOTHING;

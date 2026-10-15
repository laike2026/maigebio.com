ALTER TABLE users ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_email text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_change_token_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_change_expires_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_change_requested_at timestamptz;

WITH ranked AS (
  SELECT id, role_id, row_number() OVER (PARTITION BY role_id ORDER BY created_at, id) AS position
  FROM users WHERE username IS NULL
)
UPDATE users u SET username = CASE
  WHEN ranked.role_id = 'superadmin' AND ranked.position = 1
    AND NOT EXISTS (SELECT 1 FROM users existing WHERE lower(existing.username) = 'admin') THEN 'admin'
  ELSE 'user-' || replace(u.id::text, '-', '')
END
FROM ranked WHERE u.id = ranked.id;

CREATE UNIQUE INDEX IF NOT EXISTS users_username_ci_unique ON users(lower(username)) WHERE username IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_ci_unique ON users(lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_change_token_unique ON users(email_change_token_hash) WHERE email_change_token_hash IS NOT NULL;

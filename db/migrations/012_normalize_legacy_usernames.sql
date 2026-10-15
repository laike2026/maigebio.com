UPDATE users
SET username = 'user-' || left(replace(id::text, '-', ''), 26), updated_at = now()
WHERE username LIKE 'user-%' AND length(username) > 32;

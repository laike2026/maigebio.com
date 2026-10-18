INSERT INTO sync_sources(id,name_zh,frequency_minutes) VALUES('retention_cleanup','数据保留期清理',1440) ON CONFLICT(id) DO NOTHING;
UPDATE sync_sources SET enabled=true WHERE id IN ('email_retry','retention_cleanup');

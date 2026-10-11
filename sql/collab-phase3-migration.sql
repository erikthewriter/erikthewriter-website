-- Execute ONCE in Cloudflare D1 Console before deploying Phase 3.
ALTER TABLE collab_requests ADD COLUMN discord_message_id TEXT;
ALTER TABLE collab_requests ADD COLUMN handled_at TEXT;
ALTER TABLE collab_requests ADD COLUMN handled_by TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS collab_discord_message_id ON collab_requests(discord_message_id);

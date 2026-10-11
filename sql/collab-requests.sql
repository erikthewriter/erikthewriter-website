CREATE TABLE IF NOT EXISTS collab_requests (
 id TEXT PRIMARY KEY,
 game_appid INTEGER NOT NULL,
 game_name TEXT NOT NULL,
 request_type TEXT NOT NULL CHECK (request_type IN ('on-stream','off-stream','either')),
 contact_platform TEXT NOT NULL CHECK (contact_platform IN ('Discord','Twitch')),
 contact_handle TEXT NOT NULL,
 timing TEXT NOT NULL CHECK (timing IN ('flexible','specific','discuss')),
 preferred_date TEXT,
 message TEXT,
 status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Accepted','Declined','Scheduled')),
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 notified_at TEXT
);
CREATE INDEX IF NOT EXISTS collab_requests_created ON collab_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS collab_requests_contact_recent ON collab_requests(contact_platform, contact_handle, created_at DESC);

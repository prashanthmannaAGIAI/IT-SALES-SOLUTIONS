CREATE TABLE IF NOT EXISTS admin_settings (
  setting_key TEXT PRIMARY KEY CHECK (length(setting_key) BETWEEN 1 AND 80),
  setting_value TEXT NOT NULL CHECK (length(setting_value) <= 500),
  updated_by TEXT NOT NULL CHECK (length(updated_by) BETWEEN 3 AND 254),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE IF NOT EXISTS ai_agent_settings (
  agent_id TEXT PRIMARY KEY CHECK (length(agent_id) BETWEEN 1 AND 80),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  updated_by TEXT NOT NULL CHECK (length(updated_by) BETWEEN 3 AND 254),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY CHECK (length(id) = 36),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 180),
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'archived')),
  summary TEXT NOT NULL DEFAULT '' CHECK (length(summary) <= 2000),
  owner_email TEXT CHECK (owner_email IS NULL OR length(owner_email) <= 254),
  created_by TEXT NOT NULL CHECK (length(created_by) BETWEEN 3 AND 254),
  updated_by TEXT NOT NULL CHECK (length(updated_by) BETWEEN 3 AND 254),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX IF NOT EXISTS projects_status_updated_idx ON projects(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS proposal_drafts (
  id TEXT PRIMARY KEY CHECK (length(id) = 36),
  project_id TEXT REFERENCES projects(id) ON UPDATE CASCADE ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 180),
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 16000),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected')),
  created_by TEXT NOT NULL CHECK (length(created_by) BETWEEN 3 AND 254),
  updated_by TEXT NOT NULL CHECK (length(updated_by) BETWEEN 3 AND 254),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX IF NOT EXISTS proposal_drafts_status_updated_idx ON proposal_drafts(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS approval_queue (
  id TEXT PRIMARY KEY CHECK (length(id) = 36),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('proposal', 'sensitive_action')),
  resource_id TEXT NOT NULL CHECK (length(resource_id) <= 120),
  requested_by TEXT NOT NULL CHECK (length(requested_by) BETWEEN 3 AND 254),
  summary TEXT NOT NULL CHECK (length(summary) BETWEEN 1 AND 500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT,
  review_note TEXT CHECK (review_note IS NULL OR length(review_note) <= 1000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  reviewed_at TEXT
) STRICT;

CREATE INDEX IF NOT EXISTS approval_queue_status_created_idx ON approval_queue(status, created_at DESC);

INSERT OR IGNORE INTO admin_settings (setting_key, setting_value, updated_by)
VALUES ('assistant_enabled', 'true', 'system:bootstrap');

INSERT OR IGNORE INTO ai_agent_settings (agent_id, enabled, updated_by)
VALUES
  ('research', 1, 'system:bootstrap'),
  ('industry-solutions', 1, 'system:bootstrap'),
  ('business-consultant', 1, 'system:bootstrap'),
  ('ai-solutions-architect', 1, 'system:bootstrap'),
  ('automation', 1, 'system:bootstrap'),
  ('cloud-devops', 1, 'system:bootstrap'),
  ('knowledge', 1, 'system:bootstrap'),
  ('sales-assistant', 1, 'system:bootstrap'),
  ('analytics', 1, 'system:bootstrap'),
  ('customer-support', 1, 'system:bootstrap'),
  ('responsible-ai-guardrail', 1, 'system:bootstrap');

CREATE TABLE IF NOT EXISTS ai_knowledge (
  slug TEXT PRIMARY KEY CHECK (length(slug) BETWEEN 1 AND 120),
  category TEXT NOT NULL CHECK (length(category) BETWEEN 1 AND 80),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 180),
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 12000),
  tags_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tags_json)),
  approved INTEGER NOT NULL DEFAULT 0 CHECK (approved IN (0, 1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX IF NOT EXISTS ai_knowledge_approved_active_idx
ON ai_knowledge(approved, active, category);

CREATE TABLE IF NOT EXISTS ai_request_limits (
  key_hash TEXT NOT NULL CHECK (length(key_hash) = 64),
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count > 0),
  PRIMARY KEY (key_hash, window_start)
) STRICT;

CREATE TABLE IF NOT EXISTS ai_daily_limits (
  usage_date TEXT PRIMARY KEY CHECK (length(usage_date) = 10),
  request_count INTEGER NOT NULL CHECK (request_count > 0),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE IF NOT EXISTS ai_usage_daily (
  usage_date TEXT NOT NULL CHECK (length(usage_date) = 10),
  model TEXT NOT NULL CHECK (length(model) BETWEEN 1 AND 120),
  successes INTEGER NOT NULL DEFAULT 0 CHECK (successes >= 0),
  failures INTEGER NOT NULL DEFAULT 0 CHECK (failures >= 0),
  prompt_tokens INTEGER NOT NULL DEFAULT 0 CHECK (prompt_tokens >= 0),
  completion_tokens INTEGER NOT NULL DEFAULT 0 CHECK (completion_tokens >= 0),
  duration_ms INTEGER NOT NULL DEFAULT 0 CHECK (duration_ms >= 0),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (usage_date, model)
) STRICT;

CREATE INDEX IF NOT EXISTS ai_usage_daily_date_idx ON ai_usage_daily(usage_date DESC);

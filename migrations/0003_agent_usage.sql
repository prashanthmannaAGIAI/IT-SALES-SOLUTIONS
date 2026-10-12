CREATE TABLE IF NOT EXISTS ai_agent_usage_daily (
  usage_date TEXT NOT NULL CHECK (length(usage_date) = 10),
  agent_id TEXT NOT NULL CHECK (length(agent_id) BETWEEN 1 AND 80),
  invocations INTEGER NOT NULL DEFAULT 0 CHECK (invocations >= 0),
  successes INTEGER NOT NULL DEFAULT 0 CHECK (successes >= 0),
  failures INTEGER NOT NULL DEFAULT 0 CHECK (failures >= 0),
  prompt_tokens INTEGER NOT NULL DEFAULT 0 CHECK (prompt_tokens >= 0),
  completion_tokens INTEGER NOT NULL DEFAULT 0 CHECK (completion_tokens >= 0),
  duration_ms INTEGER NOT NULL DEFAULT 0 CHECK (duration_ms >= 0),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (usage_date, agent_id)
) STRICT;

CREATE INDEX IF NOT EXISTS ai_agent_usage_daily_date_idx
ON ai_agent_usage_daily(usage_date DESC, agent_id);

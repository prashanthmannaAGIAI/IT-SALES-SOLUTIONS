PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS industry_categories (
  slug TEXT PRIMARY KEY CHECK (length(slug) BETWEEN 1 AND 80),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE IF NOT EXISTS enquiries (
  id TEXT PRIMARY KEY CHECK (length(id) = 36),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  email TEXT NOT NULL CHECK (length(email) BETWEEN 3 AND 254),
  organization TEXT CHECK (organization IS NULL OR length(organization) <= 160),
  industry TEXT CHECK (industry IS NULL OR length(industry) <= 120),
  message TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 4000),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'completed', 'archived')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE IF NOT EXISTS consultation_requests (
  id TEXT PRIMARY KEY CHECK (length(id) = 36),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  email TEXT NOT NULL CHECK (length(email) BETWEEN 3 AND 254),
  organization TEXT CHECK (organization IS NULL OR length(organization) <= 160),
  industry TEXT CHECK (industry IS NULL OR length(industry) <= 120),
  timezone TEXT NOT NULL CHECK (length(timezone) BETWEEN 1 AND 100),
  preferred_time TEXT NOT NULL CHECK (length(preferred_time) BETWEEN 1 AND 180),
  topic TEXT NOT NULL CHECK (length(topic) BETWEEN 1 AND 100),
  context TEXT CHECK (context IS NULL OR length(context) <= 3000),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'reviewing', 'confirmed', 'completed', 'cancelled', 'archived')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX IF NOT EXISTS enquiries_status_created_idx ON enquiries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS enquiries_email_idx ON enquiries(email);
CREATE INDEX IF NOT EXISTS consultation_status_created_idx ON consultation_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS consultation_email_idx ON consultation_requests(email);

CREATE TABLE IF NOT EXISTS submission_rate_limits (
  key_hash TEXT NOT NULL CHECK (length(key_hash) = 64),
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count > 0),
  PRIMARY KEY (key_hash, window_start)
) STRICT;

CREATE TABLE IF NOT EXISTS admin_users (
  email TEXT PRIMARY KEY COLLATE NOCASE CHECK (length(email) BETWEEN 3 AND 254),
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_by TEXT
) STRICT;

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY CHECK (length(id) = 36),
  actor_email TEXT NOT NULL CHECK (length(actor_email) BETWEEN 1 AND 254),
  actor_role TEXT NOT NULL CHECK (actor_role IN ('system', 'admin', 'editor', 'viewer')),
  action TEXT NOT NULL CHECK (length(action) BETWEEN 1 AND 80),
  resource_type TEXT NOT NULL CHECK (length(resource_type) BETWEEN 1 AND 80),
  resource_id TEXT CHECK (resource_id IS NULL OR length(resource_id) <= 120),
  details_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(details_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX IF NOT EXISTS audit_resource_created_idx ON audit_events(resource_type, resource_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_actor_created_idx ON audit_events(actor_email, created_at DESC);

CREATE TABLE IF NOT EXISTS services (
  slug TEXT PRIMARY KEY CHECK (length(slug) BETWEEN 1 AND 100),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 180),
  summary TEXT NOT NULL CHECK (length(summary) BETWEEN 1 AND 600),
  data_json TEXT NOT NULL CHECK (json_valid(data_json)),
  published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE IF NOT EXISTS industries (
  slug TEXT PRIMARY KEY CHECK (length(slug) BETWEEN 1 AND 100),
  category TEXT NOT NULL REFERENCES industry_categories(slug) ON UPDATE CASCADE ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 180),
  summary TEXT NOT NULL CHECK (length(summary) BETWEEN 1 AND 600),
  data_json TEXT NOT NULL CHECK (json_valid(data_json)),
  published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX IF NOT EXISTS industries_category_published_idx ON industries(category, published, sort_order);

CREATE TABLE IF NOT EXISTS articles (
  slug TEXT PRIMARY KEY CHECK (length(slug) BETWEEN 1 AND 120),
  category TEXT NOT NULL CHECK (length(category) BETWEEN 1 AND 100),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 240),
  summary TEXT NOT NULL CHECK (length(summary) BETWEEN 1 AND 800),
  data_json TEXT NOT NULL CHECK (json_valid(data_json)),
  published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0, 1)),
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX IF NOT EXISTS articles_published_idx ON articles(published, published_at DESC);

CREATE TABLE IF NOT EXISTS products (
  slug TEXT PRIMARY KEY CHECK (length(slug) BETWEEN 1 AND 120),
  category TEXT NOT NULL CHECK (length(category) BETWEEN 1 AND 120),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 180),
  summary TEXT NOT NULL CHECK (length(summary) BETWEEN 1 AND 600),
  description TEXT NOT NULL CHECK (length(description) BETWEEN 1 AND 4000),
  vendor_name TEXT CHECK (vendor_name IS NULL OR length(vendor_name) <= 180),
  product_url TEXT CHECK (product_url IS NULL OR length(product_url) <= 2048),
  data_json TEXT NOT NULL CHECK (json_valid(data_json)),
  published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX IF NOT EXISTS products_category_published_idx ON products(category, published, name);

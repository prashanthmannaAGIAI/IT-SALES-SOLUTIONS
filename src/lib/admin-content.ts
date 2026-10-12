import type { ContentCollection, Database } from "./database";
import type { AdminIdentity } from "./auth";
import { ApiError } from "./http";
import { validateContent } from "./validation";

const tableNames = {
  services: "services",
  industries: "industries",
  articles: "articles",
  products: "products",
} as const;

interface StoredContent {
  slug: string;
  title: string;
  summary: string;
  category?: string;
  data_json: string;
  published: number;
  published_at?: string | null;
}

export async function listManagedContent(database: Database, collection: ContentCollection): Promise<StoredContent[]> {
  return (await database.prepare(
    `SELECT slug, title, summary, category, data_json, published, published_at
     FROM ${tableNames[collection]} ORDER BY title`,
  ).all<StoredContent>()).results;
}

export async function saveManagedContent(
  database: Database,
  collection: ContentCollection,
  value: unknown,
  identity: AdminIdentity,
  publish: boolean,
): Promise<string> {
  const content = validateContent(collection, value);
  const slug = String(content.slug);
  const title = String(content.title ?? content.name);
  const summary = String(content.summary);
  const now = new Date().toISOString();
  const publishedAt = collection === "articles" && publish ? now : null;
  const data = JSON.stringify(content);
  if (collection === "industries") {
    const category = await database.prepare(
      "SELECT slug FROM industry_categories WHERE slug = ?",
    ).bind(String(content.category)).first<{ slug: string }>();
    if (!category) throw new ApiError(422, "UNKNOWN_CATEGORY", "Select an existing industry category.");
  }

  const audit = database.prepare(
    `INSERT INTO audit_events
     (id, actor_email, actor_role, action, resource_type, resource_id, details_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    crypto.randomUUID(),
    identity.email,
    identity.role,
    "content.saved",
    collection,
    slug,
    JSON.stringify({ published: publish }),
  );

  const statement = collection === "services"
    ? database.prepare(
        `INSERT INTO services (slug, title, summary, data_json, published, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(slug) DO UPDATE SET title=excluded.title, summary=excluded.summary,
         data_json=excluded.data_json, published=excluded.published, updated_at=excluded.updated_at`,
      ).bind(slug, title, summary, data, Number(publish), now)
    : collection === "industries"
      ? database.prepare(
          `INSERT INTO industries (slug, category, title, summary, data_json, published, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(slug) DO UPDATE SET category=excluded.category, title=excluded.title,
           summary=excluded.summary, data_json=excluded.data_json, published=excluded.published, updated_at=excluded.updated_at`,
        ).bind(slug, String(content.category), title, summary, data, Number(publish), now)
      : collection === "articles"
        ? database.prepare(
            `INSERT INTO articles (slug, category, title, summary, data_json, published, published_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(slug) DO UPDATE SET category=excluded.category, title=excluded.title,
             summary=excluded.summary, data_json=excluded.data_json, published=excluded.published,
             published_at=CASE WHEN excluded.published = 1 THEN COALESCE(articles.published_at, excluded.published_at) ELSE NULL END,
             updated_at=excluded.updated_at`,
          ).bind(slug, String(content.category), title, summary, data, Number(publish), publishedAt, now)
        : database.prepare(
            `INSERT INTO products
             (slug, category, name, summary, description, vendor_name, product_url, data_json, published, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(slug) DO UPDATE SET category=excluded.category, name=excluded.name,
             summary=excluded.summary, description=excluded.description, vendor_name=excluded.vendor_name,
             product_url=excluded.product_url, data_json=excluded.data_json, published=excluded.published,
             updated_at=excluded.updated_at`,
          ).bind(
            slug,
            String(content.category),
            String(content.name),
            summary,
            String(content.description),
            String(content.vendorName ?? "") || null,
            String(content.productUrl ?? "") || null,
            data,
            Number(publish),
            now,
          );

  await database.batch([statement, audit]);
  return slug;
}

export async function deleteManagedContent(
  database: Database,
  collection: ContentCollection,
  slug: string,
  identity: AdminIdentity,
): Promise<void> {
  const table = tableNames[collection];
  const auditStatement = database.prepare(
    `INSERT INTO audit_events
     (id, actor_email, actor_role, action, resource_type, resource_id, details_json)
     SELECT ?, ?, ?, 'content.deleted', ?, ?, '{}'
     WHERE EXISTS (SELECT 1 FROM ${tableNames[collection]} WHERE slug = ?)`,
  ).bind(crypto.randomUUID(), identity.email, identity.role, collection, slug, slug);
  const deleteStatement = database.prepare(`DELETE FROM ${table} WHERE slug = ?`).bind(slug);
  const result = await database.batch([auditStatement, deleteStatement]);
  const deletion = result[1];
  if (!deletion?.meta?.changes) throw new ApiError(404, "CONTENT_NOT_FOUND", "The requested content was not found.");
}

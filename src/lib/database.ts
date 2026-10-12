export interface DatabaseStatement {
  bind(...values: unknown[]): DatabaseStatement;
  first<T = Record<string, unknown>>(columnName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean; meta: { changes: number } }>;
}

export interface DatabaseResult {
  success: boolean;
  meta: { changes: number };
}

export interface Database {
  prepare(query: string): DatabaseStatement;
  batch(statements: DatabaseStatement[]): Promise<DatabaseResult[]>;
}

export type ContentCollection = "services" | "industries" | "articles" | "products";

export interface ContentRow {
  slug: string;
  title: string;
  summary: string;
  data_json: string;
  published: number;
  sort_order?: number;
  category?: string;
  published_at?: string | null;
}

const COLLECTIONS: readonly ContentCollection[] = ["services", "industries", "articles", "products"];

export function isContentCollection(value: string): value is ContentCollection {
  return COLLECTIONS.includes(value as ContentCollection);
}

export async function getPublishedContent<T>(
  database: Database,
  collection: ContentCollection,
  slug?: string,
): Promise<T[]> {
  const selection = {
    services: "slug, title, summary, data_json, published, sort_order",
    industries: "slug, title, summary, data_json, published, sort_order, category",
    articles: "slug, title, summary, data_json, published, category, published_at",
    products: "slug, name AS title, summary, data_json, published, category",
  }[collection];
  const ordering = {
    services: "sort_order, title",
    industries: "sort_order, title",
    articles: "published_at DESC, title",
    products: "name",
  }[collection];
  const query = slug
    ? `SELECT ${selection} FROM ${collection} WHERE published = 1 AND slug = ? LIMIT 1`
    : `SELECT ${selection} FROM ${collection} WHERE published = 1 ORDER BY ${ordering}`;
  const statement = database.prepare(query);
  const result = slug
    ? await statement.bind(slug).all<ContentRow>()
    : await statement.all<ContentRow>();

  return result.results.map((row) => {
    try {
      const content: unknown = JSON.parse(row.data_json);
      if (typeof content !== "object" || content === null || Array.isArray(content)) {
        throw new Error("Content payload is not an object");
      }
      return content as T;
    } catch (error) {
      console.error("Invalid stored content JSON", {
        collection,
        slug: row.slug,
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      throw new Error(`Stored ${collection} content could not be loaded.`);
    }
  });
}

import { z } from "zod";
import { authenticateAdmin, requireRole, type AdminRole } from "./auth";
import type { Database, DatabaseStatement } from "./database";
import { ApiError, errorResponse, jsonResponse, readJsonBody, requireSameOrigin } from "./http";

const knowledgeSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  category: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(180),
  content: z.string().trim().min(1).max(12_000),
  tags: z.array(z.string().trim().min(1).max(60)).max(30),
  approved: z.boolean(),
  active: z.boolean(),
}).strict();

export function validateKnowledgeApproval(role: AdminRole, approved: boolean): void {
  if (approved && role !== "admin") {
    throw new ApiError(403, "APPROVAL_REQUIRED", "Only an administrator can approve public assistant knowledge.");
  }
}

async function authorize(request: Request, env: Env, roles: readonly AdminRole[]) {
  const identity = await authenticateAdmin(request, env.DB as Database, env);
  requireRole(identity, roles);
  return identity;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const identity = await authorize(request, env, ["viewer", "editor", "admin"]);
    const database = env.DB as Database;
    const where = identity.role === "viewer" ? "WHERE approved = 1 AND active = 1" : "";
    const rows = await database.prepare(
      `SELECT slug, category, title, content, tags_json, approved, active,
              approved_by, approved_at, created_at, updated_at
       FROM ai_knowledge ${where} ORDER BY category, title LIMIT 500`,
    ).all<Record<string, unknown>>();
    return jsonResponse({ data: rows.results });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  try {
    requireSameOrigin(request);
    const identity = await authorize(request, env, ["editor", "admin"]);
    const body = await readJsonBody(request, 64_000);
    const parsed = knowledgeSchema.safeParse(body);
    if (!parsed.success) {
      const fields: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.map(String).join(".") || "request";
        (fields[path] ??= []).push(issue.message);
      }
      throw new ApiError(422, "VALIDATION_FAILED", "Check the knowledge entry and try again.", fields);
    }
    validateKnowledgeApproval(identity.role, parsed.data.approved);
    const database = env.DB as Database;
    const now = new Date().toISOString();
    const statements: DatabaseStatement[] = [
      database.prepare(
        `INSERT INTO ai_knowledge
           (slug, category, title, content, tags_json, approved, active, approved_by, approved_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(slug) DO UPDATE SET
           category = excluded.category, title = excluded.title, content = excluded.content,
           tags_json = excluded.tags_json, approved = excluded.approved, active = excluded.active,
           approved_by = excluded.approved_by, approved_at = excluded.approved_at, updated_at = excluded.updated_at`,
      ).bind(
        parsed.data.slug,
        parsed.data.category,
        parsed.data.title,
        parsed.data.content,
        JSON.stringify(parsed.data.tags),
        Number(parsed.data.approved),
        Number(parsed.data.active),
        parsed.data.approved ? identity.email : null,
        parsed.data.approved ? now : null,
        now,
      ),
      database.prepare(
        `INSERT INTO audit_events
           (id, actor_email, actor_role, action, resource_type, resource_id, details_json)
         VALUES (?, ?, ?, 'ai_knowledge.saved', 'ai_knowledge', ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        identity.email,
        identity.role,
        parsed.data.slug,
        JSON.stringify({ approved: parsed.data.approved, active: parsed.data.active }),
      ),
    ];
    await database.batch(statements);
    return jsonResponse({ data: { slug: parsed.data.slug, approved: parsed.data.approved } });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  try {
    requireSameOrigin(request);
    const identity = await authorize(request, env, ["admin"]);
    const slug = new URL(request.url).searchParams.get("slug")?.trim() ?? "";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new ApiError(400, "INVALID_SLUG", "Provide a valid knowledge slug.");
    }
    const database = env.DB as Database;
    const result = await database.batch([
      database.prepare(
        `INSERT INTO audit_events
           (id, actor_email, actor_role, action, resource_type, resource_id, details_json)
         SELECT ?, ?, ?, 'ai_knowledge.deleted', 'ai_knowledge', ?, '{}'
         WHERE EXISTS (SELECT 1 FROM ai_knowledge WHERE slug = ?)`,
      ).bind(crypto.randomUUID(), identity.email, identity.role, slug, slug),
      database.prepare("DELETE FROM ai_knowledge WHERE slug = ?").bind(slug),
    ]);
    if (result[1]?.meta.changes !== 1) {
      throw new ApiError(404, "KNOWLEDGE_NOT_FOUND", "The knowledge entry was not found.");
    }
    return jsonResponse({ data: { slug, deleted: true } });
  } catch (error) {
    return errorResponse(error);
  }
};

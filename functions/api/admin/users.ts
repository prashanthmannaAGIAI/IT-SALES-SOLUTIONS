import { authenticateAdmin, requireRole } from "../../../src/lib/auth";
import type { Database, DatabaseStatement } from "../../../src/lib/database";
import { ApiError, errorResponse, jsonResponse, readJsonBody, requireSameOrigin } from "../../../src/lib/http";
import { z } from "zod";

const userSchema = z.object({
  email: z.email().trim().max(254).transform((email) => email.toLowerCase()),
  role: z.enum(["admin", "editor", "viewer"]),
}).strict();

async function authorize(request: Request, env: Env) {
  const identity = await authenticateAdmin(request, env.DB as Database, env);
  requireRole(identity, ["admin"]);
  return identity;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const identity = await authorize(request, env);
    const users = await (env.DB as Database).prepare(
      "SELECT email, role, active, created_at, created_by FROM admin_users ORDER BY email",
    ).all<{ email: string; role: string; active: number; created_at: string; created_by: string | null }>();
    await (env.DB as Database).prepare(
      `INSERT INTO audit_events (id, actor_email, actor_role, action, resource_type, resource_id, details_json)
       VALUES (?, ?, ?, 'admin_user.list', 'admin_user', NULL, '{}')`,
    ).bind(crypto.randomUUID(), identity.email, identity.role).run();
    return jsonResponse({ data: users.results });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  try {
    requireSameOrigin(request);
    const identity = await authorize(request, env);
    const body = await readJsonBody(request);
    const parsed = userSchema.safeParse(body);
    if (!parsed.success) {
      const fields: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".") || "request";
        (fields[path] ??= []).push(issue.message);
      }
      throw new ApiError(400, "VALIDATION_ERROR", "Provide a valid email address and administrator role.", fields);
    }
    if (parsed.data.email === identity.email.toLowerCase() && parsed.data.role !== "admin") {
      throw new ApiError(400, "CANNOT_DEMOTE_SELF", "Use another administrator account to change your own role.");
    }
    const database = env.DB as Database;
    const statements: DatabaseStatement[] = [
      database.prepare(
        `INSERT INTO admin_users (email, role, active, created_by) VALUES (?, ?, 1, ?)
         ON CONFLICT(email) DO UPDATE SET role = excluded.role, active = 1`,
      ).bind(parsed.data.email, parsed.data.role, identity.email),
      database.prepare(
        `INSERT INTO audit_events (id, actor_email, actor_role, action, resource_type, resource_id, details_json)
         VALUES (?, ?, ?, 'admin_user.upsert', 'admin_user', ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        identity.email,
        identity.role,
        parsed.data.email,
        JSON.stringify({ role: parsed.data.role }),
      ),
    ];
    await database.batch(statements);
    return jsonResponse({ data: { email: parsed.data.email, role: parsed.data.role, active: true } });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  try {
    requireSameOrigin(request);
    const identity = await authorize(request, env);
    const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase() ?? "";
    if (!z.email().max(254).safeParse(email).success) {
      throw new ApiError(400, "INVALID_EMAIL", "Provide a valid account email address.");
    }
    if (email === identity.email.toLowerCase()) {
      throw new ApiError(400, "CANNOT_DEACTIVATE_SELF", "Use another administrator account to change your own access.");
    }
    const database = env.DB as Database;
    const statements: DatabaseStatement[] = [
      database.prepare(
        `INSERT INTO audit_events (id, actor_email, actor_role, action, resource_type, resource_id, details_json)
         SELECT ?, ?, ?, 'admin_user.deactivate', 'admin_user', ?, '{}'
         WHERE EXISTS (SELECT 1 FROM admin_users WHERE email = ? COLLATE NOCASE AND active = 1)`,
      ).bind(crypto.randomUUID(), identity.email, identity.role, email, email),
      database.prepare("UPDATE admin_users SET active = 0 WHERE email = ? COLLATE NOCASE AND active = 1").bind(email),
    ];
    const result = await database.batch(statements);
    if (result[1]?.meta.changes !== 1) {
      throw new ApiError(404, "ADMIN_USER_NOT_FOUND", "The active administrator account was not found.");
    }
    return jsonResponse({ data: { email, active: false } });
  } catch (error) {
    return errorResponse(error);
  }
};

import { authenticateAdmin, requireRole } from "../../../src/lib/auth";
import type { Database, DatabaseStatement } from "../../../src/lib/database";
import { ApiError, errorResponse, jsonResponse, readJsonBody, requireSameOrigin } from "../../../src/lib/http";

const tables = {
  enquiry: { table: "enquiries", statuses: ["new", "in_review", "completed", "archived"] },
  consultation: { table: "consultation_requests", statuses: ["requested", "reviewing", "confirmed", "completed", "cancelled", "archived"] },
} as const;

async function authorize(request: Request, env: Env) {
  const identity = await authenticateAdmin(request, env.DB as Database, env);
  requireRole(identity, ["admin"]);
  return identity;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const identity = await authorize(request, env);
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    if (type !== "enquiry" && type !== "consultation") {
      throw new ApiError(400, "INVALID_TYPE", "Select enquiry or consultation submissions.");
    }
    const { table, statuses } = tables[type];
    const limit = url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : 100;
    const offset = url.searchParams.has("offset") ? Number(url.searchParams.get("offset")) : 0;
    const status = url.searchParams.get("status");
    if (!Number.isInteger(limit) || limit < 1 || limit > 200 || !Number.isInteger(offset) || offset < 0) {
      throw new ApiError(400, "INVALID_PAGINATION", "Use a limit from 1 to 200 and a non-negative offset.");
    }
    if (status && !(statuses as readonly string[]).includes(status)) {
      throw new ApiError(400, "INVALID_STATUS", "The selected status is not valid for this submission type.");
    }
    const search = url.searchParams.get("search")?.trim() ?? "";
    if (search.length > 100) throw new ApiError(400, "INVALID_SEARCH", "Search text must be 100 characters or fewer.");
    const database = env.DB as Database;
    const searchColumns = type === "enquiry"
      ? "coalesce(name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(organization, '') || ' ' || coalesce(industry, '') || ' ' || coalesce(message, '')"
      : "coalesce(name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(organization, '') || ' ' || coalesce(industry, '') || ' ' || coalesce(topic, '') || ' ' || coalesce(context, '')";
    const filters = [
      ...(status ? ["status = ?"] : []),
      ...(search ? [`instr(lower(${searchColumns}), lower(?)) > 0`] : []),
    ];
    const where = filters.length ? ` WHERE ${filters.join(" AND ")}` : "";
    const bindings = [...(status ? [status] : []), ...(search ? [search] : [])];
    const selectedColumns = type === "enquiry"
      ? "id, name, email, organization, industry, message, status, created_at"
      : "id, name, email, organization, industry, timezone, preferred_time, topic, context, status, created_at";
    const statement = database.prepare(
      `SELECT ${selectedColumns} FROM ${table}${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    );
    const countStatement = database.prepare(`SELECT COUNT(*) AS total FROM ${table}${where}`);
    const [rows, count] = await Promise.all([
      statement.bind(...bindings, limit, offset).all<Record<string, unknown>>(),
      (bindings.length ? countStatement.bind(...bindings) : countStatement).first<{ total: number }>(),
    ]);
    await database.prepare(
      `INSERT INTO audit_events (id, actor_email, actor_role, action, resource_type, resource_id, details_json)
       VALUES (?, ?, ?, 'submission.list', ?, NULL, ?)`,
    ).bind(
      crypto.randomUUID(),
      identity.email,
      identity.role,
      type,
      JSON.stringify({ status, limit, offset }),
    ).run();
    return jsonResponse({ data: rows.results, total: count?.total ?? 0, limit, offset });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  try {
    requireSameOrigin(request);
    const identity = await authorize(request, env);
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    if (type !== "enquiry" && type !== "consultation") {
      throw new ApiError(400, "INVALID_TYPE", "Select enquiry or consultation submissions.");
    }
    const id = url.searchParams.get("id")?.trim() ?? "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      throw new ApiError(400, "INVALID_ID", "Provide a valid submission identifier.");
    }
    const body = await readJsonBody(request);
    const { table, statuses } = tables[type];
    if (typeof body !== "object" || body === null || Array.isArray(body) ||
        !("status" in body) ||
        typeof body.status !== "string" ||
        !(statuses as readonly string[]).includes(body.status)) {
      throw new ApiError(400, "INVALID_STATUS", "The selected status is not valid for this submission type.");
    }

    const database = env.DB as Database;
    const statements: DatabaseStatement[] = [
      database.prepare(`UPDATE ${table} SET status = ?, updated_at = ? WHERE id = ?`)
        .bind(body.status, new Date().toISOString(), id),
      database.prepare(
        `INSERT INTO audit_events (id, actor_email, actor_role, action, resource_type, resource_id, details_json)
         SELECT ?, ?, ?, 'submission.status.update', ?, ?, ?
         WHERE EXISTS (SELECT 1 FROM ${table} WHERE id = ?)`,
      ).bind(
        crypto.randomUUID(),
        identity.email,
        identity.role,
        type,
        id,
        JSON.stringify({ status: body.status }),
        id,
      ),
    ];
    const result = await database.batch(statements);
    if (result[0]?.meta.changes !== 1) {
      throw new ApiError(404, "SUBMISSION_NOT_FOUND", "The submission was not found.");
    }
    return jsonResponse({ data: { id, type, status: body.status } });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  try {
    requireSameOrigin(request);
    const identity = await authorize(request, env);
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    if (type !== "enquiry" && type !== "consultation") {
      throw new ApiError(400, "INVALID_TYPE", "Select enquiry or consultation submissions.");
    }
    const id = url.searchParams.get("id")?.trim() ?? "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      throw new ApiError(400, "INVALID_ID", "Provide a valid submission identifier.");
    }
    const database = env.DB as Database;
    const table = tables[type].table;
    const result = await database.batch([
      database.prepare(
        `INSERT INTO audit_events (id, actor_email, actor_role, action, resource_type, resource_id, details_json)
         SELECT ?, ?, ?, 'submission.deleted', ?, ?, '{}'
         WHERE EXISTS (SELECT 1 FROM ${table} WHERE id = ?)`,
      ).bind(crypto.randomUUID(), identity.email, identity.role, type, id, id),
      database.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id),
    ]);
    if (result[1]?.meta.changes !== 1) {
      throw new ApiError(404, "SUBMISSION_NOT_FOUND", "The submission was not found.");
    }
    return jsonResponse({ data: { id, type, deleted: true } });
  } catch (error) {
    return errorResponse(error);
  }
};

import { agentDefinitions } from "../../../src/lib/agents";
import { authenticateAdmin, requireRole, type AdminIdentity } from "../../../src/lib/auth";
import type { Database, DatabaseStatement } from "../../../src/lib/database";
import { ApiError, errorResponse, jsonResponse, readJsonBody, requireSameOrigin } from "../../../src/lib/http";

type HubEnv = Env & { DB: Database };
type PageResult<T> = { data: T[]; total: number; limit: number; offset: number };

async function authorize(request: Request, env: HubEnv): Promise<AdminIdentity> {
  return authenticateAdmin(request, env.DB, env);
}

function pagination(url: URL): { limit: number; offset: number } {
  const limit = Number(url.searchParams.get("limit") ?? 25);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) {
    throw new ApiError(400, "INVALID_PAGINATION", "Use a limit from 1 to 100 and a non-negative offset.");
  }
  return { limit, offset };
}

async function count(database: Database, sql: string): Promise<number> {
  const result = await database.prepare(sql).first<{ total: number }>();
  return result?.total ?? 0;
}

async function loadOverview(database: Database, identity: AdminIdentity) {
  const queries: Promise<number>[] = [
    count(database, "SELECT COUNT(*) AS total FROM services WHERE published = 1"),
    count(database, "SELECT COUNT(*) AS total FROM industries WHERE published = 1"),
    count(database, "SELECT COUNT(*) AS total FROM articles WHERE published = 1"),
    count(database, "SELECT COUNT(*) AS total FROM products WHERE published = 1"),
    count(database, "SELECT COUNT(*) AS total FROM projects WHERE status NOT IN ('completed', 'archived')"),
    count(database, "SELECT COUNT(*) AS total FROM proposal_drafts WHERE status = 'pending_approval'"),
  ];
  if (identity.role === "admin") {
    queries.push(
      count(database, "SELECT COUNT(*) AS total FROM enquiries"),
      count(database, "SELECT COUNT(*) AS total FROM consultation_requests"),
      count(database, "SELECT COUNT(*) AS total FROM approval_queue WHERE status = 'pending'"),
    );
  }
  const values = await Promise.all(queries);
  const data: Record<string, number | null> = {
    publishedServices: values[0],
    publishedIndustries: values[1],
    publishedArticles: values[2],
    publishedProducts: values[3],
    agentInvocations30d: null,
    agentFailures30d: null,
    openProjects: values[4],
    proposalsAwaitingApproval: values[5],
  };
  if (identity.role === "admin") {
    data.enquiries = values[6];
    data.consultations = values[7];
    data.pendingApprovals = values[8];
  }
  const metrics = await database.prepare(
    `SELECT COALESCE(SUM(invocations), 0) AS invocations, COALESCE(SUM(failures), 0) AS failures
     FROM ai_agent_usage_daily WHERE usage_date >= date('now', '-29 days')`,
  ).first<{ invocations: number; failures: number }>();
  data.agentInvocations30d = metrics?.invocations ?? 0;
  data.agentFailures30d = metrics?.failures ?? 0;
  return data;
}

function searchClause(status: string | null): string {
  return status ? " WHERE status = ?" : "";
}

async function listProjects(database: Database, url: URL): Promise<PageResult<Record<string, unknown>>> {
  const { limit, offset } = pagination(url);
  const status = url.searchParams.get("status");
  const statuses = ["planning", "active", "on_hold", "completed", "archived"];
  if (status && !statuses.includes(status)) throw new ApiError(400, "INVALID_STATUS", "Choose a valid project status.");
  const where = searchClause(status);
  const list = database.prepare(
    `SELECT id, name, status, summary, owner_email, created_by, updated_at
     FROM projects${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
  );
  const totalQuery = database.prepare(`SELECT COUNT(*) AS total FROM projects${where}`);
  const [rows, total] = await Promise.all([
    (status ? list.bind(status, limit, offset) : list.bind(limit, offset)).all<Record<string, unknown>>(),
    (status ? totalQuery.bind(status) : totalQuery).first<{ total: number }>(),
  ]);
  return { data: rows.results, total: total?.total ?? 0, limit, offset };
}

async function listApprovals(database: Database, url: URL): Promise<PageResult<Record<string, unknown>>> {
  const { limit, offset } = pagination(url);
  const status = url.searchParams.get("status") ?? "pending";
  if (!["pending", "approved", "rejected", "all"].includes(status)) {
    throw new ApiError(400, "INVALID_STATUS", "Choose a valid approval status.");
  }
  const where = status === "all" ? "" : " WHERE q.status = ?";
  const list = database.prepare(
    `SELECT q.id, q.resource_type, q.resource_id, q.requested_by, q.summary, q.status, q.reviewed_by, q.review_note,
            q.created_at, q.reviewed_at, p.content AS proposal_content
     FROM approval_queue q LEFT JOIN proposal_drafts p
       ON q.resource_type = 'proposal' AND q.resource_id = p.id${where}
     ORDER BY q.created_at DESC LIMIT ? OFFSET ?`,
  );
  const totalQuery = database.prepare(`SELECT COUNT(*) AS total FROM approval_queue q${where}`);
  const [rows, total] = await Promise.all([
    (status === "all" ? list.bind(limit, offset) : list.bind(status, limit, offset)).all<Record<string, unknown>>(),
    (status === "all" ? totalQuery : totalQuery.bind(status)).first<{ total: number }>(),
  ]);
  return { data: rows.results, total: total?.total ?? 0, limit, offset };
}

async function listActivity(database: Database, url: URL): Promise<PageResult<Record<string, unknown>>> {
  const { limit, offset } = pagination(url);
  const type = url.searchParams.get("type");
  const allowed = ["enquiry", "consultation", "managed_content", "ai_knowledge", "admin_user", "proposal", "project", "approval", "assistant_setting", "agent_setting"];
  if (type && !allowed.includes(type)) throw new ApiError(400, "INVALID_TYPE", "Choose a valid activity type.");
  const where = type ? " WHERE resource_type = ?" : "";
  const list = database.prepare(
    `SELECT id, actor_email, actor_role, action, resource_type, resource_id, created_at
     FROM audit_events${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
  );
  const totalQuery = database.prepare(`SELECT COUNT(*) AS total FROM audit_events${where}`);
  const [rows, total] = await Promise.all([
    (type ? list.bind(type, limit, offset) : list.bind(limit, offset)).all<Record<string, unknown>>(),
    (type ? totalQuery.bind(type) : totalQuery).first<{ total: number }>(),
  ]);
  return { data: rows.results, total: total?.total ?? 0, limit, offset };
}

async function listProposals(database: Database, url: URL): Promise<PageResult<Record<string, unknown>>> {
  const { limit, offset } = pagination(url);
  const status = url.searchParams.get("status");
  if (status && !["draft", "pending_approval", "approved", "rejected"].includes(status)) {
    throw new ApiError(400, "INVALID_STATUS", "Choose a valid proposal status.");
  }
  const where = status ? " WHERE d.status = ?" : "";
  const list = database.prepare(
    `SELECT d.id, d.project_id, p.name AS project_name, d.title, d.content, d.status, d.created_by, d.updated_at
     FROM proposal_drafts d LEFT JOIN projects p ON p.id = d.project_id${where}
     ORDER BY d.updated_at DESC LIMIT ? OFFSET ?`,
  );
  const totalQuery = database.prepare(`SELECT COUNT(*) AS total FROM proposal_drafts d${where}`);
  const [rows, total] = await Promise.all([
    (status ? list.bind(status, limit, offset) : list.bind(limit, offset)).all<Record<string, unknown>>(),
    (status ? totalQuery.bind(status) : totalQuery).first<{ total: number }>(),
  ]);
  return { data: rows.results, total: total?.total ?? 0, limit, offset };
}

async function listAgentErrors(database: Database, url: URL): Promise<PageResult<Record<string, unknown>>> {
  const { limit, offset } = pagination(url);
  const list = database.prepare(
    `SELECT usage_date, agent_id, invocations, failures, duration_ms
     FROM ai_agent_usage_daily WHERE failures > 0
     ORDER BY usage_date DESC, failures DESC LIMIT ? OFFSET ?`,
  );
  const [rows, total] = await Promise.all([
    list.bind(limit, offset).all<Record<string, unknown>>(),
    database.prepare("SELECT COUNT(*) AS total FROM ai_agent_usage_daily WHERE failures > 0").first<{ total: number }>(),
  ]);
  return { data: rows.results, total: total?.total ?? 0, limit, offset };
}

async function listAgentSettings(database: Database) {
  const configured = await database.prepare("SELECT agent_id, enabled FROM ai_agent_settings").all<{ agent_id: string; enabled: number }>();
  const enabledById = new Map(configured.results.map((row) => [row.agent_id, Boolean(row.enabled)]));
  return agentDefinitions.map((agent) => ({
    id: agent.id,
    name: agent.name,
    purpose: agent.purpose,
    execution: agent.execution,
    enabled: agent.id === "knowledge" || agent.id === "responsible-ai-guardrail"
      ? true
      : (enabledById.get(agent.id) ?? true),
    configurable: agent.execution === "model",
  }));
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const identity = await authorize(request, env as HubEnv);
    const database = env.DB as Database;
    const url = new URL(request.url);
    const section = url.searchParams.get("section");
    let data: unknown;
    if (section === "overview") {
      data = await loadOverview(database, identity);
    } else if (section === "projects") {
      requireRole(identity, ["editor", "admin"]);
      data = await listProjects(database, url);
    } else if (section === "proposals") {
      requireRole(identity, ["editor", "admin"]);
      data = await listProposals(database, url);
    } else if (section === "approvals") {
      requireRole(identity, ["admin"]);
      data = await listApprovals(database, url);
    } else if (section === "activity") {
      requireRole(identity, ["admin"]);
      data = await listActivity(database, url);
    } else if (section === "errors") {
      requireRole(identity, ["admin"]);
      data = await listAgentErrors(database, url);
    } else if (section === "agents") {
      requireRole(identity, ["admin"]);
      data = await listAgentSettings(database);
    } else if (section === "settings") {
      requireRole(identity, ["admin"]);
      data = await database.prepare("SELECT setting_key, setting_value, updated_by, updated_at FROM admin_settings").all();
    } else {
      throw new ApiError(400, "INVALID_SECTION", "Choose a supported dashboard section.");
    }
    return jsonResponse({ data, role: identity.role });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    requireSameOrigin(request);
    const identity = await authorize(request, env as HubEnv);
    requireRole(identity, ["editor", "admin"]);
    const database = env.DB as Database;
    const body = await readJsonBody(request, 20_000);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiError(400, "INVALID_BODY", "Provide a valid request body.");
    const input = body as Record<string, unknown>;
    if (input.action === "project.create") {
      const name = typeof input.name === "string" ? input.name.trim() : "";
      const summary = typeof input.summary === "string" ? input.summary.trim() : "";
      const ownerEmail = typeof input.ownerEmail === "string" && input.ownerEmail.trim() ? input.ownerEmail.trim().toLowerCase() : null;
      if (!name || name.length > 180 || (input.summary !== undefined && typeof input.summary !== "string") ||
          (input.ownerEmail !== undefined && typeof input.ownerEmail !== "string") || summary.length > 2000 ||
          (ownerEmail !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail))) {
        throw new ApiError(422, "VALIDATION_FAILED", "Provide a project name, a summary under 2,000 characters, and a valid optional owner email.");
      }
      const id = crypto.randomUUID();
      const result = await database.batch([
        database.prepare(
          "INSERT INTO projects (id, name, summary, owner_email, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?)",
        ).bind(id, name, summary, ownerEmail, identity.email, identity.email),
        database.prepare(
          `INSERT INTO audit_events (id, actor_email, actor_role, action, resource_type, resource_id, details_json)
           VALUES (?, ?, ?, 'project.created', 'project', ?, '{}')`,
        ).bind(crypto.randomUUID(), identity.email, identity.role, id),
      ]);
      if (result[0]?.meta.changes !== 1) throw new ApiError(500, "PROJECT_SAVE_FAILED", "The project could not be saved.");
      return jsonResponse({ data: { id, name, status: "planning" } }, 201);
    }
    if (input.action === "proposal.create") {
      const title = typeof input.title === "string" ? input.title.trim() : "";
      const content = typeof input.content === "string" ? input.content.trim() : "";
      const projectId = typeof input.projectId === "string" && input.projectId ? input.projectId : null;
      if (!title || title.length > 180 || !content || content.length > 16_000 ||
          (input.projectId !== undefined && typeof input.projectId !== "string") ||
          (projectId !== null && !/^[0-9a-f-]{36}$/i.test(projectId)) ||
          (input.submit !== undefined && typeof input.submit !== "boolean")) {
        throw new ApiError(422, "VALIDATION_FAILED", "Provide a title, proposal content up to 16,000 characters, and an optional valid project.");
      }
      if (projectId && !await database.prepare("SELECT id FROM projects WHERE id = ?").bind(projectId).first()) {
        throw new ApiError(404, "PROJECT_NOT_FOUND", "The selected project was not found.");
      }
      const id = crypto.randomUUID();
      const submit = input.submit === true;
      const statements: DatabaseStatement[] = [
        database.prepare(
          `INSERT INTO proposal_drafts (id, project_id, title, content, status, created_by, updated_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ).bind(id, projectId, title, content, submit ? "pending_approval" : "draft", identity.email, identity.email),
      ];
      if (submit) {
        statements.push(database.prepare(
          `INSERT INTO approval_queue (id, resource_type, resource_id, requested_by, summary)
           VALUES (?, 'proposal', ?, ?, ?)`,
        ).bind(crypto.randomUUID(), id, identity.email, `Proposal review: ${title}`));
      }
      statements.push(database.prepare(
        `INSERT INTO audit_events (id, actor_email, actor_role, action, resource_type, resource_id, details_json)
         VALUES (?, ?, ?, ?, 'proposal', ?, ?)`,
      ).bind(crypto.randomUUID(), identity.email, identity.role, submit ? "proposal.submitted" : "proposal.created", id, JSON.stringify({ projectId })));
      const result = await database.batch(statements);
      if (result[0]?.meta.changes !== 1) throw new ApiError(500, "PROPOSAL_SAVE_FAILED", "The proposal draft could not be saved.");
      return jsonResponse({ data: { id, title, status: submit ? "pending_approval" : "draft" } }, 201);
    }
    throw new ApiError(400, "INVALID_ACTION", "Choose a supported dashboard action.");
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  try {
    requireSameOrigin(request);
    const identity = await authorize(request, env as HubEnv);
    const database = env.DB as Database;
    const body = await readJsonBody(request, 20_000);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiError(400, "INVALID_BODY", "Provide a valid request body.");
    const input = body as Record<string, unknown>;
    if (input.action === "approval.review") {
      requireRole(identity, ["admin"]);
      const id = typeof input.id === "string" ? input.id : "";
      const status = input.status;
      const note = typeof input.note === "string" ? input.note.trim() : "";
      if (!/^[0-9a-f-]{36}$/i.test(id) || (status !== "approved" && status !== "rejected") ||
          (input.note !== undefined && typeof input.note !== "string") || note.length > 1000) {
        throw new ApiError(422, "VALIDATION_FAILED", "Provide an approval id, approved or rejected decision, and a note under 1,000 characters.");
      }
      const approval = await database.prepare(
        "SELECT resource_type, resource_id FROM approval_queue WHERE id = ? AND status = 'pending'",
      ).bind(id).first<{ resource_type: string; resource_id: string }>();
      if (!approval) throw new ApiError(404, "PENDING_APPROVAL_NOT_FOUND", "The pending approval was not found or was already reviewed.");
      const statements: DatabaseStatement[] = [];
      statements.push(database.prepare(
        `UPDATE approval_queue SET status = ?, reviewed_by = ?, review_note = ?, reviewed_at = ?
         WHERE id = ? AND status = 'pending'
         AND (resource_type != 'proposal' OR EXISTS (
           SELECT 1 FROM proposal_drafts WHERE id = approval_queue.resource_id AND status = 'pending_approval'
         ))`,
      ).bind(status, identity.email, note || null, new Date().toISOString(), id));
      if (approval.resource_type === "proposal") {
        statements.push(database.prepare(
         `UPDATE proposal_drafts SET status = ?, updated_by = ?, updated_at = ?
          WHERE id = ? AND status = 'pending_approval'
          AND EXISTS (SELECT 1 FROM approval_queue WHERE id = ? AND status = ? AND reviewed_by = ?)`,
        ).bind(status, identity.email, new Date().toISOString(), approval.resource_id, id, status, identity.email));
      }
      statements.push(database.prepare(
        `INSERT INTO audit_events (id, actor_email, actor_role, action, resource_type, resource_id, details_json)
         SELECT ?, ?, ?, 'approval.reviewed', 'approval', ?, ?
         WHERE EXISTS (SELECT 1 FROM approval_queue WHERE id = ? AND status = ?)`,
      ).bind(crypto.randomUUID(), identity.email, identity.role, id, JSON.stringify({ status, resourceType: approval.resource_type, resourceId: approval.resource_id }), id, status));
      const results = await database.batch(statements);
      if (results[0]?.meta.changes !== 1 ||
          (approval.resource_type === "proposal" && results[1]?.meta.changes !== 1)) {
        throw new ApiError(409, "APPROVAL_CONFLICT", "The approval changed before your decision could be saved.");
      }
      return jsonResponse({ data: { id, status, executed: false } });
    }
    if (input.action === "project.update") {
      requireRole(identity, ["editor", "admin"]);
      const id = typeof input.id === "string" ? input.id : "";
      const name = typeof input.name === "string" ? input.name.trim() : "";
      const summary = typeof input.summary === "string" ? input.summary.trim() : "";
      const status = input.status;
      const ownerEmail = typeof input.ownerEmail === "string" && input.ownerEmail.trim() ? input.ownerEmail.trim().toLowerCase() : null;
      if (!/^[0-9a-f-]{36}$/i.test(id) || !name || name.length > 180 || summary.length > 2000 ||
          typeof input.summary !== "string" || typeof input.ownerEmail !== "string" ||
          !["planning", "active", "on_hold", "completed", "archived"].includes(String(status)) ||
          (ownerEmail !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail))) {
        throw new ApiError(422, "VALIDATION_FAILED", "Check the project fields and select a valid status.");
      }
      const result = await database.batch([
        database.prepare(
          `UPDATE projects SET name = ?, summary = ?, status = ?, owner_email = ?, updated_by = ?, updated_at = ? WHERE id = ?`,
        ).bind(name, summary, status, ownerEmail, identity.email, new Date().toISOString(), id),
        database.prepare(
          `INSERT INTO audit_events (id, actor_email, actor_role, action, resource_type, resource_id, details_json)
           SELECT ?, ?, ?, 'project.updated', 'project', ?, ? WHERE EXISTS (SELECT 1 FROM projects WHERE id = ?)`,
        ).bind(crypto.randomUUID(), identity.email, identity.role, id, JSON.stringify({ status }), id),
      ]);
      if (result[0]?.meta.changes !== 1) throw new ApiError(404, "PROJECT_NOT_FOUND", "The project was not found.");
      return jsonResponse({ data: { id, status } });
    }
    if (input.action === "proposal.update") {
      requireRole(identity, ["editor", "admin"]);
      const id = typeof input.id === "string" ? input.id : "";
      const title = typeof input.title === "string" ? input.title.trim() : "";
      const content = typeof input.content === "string" ? input.content.trim() : "";
      const projectId = typeof input.projectId === "string" && input.projectId ? input.projectId : null;
      if (!/^[0-9a-f-]{36}$/i.test(id) || !title || title.length > 180 || !content || content.length > 16_000 ||
          (input.projectId !== undefined && typeof input.projectId !== "string")) {
        throw new ApiError(422, "VALIDATION_FAILED", "Provide a title and proposal content up to 16,000 characters.");
      }
      if (projectId && !await database.prepare("SELECT id FROM projects WHERE id = ?").bind(projectId).first()) {
        throw new ApiError(404, "PROJECT_NOT_FOUND", "The selected project was not found.");
      }
      const result = await database.batch([
        database.prepare(
          `UPDATE proposal_drafts SET title = ?, content = ?, project_id = ?, status = 'draft', updated_by = ?, updated_at = ?
           WHERE id = ? AND status IN ('draft', 'rejected')`,
        ).bind(title, content, projectId, identity.email, new Date().toISOString(), id),
        database.prepare(
          `INSERT INTO audit_events (id, actor_email, actor_role, action, resource_type, resource_id, details_json)
           SELECT ?, ?, ?, 'proposal.updated', 'proposal', ?, '{}' WHERE EXISTS (SELECT 1 FROM proposal_drafts WHERE id = ? AND status = 'draft')`,
        ).bind(crypto.randomUUID(), identity.email, identity.role, id, id),
      ]);
      if (result[0]?.meta.changes !== 1) throw new ApiError(404, "PROPOSAL_NOT_EDITABLE", "The proposal was not found or is not an editable draft.");
      return jsonResponse({ data: { id, status: "draft" } });
    }
    if (input.action === "proposal.submit") {
      requireRole(identity, ["editor", "admin"]);
      const id = typeof input.id === "string" ? input.id : "";
      if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError(422, "INVALID_ID", "Provide a valid proposal identifier.");
      const proposal = await database.prepare(
        "SELECT title FROM proposal_drafts WHERE id = ? AND status IN ('draft', 'rejected')",
      ).bind(id).first<{ title: string }>();
      if (!proposal) throw new ApiError(404, "PROPOSAL_NOT_FOUND", "The editable proposal draft was not found.");
      const results = await database.batch([
        database.prepare(
          `UPDATE proposal_drafts SET status = 'pending_approval', updated_by = ?, updated_at = ? WHERE id = ? AND status IN ('draft', 'rejected')`,
        ).bind(identity.email, new Date().toISOString(), id),
        database.prepare(
          `INSERT INTO approval_queue (id, resource_type, resource_id, requested_by, summary)
           SELECT ?, 'proposal', ?, ?, ? WHERE changes() = 1`,
        ).bind(crypto.randomUUID(), id, identity.email, `Proposal review: ${proposal.title}`),
        database.prepare(
          `INSERT INTO audit_events (id, actor_email, actor_role, action, resource_type, resource_id, details_json)
           VALUES (?, ?, ?, 'proposal.submitted', 'proposal', ?, '{}')`,
        ).bind(crypto.randomUUID(), identity.email, identity.role, id),
      ]);
      if (results[0]?.meta.changes !== 1) throw new ApiError(409, "PROPOSAL_CONFLICT", "The proposal changed before it could be submitted.");
      return jsonResponse({ data: { id, status: "pending_approval" } });
    }
    if (input.action === "agent.update") {
      requireRole(identity, ["admin"]);
      const agentId = typeof input.agentId === "string" ? input.agentId : "";
      const definition = agentDefinitions.find((agent) => agent.id === agentId);
      if (!definition || definition.execution !== "model" || typeof input.enabled !== "boolean") {
        throw new ApiError(422, "INVALID_AGENT_SETTING", "Only model specialist agents can be enabled or disabled.");
      }
      const result = await database.batch([
        database.prepare(
          `INSERT INTO ai_agent_settings (agent_id, enabled, updated_by, updated_at) VALUES (?, ?, ?, ?)
           ON CONFLICT(agent_id) DO UPDATE SET enabled = excluded.enabled, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
        ).bind(agentId, Number(input.enabled), identity.email, new Date().toISOString()),
        database.prepare(
          `INSERT INTO audit_events (id, actor_email, actor_role, action, resource_type, resource_id, details_json)
           VALUES (?, ?, ?, 'agent_setting.updated', 'agent_setting', ?, ?)`,
        ).bind(crypto.randomUUID(), identity.email, identity.role, agentId, JSON.stringify({ enabled: input.enabled })),
      ]);
      if (result[0]?.success !== true) throw new ApiError(500, "AGENT_SETTING_FAILED", "The agent setting could not be saved.");
      return jsonResponse({ data: { agentId, enabled: input.enabled } });
    }
    if (input.action === "assistant.update") {
      requireRole(identity, ["admin"]);
      if (typeof input.enabled !== "boolean") throw new ApiError(422, "INVALID_SETTING", "Choose whether the assistant is enabled.");
      const result = await database.batch([
        database.prepare(
          `INSERT INTO admin_settings (setting_key, setting_value, updated_by, updated_at) VALUES ('assistant_enabled', ?, ?, ?)
           ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
        ).bind(String(input.enabled), identity.email, new Date().toISOString()),
        database.prepare(
          `INSERT INTO audit_events (id, actor_email, actor_role, action, resource_type, resource_id, details_json)
           VALUES (?, ?, ?, 'assistant_setting.updated', 'assistant_setting', 'assistant_enabled', ?)`,
        ).bind(crypto.randomUUID(), identity.email, identity.role, JSON.stringify({ enabled: input.enabled })),
      ]);
      if (result[0]?.success !== true) throw new ApiError(500, "SETTING_SAVE_FAILED", "The assistant setting could not be saved.");
      return jsonResponse({ data: { enabled: input.enabled } });
    }
    throw new ApiError(400, "INVALID_ACTION", "Choose a supported dashboard action.");
  } catch (error) {
    return errorResponse(error);
  }
};

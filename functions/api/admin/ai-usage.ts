import { authenticateAdmin, requireRole } from "../../../src/lib/auth";
import type { Database } from "../../../src/lib/database";
import { errorResponse, jsonResponse } from "../../../src/lib/http";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const identity = await authenticateAdmin(request, env.DB as Database, env);
    requireRole(identity, ["admin"]);
    const database = env.DB as Database;
    const [usage, daily, agents] = await Promise.all([
      database.prepare(
        `SELECT usage_date, model, successes, failures, prompt_tokens, completion_tokens, duration_ms
         FROM ai_usage_daily ORDER BY usage_date DESC, model LIMIT 90`,
      ).all<Record<string, unknown>>(),
      database.prepare(
        "SELECT usage_date, request_count FROM ai_daily_limits ORDER BY usage_date DESC LIMIT 30",
      ).all<Record<string, unknown>>(),
      database.prepare(
        `SELECT usage_date, agent_id, invocations, successes, failures,
                prompt_tokens, completion_tokens, duration_ms,
                CASE WHEN invocations = 0 THEN 0 ELSE ROUND(100.0 * successes / invocations, 1) END AS reliability_percent,
                CASE WHEN invocations = 0 THEN 0 ELSE ROUND(1.0 * duration_ms / invocations, 1) END AS average_latency_ms
         FROM ai_agent_usage_daily ORDER BY usage_date DESC, agent_id LIMIT 300`,
      ).all<Record<string, unknown>>(),
    ]);
    await database.prepare(
      `INSERT INTO audit_events
         (id, actor_email, actor_role, action, resource_type, resource_id, details_json)
       VALUES (?, ?, ?, 'ai_usage.viewed', 'ai_usage', NULL, '{}')`,
    ).bind(crypto.randomUUID(), identity.email, identity.role).run();
    return jsonResponse({
      data: usage.results,
      dailyRequests: daily.results,
      agents: agents.results,
      dailyLimit: parseDailyCap(env.AI_MAX_DAILY_REQUESTS),
      costs: {
        aiApiCurrencyCharge: 0,
        infrastructureCost: "Not measured",
        providerCost: "Self-hosted Ollama; local inference has no per-token API charge. Hosting, hardware, power, network and maintenance are not zero-cost by default.",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
};

function parseDailyCap(value: string | undefined): number {
  const parsed = value ? Number(value) : 50;
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5000 ? parsed : 50;
}

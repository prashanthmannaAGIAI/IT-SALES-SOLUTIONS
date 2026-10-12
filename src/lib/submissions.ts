import type { Database, DatabaseStatement } from "./database";
import { ApiError, errorResponse, jsonResponse, readJsonBody, requireSameOrigin } from "./http";
import { validateConsultation, validateInquiry } from "./validation";

const RATE_WINDOW_SECONDS = 15 * 60;
const MAX_SUBMISSIONS_PER_WINDOW = 5;

interface SubmissionEnvironment {
  DB: Database;
  PERSONAL_DATA_STORAGE_APPROVED: string;
  RATE_LIMIT_HMAC_SECRET: string;
}

type SubmissionKind = "enquiry" | "consultation";

export async function handleSubmission(
  request: Request,
  environment: SubmissionEnvironment,
  kind: SubmissionKind,
): Promise<Response> {
  try {
    requireSameOrigin(request);
    if (environment.PERSONAL_DATA_STORAGE_APPROVED !== "true") {
      throw new ApiError(
        503,
        "SUBMISSIONS_NOT_ENABLED",
        "Online submissions are not available until data-handling approval is complete.",
      );
    }

    const key = environment.RATE_LIMIT_HMAC_SECRET;
    if (typeof key !== "string" || key.length < 32) {
      throw new ApiError(503, "SERVICE_NOT_CONFIGURED", "The request service is not configured.");
    }

    const clientAddress = request.headers.get("CF-Connecting-IP");
    if (!clientAddress) {
      throw new ApiError(503, "RATE_LIMIT_UNAVAILABLE", "The request service is temporarily unavailable.");
    }

    const now = Math.floor(Date.now() / 1000);
    const windowStart = Math.floor(now / RATE_WINDOW_SECONDS) * RATE_WINDOW_SECONDS;
    const keyHash = await hashRateKey(clientAddress, key);
    await environment.DB.prepare(
      "DELETE FROM submission_rate_limits WHERE window_start < ?",
    ).bind(now - 24 * 60 * 60).run();
    const rateResult = await environment.DB.prepare(
      `INSERT INTO submission_rate_limits (key_hash, window_start, request_count)
       VALUES (?, ?, 1)
       ON CONFLICT(key_hash, window_start)
       DO UPDATE SET request_count = request_count + 1
       RETURNING request_count`,
    ).bind(keyHash, windowStart).first<{ request_count: number }>();
    if (!rateResult) {
      throw new ApiError(503, "RATE_LIMIT_UNAVAILABLE", "The request service is temporarily unavailable.");
    }
    if (rateResult.request_count > MAX_SUBMISSIONS_PER_WINDOW) {
      throw new ApiError(429, "RATE_LIMITED", "Too many requests. Please wait and try again.");
    }

    const input = await readJsonBody(request);
    const id = crypto.randomUUID();
    const auditId = crypto.randomUUID();
    const consentAcceptedAt = new Date().toISOString();
    const submission = kind === "enquiry" ? validateInquiry(input) : validateConsultation(input);

    const statements: DatabaseStatement[] = kind === "enquiry"
      ? [
          environment.DB.prepare(
            `INSERT INTO enquiries (id, name, email, organization, industry, message)
             VALUES (?, ?, ?, ?, ?, ?)`,
          ).bind(
            id,
            submission.name,
            submission.email,
            submission.organization || null,
            submission.industry || null,
            "message" in submission ? submission.message : "",
          ),
          environment.DB.prepare(
            `INSERT INTO audit_events (id, actor_email, actor_role, action, resource_type, resource_id, details_json)
             VALUES (?, 'system:public', 'system', 'submission.created', 'enquiry', ?, ?)`,
          ).bind(auditId, id, JSON.stringify({ channel: "website", consentAcceptedAt })),
        ]
      : [
          environment.DB.prepare(
            `INSERT INTO consultation_requests
             (id, name, email, organization, industry, timezone, preferred_time, topic, context)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ).bind(
            id,
            submission.name,
            submission.email,
            submission.organization || null,
            submission.industry || null,
            "timezone" in submission ? submission.timezone : "",
            "preferredTime" in submission ? submission.preferredTime : "",
            "topic" in submission ? submission.topic : "",
            "context" in submission ? submission.context || null : null,
          ),
          environment.DB.prepare(
            `INSERT INTO audit_events (id, actor_email, actor_role, action, resource_type, resource_id, details_json)
             VALUES (?, 'system:public', 'system', 'submission.created', 'consultation', ?, ?)`,
          ).bind(auditId, id, JSON.stringify({ channel: "website", consentAcceptedAt })),
        ];
    await environment.DB.batch(statements);
    return jsonResponse({ id, status: "received" }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

async function hashRateKey(address: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(address)));
  return Array.from(signature, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

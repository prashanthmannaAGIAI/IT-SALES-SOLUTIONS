import assert from "node:assert/strict";
import { test } from "node:test";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import type { AdminIdentity } from "../src/lib/auth";
import { authenticateAdmin, requireRole } from "../src/lib/auth";
import type { Database, DatabaseStatement } from "../src/lib/database";
import { getPublishedContent } from "../src/lib/database";
import { ApiError } from "../src/lib/http";
import { handleSubmission } from "../src/lib/submissions";
import { deleteManagedContent, saveManagedContent } from "../src/lib/admin-content";
import { validateConsultation, validateInquiry } from "../src/lib/validation";
import { services } from "../src/data/services";
import { onRequestGet as getAdminHub, onRequestPatch as patchAdminHub, onRequestPost as postAdminHub } from "../functions/api/admin/hub";

type MockDatabaseOptions = {
  first?: (query: string, values: unknown[]) => unknown;
  all?: (query: string, values: unknown[]) => unknown[];
  batch?: (queries: string[], values: unknown[][], statementCount: number) => Array<{ success: boolean; meta: { changes: number } }>;
  run?: (query: string, values: unknown[]) => { success: boolean; meta: { changes: number } };
};

function mockDatabase(options: MockDatabaseOptions = {}) {
  const queries: string[] = [];
  const bindings: unknown[][] = [];
  const database: Database = {
    prepare(query: string): DatabaseStatement {
      queries.push(query);
      let values: unknown[] = [];
      const statement: DatabaseStatement = {
        bind(...bound: unknown[]) {
          values = bound;
          bindings.push(bound);
          return statement;
        },
        async first<T>() {
          return (options.first?.(query, values) as T | null | undefined) ?? null;
        },
        async all<T>() {
          return { results: (options.all?.(query, values) ?? []) as T[] };
        },
        async run() {
          return options.run?.(query, values) ?? { success: true, meta: { changes: 1 } };
        },
      };
      return statement;
    },
    async batch(statements) {
      return options.batch?.(queries, bindings, statements.length) ?? statements.map(() => ({ success: true, meta: { changes: 1 } }));
    },
  };
  return { database, queries, bindings };
}

function submissionRequest(path: string, body: unknown): Request {
  return new Request(`https://site.example/api/${path}`, {
    method: "POST",
    headers: {
      Origin: "https://site.example",
      "Content-Type": "application/json",
      "CF-Connecting-IP": "192.0.2.10",
    },
    body: JSON.stringify(body),
  });
}

const submissionEnv = (DB: Database, approved = "true") => ({
  DB,
  PERSONAL_DATA_STORAGE_APPROVED: approved,
  RATE_LIMIT_HMAC_SECRET: "test-secret-that-is-long-enough-for-hmac-rate-limits",
});

const validEnquiry = {
  name: "Example Person",
  email: "person@example.com",
  organization: "Example Org",
  industry: "healthcare",
  message: "Please contact me about an example enquiry.",
  consent: "I understand this information is submitted to HighEnd IT Sales & Solutions.",
  companyWebsite: "",
};

test("validates enquiry and consultation shapes and required consent", () => {
  assert.equal(validateInquiry(validEnquiry).email, "person@example.com");
  assert.throws(() => validateInquiry({ ...validEnquiry, consent: "" }), ApiError);
  assert.throws(() => validateInquiry({ ...validEnquiry, companyWebsite: "spam" }), ApiError);
  assert.throws(() => validateConsultation({ ...validEnquiry, topic: "not a topic" }), ApiError);
  assert.equal(validateConsultation({
    name: validEnquiry.name,
    email: validEnquiry.email,
    organization: validEnquiry.organization,
    industry: validEnquiry.industry,
    consent: validEnquiry.consent,
    companyWebsite: "",
    timezone: "Asia/Dubai",
    preferredTime: "Weekday morning",
    topic: "AI and automation",
  }).timezone, "Asia/Dubai");
});

test("submission endpoint stays closed without approval and never reaches the database", async () => {
  const { database, queries } = mockDatabase();
  const response = await handleSubmission(submissionRequest("enquiries", validEnquiry), submissionEnv(database, "false"), "enquiry");
  assert.equal(response.status, 503);
  assert.deepEqual(queries, []);
});

test("valid enquiry is persisted atomically with a non-sensitive audit event", async () => {
  let batched = 0;
  const { database, queries } = mockDatabase({
    first: (query) => query.includes("RETURNING request_count") ? { request_count: 1 } : null,
    batch: (_queries, _values, statementCount) => {
      batched = statementCount;
      return Array.from({ length: statementCount }, () => ({ success: true, meta: { changes: 1 } }));
    },
  });
  const response = await handleSubmission(submissionRequest("enquiries", validEnquiry), submissionEnv(database), "enquiry");
  assert.equal(response.status, 201);
  assert.equal(batched, 2);
  assert.ok(queries.some((query) => query.includes("INSERT INTO enquiries")));
  assert.ok(queries.some((query) => query.includes("INSERT INTO audit_events")));
  assert.equal((await response.json() as { status: string }).status, "received");
});

test("valid consultation request stores scheduling preferences without creating a booking", async () => {
  const savedQueries: string[] = [];
  const { database } = mockDatabase({
    first: (query) => query.includes("RETURNING request_count") ? { request_count: 1 } : null,
    batch: (queries, _values, statementCount) => {
      savedQueries.push(...queries.filter((query) => query.includes("INSERT INTO consultation_requests")));
      return Array.from({ length: statementCount }, () => ({ success: true, meta: { changes: 1 } }));
    },
  });
  const response = await handleSubmission(submissionRequest("consultations", {
    name: validEnquiry.name,
    email: validEnquiry.email,
    organization: validEnquiry.organization,
    industry: validEnquiry.industry,
    timezone: "Asia/Dubai",
    preferredTime: "Weekday morning",
    topic: "AI and automation",
    context: "Synthetic consultation test.",
    consent: validEnquiry.consent,
    companyWebsite: "",
  }), submissionEnv(database), "consultation");
  assert.equal(response.status, 201);
  assert.equal(savedQueries.length, 1);
  assert.match(savedQueries[0], /preferred_time/);
});

test("submission rejects cross-origin requests and surfaces validation and database failures", async () => {
  const { database } = mockDatabase();
  const crossOrigin = submissionRequest("enquiries", validEnquiry);
  crossOrigin.headers.set("Origin", "https://attacker.example");
  assert.equal((await handleSubmission(crossOrigin, submissionEnv(database), "enquiry")).status, 403);

  const validationDb = mockDatabase({
    first: (query) => query.includes("RETURNING request_count") ? { request_count: 1 } : null,
  });
  const invalid = await handleSubmission(
    submissionRequest("enquiries", { ...validEnquiry, email: "invalid" }),
    submissionEnv(validationDb.database),
    "enquiry",
  );
  assert.equal(invalid.status, 422);

  const brokenDb = mockDatabase({
    first: (query) => query.includes("RETURNING request_count") ? { request_count: 1 } : null,
    batch: () => { throw new Error("database unavailable"); },
  });
  const failed = await handleSubmission(submissionRequest("enquiries", validEnquiry), submissionEnv(brokenDb.database), "enquiry");
  assert.equal(failed.status, 500);
  assert.equal((await failed.text()).includes(validEnquiry.email), false);
});

test("submission rate limiting fails closed when exhausted or unconfigured", async () => {
  const exhaustedDb = mockDatabase({
    first: (query) => query.includes("RETURNING request_count") ? { request_count: 6 } : null,
  });
  const limited = await handleSubmission(
    submissionRequest("enquiries", validEnquiry),
    submissionEnv(exhaustedDb.database),
    "enquiry",
  );
  assert.equal(limited.status, 429);
  assert.equal(exhaustedDb.queries.some((query) => query.includes("INSERT INTO enquiries")), false);

  const unconfigured = await handleSubmission(
    submissionRequest("enquiries", validEnquiry),
    { ...submissionEnv(mockDatabase().database), RATE_LIMIT_HMAC_SECRET: "" },
    "enquiry",
  );
  assert.equal(unconfigured.status, 503);

  const noClientAddress = submissionRequest("enquiries", validEnquiry);
  noClientAddress.headers.delete("CF-Connecting-IP");
  assert.equal((await handleSubmission(noClientAddress, submissionEnv(mockDatabase().database), "enquiry")).status, 503);
});

test("content reads parse stored JSON and fail explicitly for invalid payloads", async () => {
  const row = { slug: "example", data_json: JSON.stringify({ slug: "example", title: "Example" }) };
  const { database } = mockDatabase({ all: () => [row] });
  assert.deepEqual(await getPublishedContent(database, "services"), [{ slug: "example", title: "Example" }]);
  const invalid = mockDatabase({ all: () => [{ slug: "broken", data_json: "[]" }] });
  await assert.rejects(getPublishedContent(invalid.database, "services"), /could not be loaded/);
});

test("content writes validate records and batch content with its audit event", async () => {
  let batchLength = 0;
  const { database } = mockDatabase({
    batch: (queries) => {
      batchLength = queries.length;
      return queries.map(() => ({ success: true, meta: { changes: 1 } }));
    },
  });
  const identity: AdminIdentity = { email: "admin@example.com", role: "admin" };
  const slug = await saveManagedContent(database, "services", services[0], identity, true);
  assert.equal(slug, services[0].slug);
  assert.equal(batchLength, 2);
  await assert.rejects(saveManagedContent(database, "services", { slug: "bad" }, identity, false), ApiError);
});

test("content deletion reports missing records rather than succeeding silently", async () => {
  const { database } = mockDatabase({
    batch: () => [{ success: true, meta: { changes: 0 } }, { success: true, meta: { changes: 0 } }],
  });
  await assert.rejects(
    deleteManagedContent(database, "services", "missing-record", { email: "admin@example.com", role: "admin" }),
    (error: unknown) => error instanceof ApiError && error.status === 404,
  );
});

test("Access JWT validation enforces issuer, audience and active database roles", async () => {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const team = "example-team.cloudflareaccess.com";
  const audience = "test-access-audience";
  const token = await new SignJWT({ email: "ADMIN@example.com" })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(`https://${team}`)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
  const db = mockDatabase({ first: () => ({ email: "admin@example.com", role: "admin" }) });
  const request = new Request("https://site.example/api/admin/services", {
    headers: { "Cf-Access-Jwt-Assertion": token },
  });

  const identity = await authenticateAdmin(
    request,
    db.database,
    { CF_ACCESS_TEAM_DOMAIN: team, CF_ACCESS_AUD: audience },
    async () => publicKey,
  );
  assert.deepEqual(identity, { email: "admin@example.com", role: "admin" });
  requireRole(identity, ["admin"]);
  assert.throws(() => requireRole({ email: "viewer@example.com", role: "viewer" }, ["admin"]), (error: unknown) =>
    error instanceof ApiError && error.status === 403,
  );

  await assert.rejects(
    authenticateAdmin(request, db.database, { CF_ACCESS_TEAM_DOMAIN: team, CF_ACCESS_AUD: "wrong-aud" }, async () => publicKey),
    (error: unknown) => error instanceof ApiError && error.status === 401,
  );
  await assert.rejects(
    authenticateAdmin(new Request("https://site.example"), db.database, { CF_ACCESS_TEAM_DOMAIN: team, CF_ACCESS_AUD: audience }),
    (error: unknown) => error instanceof ApiError && error.status === 401,
  );
});

test("every administration hub API rejects unauthenticated reads and writes", async () => {
  const { database, queries } = mockDatabase();
  const env = {
    DB: database as unknown as Env["DB"],
    CF_ACCESS_TEAM_DOMAIN: "example-team.cloudflareaccess.com",
    CF_ACCESS_AUD: "test-audience",
  } as Env;
  const invoke = (handler: typeof getAdminHub, request: Request) => handler({
    request,
    env,
  } as Parameters<typeof getAdminHub>[0]);
  for (const section of ["overview", "projects", "proposals", "approvals", "activity", "errors", "agents", "settings"]) {
    const response = await invoke(getAdminHub, new Request(`https://site.example/api/admin/hub?section=${section}`));
    assert.equal(response.status, 401, `${section} must require an Access identity`);
  }
  const postRequest = new Request("https://site.example/api/admin/hub", {
    method: "POST",
    headers: { Origin: "https://site.example", "Content-Type": "application/json" },
    body: JSON.stringify({ action: "project.create", name: "Test" }),
  });
  const patchRequest = new Request("https://site.example/api/admin/hub", {
    method: "PATCH",
    headers: { Origin: "https://site.example", "Content-Type": "application/json" },
    body: JSON.stringify({ action: "approval.review" }),
  });
  assert.equal((await invoke(postAdminHub, postRequest)).status, 401);
  assert.equal((await invoke(patchAdminHub, patchRequest)).status, 401);
  assert.deepEqual(queries, []);
});

test("hub enforces role boundaries and returns only actual overview aggregates", async () => {
  const team = `admin-hub-${crypto.randomUUID()}.cloudflareaccess.com`;
  const audience = "admin-hub-test-audience";
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  jwk.kid = "admin-hub-test-key";
  jwk.alg = "RS256";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    if (String(input).includes(`/cdn-cgi/access/certs`)) return Response.json({ keys: [jwk] });
    return originalFetch(input);
  };
  const { database, queries } = mockDatabase({
    first: (query, values) => {
      if (query.includes("FROM admin_users")) {
        const email = values[0];
        return { email, role: email === "admin@example.com" ? "admin" : email === "editor@example.com" ? "editor" : "viewer" };
      }
      if (query.includes("FROM approval_queue WHERE id")) {
        return { resource_type: "proposal", resource_id: crypto.randomUUID() };
      }
      if (query.includes("COUNT(*) AS total")) return { total: 0 };
      return null;
    },
  });
  const env = {
    DB: database as unknown as Env["DB"],
    CF_ACCESS_TEAM_DOMAIN: team,
    CF_ACCESS_AUD: audience,
  } as Env;
  const invoke = (handler: typeof getAdminHub, request: Request) => handler({
    request,
    env,
  } as Parameters<typeof getAdminHub>[0]);
  const accessRequest = async (email: string, url: string, method = "GET", body?: unknown): Promise<Request> => {
    const token = await new SignJWT({ email })
      .setProtectedHeader({ alg: "RS256", kid: "admin-hub-test-key" })
      .setIssuer(`https://${team}`)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
    return new Request(url, {
      method,
      headers: {
        "Cf-Access-Jwt-Assertion": token,
        ...(method !== "GET" ? { Origin: new URL(url).origin, "Content-Type": "application/json" } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  };
  try {
    const viewerProjects = await invoke(getAdminHub, await accessRequest("viewer@example.com", "https://site.example/api/admin/hub?section=projects"));
    assert.equal(viewerProjects.status, 403);

    const editorApproval = await invoke(patchAdminHub, await accessRequest(
      "editor@example.com",
      "https://site.example/api/admin/hub",
      "PATCH",
      { action: "approval.review", id: crypto.randomUUID(), status: "approved" },
    ));
    assert.equal(editorApproval.status, 403);

    const overview = await invoke(getAdminHub, await accessRequest("admin@example.com", "https://site.example/api/admin/hub?section=overview"));
    assert.equal(overview.status, 200);
    const overviewBody = await overview.json() as { data: Record<string, number | null> };
    assert.equal(overviewBody.data.publishedServices, 0);
    assert.equal(overviewBody.data.enquiries, 0);
    assert.equal(overviewBody.data.agentInvocations30d, 0);

    const createProject = await invoke(postAdminHub, await accessRequest(
      "admin@example.com",
      "https://site.example/api/admin/hub",
      "POST",
      { action: "project.create", name: "Synthetic test project", summary: "Test-only data." },
    ));
    assert.equal(createProject.status, 201);
    assert.ok(queries.some((query) => query.includes("INSERT INTO projects")));

    const approvalId = crypto.randomUUID();
    const approvalReview = await invoke(patchAdminHub, await accessRequest(
      "admin@example.com",
      "https://site.example/api/admin/hub",
      "PATCH",
      { action: "approval.review", id: approvalId, status: "approved", note: "Internal review only." },
    ));
    assert.equal(approvalReview.status, 200);
    assert.deepEqual((await approvalReview.json() as { data: { status: string; executed: boolean } }).data, {
      id: approvalId,
      status: "approved",
      executed: false,
    });
    assert.ok(queries.some((query) => query.includes("UPDATE approval_queue")));
    assert.ok(queries.some((query) => query.includes("UPDATE proposal_drafts")));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

# Backend operations

The site remains a static Astro build. Cloudflare Pages serves `dist/` and the `functions/` directory supplies API routes. D1 is the application database. HE Intelligence uses a server-side integration with a self-hosted Ollama `/api/chat` endpoint. No external paid AI API, mail delivery, calendar provider, analytics platform or KV session store is configured.

## Local development

Use synthetic data only:

```sh
npm install
npm run db:migrate:local
npm run db:seed:local
npm run preview
```

`npm run preview` builds the static site and starts `wrangler pages dev`, which runs Pages Functions against the local D1 database. `npm run dev` starts the Astro-only development server and does not run D1-backed Pages Functions.

To enable the assistant locally, separately install and run Ollama, select and install a model whose license and hardware needs have been reviewed, then set the Ollama URL and model in the private `.dev.vars` file. The sample values in `.dev.vars.example` (`127.0.0.1:11434` and `qwen3:4b`) are illustrative defaults, not a configured or tested model. Do not download a model automatically as part of project setup. The chat stays disabled when the endpoint or model configuration is absent. `npm run preview` is required to exercise the API; the Astro-only `npm run dev` does not serve these Pages Functions.

The public request APIs are intentionally closed while `PERSONAL_DATA_STORAGE_APPROVED` is `false`. To exercise the entire request flow locally, copy `.dev.vars.example` to `.dev.vars` and use synthetic data and a private, random local `RATE_LIMIT_HMAC_SECRET` of at least 32 characters. Keep the approval flag false in normal development. Never copy real personal information into a local database.

## Cloudflare setup and deployment

1. The `highend-it-sales-solutions` Pages project is provisioned. Deploy the built site and Functions with `npm run deploy`. The project currently uses direct Wrangler deployments; connect the GitHub repository through Cloudflare Pages settings if automatic deployment on pushes is desired.
2. The `highend-content` D1 database is provisioned in APAC and its ID is configured in `wrangler.jsonc`. Its tables are migrated and seeded with the site's published services, industries, articles and approved public assistant knowledge. These records are public site content, not visitor submissions.
3. D1 does not provide a UAE jurisdiction option. Do not store real enquiries or consultation details in D1 unless the organization has reviewed and approved the applicable residency, privacy, legal and contractual requirements.
4. For a new environment, create the database with `npx wrangler d1 create highend-content`, configure the returned ID in `wrangler.jsonc`, apply migrations with `npm run db:migrate:remote`, then seed approved public content with `$env:CONFIRM_REMOTE_SEED = "yes"; npm run db:seed:remote`. Remote seeding is deliberately gated.
5. Configure `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` for the Cloudflare Access application in the Pages Functions production environment. Configure an Access policy that requires the organization's chosen identity provider for `/admin/*` and `/api/admin/*`. The API independently validates the Access JWT and checks the active D1 role.
6. Add a strong secret with `npx wrangler pages secret put RATE_LIMIT_HMAC_SECRET --project-name highend-it-sales-solutions`. The value must be at least 32 characters. Never put it in frontend code, `wrangler.jsonc`, or a committed environment file.
7. Keep `PERSONAL_DATA_STORAGE_APPROVED=false` until data storage and retention are approved. Only then may the owner deliberately change that production variable to `true`.
8. Cloudflare account access, project setup, D1 creation, GitHub integration and secret provisioning require a human with appropriate account permissions. Cloudflare usage may exceed free-plan quotas; verify current plan limits and pricing before launch.

## HE Intelligence and Ollama

- `POST /api/assistant` accepts a bounded recent conversation and forwards it from the server to the configured Ollama `/api/chat` endpoint. The browser never receives the Ollama endpoint credential. `GET /api/assistant` reports whether the URL/model are configured, not whether the model is currently healthy.
- Configure `OLLAMA_BASE_URL` and `OLLAMA_MODEL` as Pages Function variables. A sample model name is not a recommendation; the owner must install and evaluate the actual model, review its license, language support, response quality, safety and hardware requirements.
- For local development, HTTP is permitted only for loopback Ollama. Any non-local endpoint must use HTTPS. Configure a private network path or a hardened HTTPS gateway that requires a bearer token; put that token in the `OLLAMA_API_KEY` Pages secret, never in source, `wrangler.jsonc`, client code or a committed environment file. Do not expose Ollama's unauthenticated port directly to the public internet. Restrict ingress, protect the host, and verify that gateway, tunnel and Ollama logs do not retain prompts unexpectedly. Redirects are rejected.
- Cloudflare Pages cannot reach an Ollama process bound only to a developer's machine. Production needs a continuously available, appropriately secured host reachable from Pages Functions. A public endpoint, VPS, GPU service, tunnel, gateway, DNS, TLS, firewall and monitoring may introduce recurring costs. Keep the model host in an approved data jurisdiction and review cross-border processing before sending any visitor information.
- Set `AI_MAX_DAILY_REQUESTS` to an integer from 1 to 5000. The default is 50 requests/day; per-client rate limits are also applied. Requests, failures, prompt/completion token counts and aggregate latency are recorded by day and model in D1. No prompt, conversation, provider response or API key is stored in application tables. Metrics can fail independently; that failure is logged without discarding an otherwise valid answer. The dashboard's administrator-only usage view reports model usage and explains that it does not calculate hardware, hosting, energy or other infrastructure costs.
- No per-token API charge is incurred by a self-hosted model itself. Total operating cost is not zero by guarantee: compute/GPU hardware, electricity, hosting, networking, storage, monitoring, Cloudflare plan usage, backups, operator time and any selected model license must be assessed by the owner. Confirm current provider limits and prices before deployment.
- The assistant retrieves only D1 knowledge with both `approved = 1` and `active = 1`, and recommends only currently published services. The seed command imports the public service/industry site content and a small set of explicit assistant limitations as approved records. Knowledge edits through `/admin/` are audited; editors may draft/update but only admins may approve; saves invalidate previous approval unless reapproved by an admin. Admins can deactivate or delete entries. Check the source text and intended public disclosure before approving new material.
- The model gets a fixed safety prompt, public approved source excerpts, a published-service list and at most eight recent user/assistant turns. Its sole tool is a read-only search across approved public knowledge. Tool count, response bytes, input size, timeout, daily requests and per-client request frequency are bounded. Model output is validated against a strict structured schema, unknown service/source slugs are discarded, and the UI renders text rather than HTML. These controls reduce risk but do not guarantee that a generative model will never make a mistake; do not use its output for consequential decisions or provide sensitive information.
- The assistant can suggest `/consultation/` but cannot submit forms, send email or book a meeting. Form storage remains closed unless separately approved and enabled. A configured host's availability and all model behavior must be evaluated before public launch.

## Phase 6: modular agent workflow

- The orchestration remains inside the Pages Function and uses the same self-hosted Ollama model. No paid API, model service, agent framework subscription, queue, workflow SaaS or new external dependency is added.
- The request router deterministically selects at most two relevant model specialists from the Research, Industry Solutions, Business Consultant, AI Solutions Architect, Automation, Cloud and DevOps, Sales Assistant, Analytics and Customer Support agents. The Knowledge Agent performs local read-only D1 retrieval. The Responsible AI Guardrail Agent performs deterministic input/output checks. Routing, knowledge lookup and guardrails are not represented as separate model invocations.
- Agent definitions in `src/lib/agents.ts` declare each purpose, input, output, permitted tool names, access boundary, instructions and execution kind. Agent model output is strictly schema-validated before merge. Unknown service and knowledge references are removed. The orchestration tool executor only provides approved knowledge search and published-service reads; there are no tools for outbound communication, CRM, pricing, contracts, purchases, data deletion, shell commands, cloud credentials or production infrastructure.
- Public chat workflow cards are completed run records returned by the API: local routing/retrieval/guardrail and each specialist show completed or failed, actual measured duration, and the specialist's actual response summary. While waiting, the page reports only that it is submitting the request; it does not simulate individual agent activity. If one specialist fails while another succeeds, the response is marked with the real partial failure and uses the validated successful result. If all selected specialists fail, the request returns an explicit error.
- Deterministic guardrails mark requests involving external communications, commercial commitments, purchases, production changes or important data actions for human approval. No such action can be executed by an agent in this architecture. The response explicitly says no action was taken if a model claims that it sent, booked, purchased, changed or deleted something.
- Migration `0003_agent_usage.sql` records aggregate per-day agent invocations, successes, failures, model tokens and latency; the admin-only AI usage endpoint derives reliability percentage and average latency. Conversation content is not stored in the metrics. Per-request AI API charge is zero for local Ollama inference, but infrastructure cost is not measured and may not be zero.
- `AI_MAX_DAILY_REQUESTS` limits visitor requests; at most two specialists are dispatched per request, and each specialist has a bounded tool/finalization flow. CPU/GPU time, electricity, hosting capacity and memory are local operator constraints. Tune the request cap to available hardware; avoid exposing a local Ollama endpoint to the public internet.

Before enabling this workflow for visitors, apply all migrations, configure and test a reviewed local Ollama model and keep the website/API and Ollama on the same owner-controlled local host/network. A production setup requiring always-on infrastructure is outside a strict zero-cost guarantee. Do not use production-sensitive data or grant agents operational credentials.

Production secrets are set with Cloudflare Pages secrets, for example:

```sh
npx wrangler pages secret put RATE_LIMIT_HMAC_SECRET --project-name highend-it-sales-solutions
npx wrangler pages secret put OLLAMA_API_KEY --project-name highend-it-sales-solutions
```

Configure the Ollama URL/model and daily cap in the Pages Functions environment. `OLLAMA_API_KEY` is optional only when a trusted private network makes endpoint authentication unnecessary; an exposed endpoint must require authentication. Rotate secrets if they may have been disclosed, and never use the sample development secret in production.

The Cloudflare D1 database ID is a placeholder in the checked-in configuration. The site and APIs can be built and tested locally without Cloudflare credentials. Production deployment, Access protection, data residency approval and real submissions cannot be completed without the account owner.

## First administrator

Cloudflare Access authenticates identities; it does not grant application roles. Before using `/admin/`, the account owner must add the first administrator directly in the D1 console or with a reviewed SQL command. Replace the address with the intended Access identity:

```sql
INSERT INTO admin_users (email, role, active, created_by)
VALUES ('authorized-person@example.com', 'admin', 1, 'bootstrap');

INSERT INTO audit_events (id, actor_email, actor_role, action, resource_type, resource_id, details_json)
VALUES (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
        substr(lower(hex(randomblob(2))), 2) || '-a' ||
        substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
        'system:bootstrap', 'system', 'admin_user.bootstrap', 'admin_user',
        'authorized-person@example.com', '{}');
```

Run this only once for the intended initial account and verify the email against the Access identity. Afterward, admins can assign or deactivate viewer, editor and admin roles in the dashboard. Deactivation is used instead of deleting the role row; an administrator cannot deactivate or demote their own account from the dashboard.

## Backup and recovery

Backups contain personal information if real submissions have been enabled. Restrict access, encrypt them at rest and in transit, define a retention period, and never commit a backup or place it in a public/static directory.

Create the protected backup directory first, then create a full remote export outside the repository:

```sh
npx wrangler d1 export highend-content --remote --output "C:\secure-backups\highend-content-YYYY-MM-DD.sql"
```

For a local synthetic database, use `--local` instead of `--remote`. Protect the exported SQL as carefully as the source database. Record the export date, target database, migration level and operator in an approved operational log without copying personal records into that log.

To validate recovery, create a separate empty D1 database, configure a temporary binding to it, and import the protected export:

```sh
npx wrangler d1 execute highend-content-restore --remote --file "C:\secure-backups\highend-content-YYYY-MM-DD.sql"
```

Verify table counts, indexes, constraints, published content, role records and representative synthetic submissions in the isolated restore before any production cutover. For a new empty database without a full export, apply versioned migrations with `npm run db:migrate:remote` and seed approved public content; this does not restore submissions or administrator roles. Never restore into production without a reviewed change and an independently verified backup.

## API and access boundaries

- Public `POST /api/enquiries` and `POST /api/consultations` require same-origin requests, bounded JSON, strict Zod validation, an empty honeypot, explicit consent, a per-IP HMAC rate limit and an enabled storage flag. Submission data and its audit event are inserted in one D1 batch.
- Public `GET /api/content/:collection` exposes only published service, industry, article or product content.
- `/admin/` is a static dashboard shell; its data APIs validate Cloudflare Access JWT signature, issuer and audience, and then check an active database role on every request.
- Viewers can read managed content; editors can create or update it; only admins can delete content, see or manage submissions, or assign roles.
- Mutating admin APIs require same-origin requests. Submission status changes, content changes/deletes, and role changes/deactivations are audited. Audit metadata deliberately excludes submitted message bodies and other personal fields.
- Error responses do not include submitted data or raw exception messages. The health endpoint returns only readiness status.
- Request retention, backup retention, privacy notices, deletion procedures and any UAE/regulatory obligations require owner review and approval before production use.

## Phase 7: HE Intelligence Hub

- Apply `migrations/0004_admin_hub.sql` before using the expanded dashboard. It adds project records, internal proposal drafts, approval records, assistant enablement and specialist-agent enablement settings. Apply migrations to an isolated local database first and keep a protected backup before any production migration.
- The overview reports current content, project and submission counts plus recorded 30-day agent aggregates; empty tables report zero. No projected revenue, customer outcomes, or fabricated operational activity is generated. Submission counts and PII are shown only to admins.
- Editors and admins can create/update project records and prepare internal proposal drafts. An approval updates only the internal status; it does not send a proposal or authorize an external communication, commercial commitment, purchase, production change or deletion.
- Only admins can review queue items, administer users, view PII submissions, configure model-backed agents, inspect activity/aggregate failures, and enable or disable the public assistant. Knowledge retrieval, orchestration and responsible-AI guardrails cannot be disabled through agent settings.
- The dashboard uses server-side Access JWT and active-role checks for every API request. Leads are limited to 25 per page with status/search filters; project, proposal, approval, activity and error APIs also validate pagination and filters. Audit views intentionally omit stored event details, message text and provider-error text.
- Proposal text and project records may contain confidential business information. Keep synthetic content in development, enforce account-specific Access policy and approved retention, and complete applicable UAE privacy, residency and contractual review before production use. No additional paid provider, email, calendar, analytics or hosting service is integrated.

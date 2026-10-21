# HighEnd IT Sales & Solutions

Public marketing website for HighEnd IT Sales & Solutions LLC. The site is built with Astro as static assets; Cloudflare Pages Functions provide the API and Cloudflare D1 is the selected database.

## Local development

Requirements: Node.js 22.12+ (or 24.13+) and npm. To exercise HE Intelligence locally, install Ollama and a model separately; no model is downloaded by this project.

```sh
npm install
npm run dev
```

`npm run dev` serves Astro pages. To run the full Pages Functions and local D1 setup, use:

```sh
npm run db:migrate:local
npm run db:seed:local
npm run preview
```

Open the local URL printed by the selected command. Verify changes with:

```sh
npm run check
npm run lint
npm test
npm run build
```

The public site is generated in `dist/`; Pages Functions are in `functions/`. HE Intelligence uses the Ollama chat API through a server-side integration. The checked-in Ollama URL and model are examples only; the model host must be configured and reachable before the assistant is available. No external paid AI API, analytics service, mail sender or calendar booking integration is configured.

The assistant's modular Phase 6 workflow uses deterministic local routing, approved-knowledge retrieval, a deterministic responsible-AI guardrail, and at most two read-only specialist prompts to the same self-hosted Ollama model. No agent receives credentials or mutating tools. Admin metrics track invocation reliability, latency and token usage, not infrastructure cost. Zero-cost operation requires using existing owner hardware and electricity; always-on external hosting is not guaranteed to be free.

## Pages and content

- `src/pages/` contains the static page routes, including dynamic service, industry and insight pages.
- `src/data/services.ts`, `src/data/industries.ts` and `src/data/insights.ts` are the structured, checked-in content snapshots used to generate public pages.
- `src/components/` and `src/layouts/` contain shared navigation, page framing, calls to action and visual components.
- `public/highend-it-sales-solution-logo.png` is the site brand artwork used in the header, footer, assistant and favicon.

Industry detail pages are built from the reusable sector definitions and category profiles in `src/data/industries.ts`. The D1 content API and Access-protected administration dashboard provide storage and management for services, industries, articles and products. Public pages are generated from the checked-in content snapshots at build time; editing a D1 record does not rebuild an already deployed public page. Use the D1 management APIs/dashboard for backend content operations and update the source records before a deploy when the public page output needs to change.

Industry pages describe general capabilities and illustrative workflows only. They do not claim previous deployments, certifications or guaranteed outcomes. Regulated, safety-critical and professional activities are explicitly subject to appropriate specialist approval.

## Backend and data handling

Contact and consultation forms use server-side validated APIs with explicit loading, success and failure feedback. The APIs deliberately reject submissions while `PERSONAL_DATA_STORAGE_APPROVED=false`; do not enable personal-data persistence before reviewing data residency, privacy, contractual and retention requirements. Cloudflare D1's documented jurisdiction options do not currently include UAE. The website does not send email or reserve appointments. Cookie preferences are saved locally and do not activate analytics or optional tracking.

The Cloudflare D1 database ID and Access configuration are account-specific placeholders. See [docs/backend-operations.md](./docs/backend-operations.md) for local setup, deployment, first-admin setup, data boundaries, backups and recovery. The privacy notice, terms and hosting-provider disclosures need owner/legal approval before public production use.

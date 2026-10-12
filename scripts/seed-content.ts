import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { industries, industryCategories } from "../src/data/industries";
import { insights } from "../src/data/insights";
import { services } from "../src/data/services";

const mode = process.argv.includes("--remote") ? "--remote" : "--local";
if (process.argv.includes("--remote") && process.argv.includes("--local")) {
  throw new Error("Choose either --local or --remote.");
}
if (mode === "--remote" && process.env.CONFIRM_REMOTE_SEED !== "yes") {
  throw new Error("Remote seeding requires CONFIRM_REMOTE_SEED=yes after reviewing the target database.");
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function json(value: unknown): string {
  return sqlString(JSON.stringify(value));
}

const statements = [
  ...industryCategories.map((category, index) =>
    `INSERT INTO industry_categories (slug, name, sort_order) VALUES (${sqlString(category.slug)}, ${sqlString(category.name)}, ${index}) ON CONFLICT(slug) DO UPDATE SET name = excluded.name, sort_order = excluded.sort_order;`,
  ),
  ...services.map((service, index) =>
    `INSERT INTO services (slug, title, summary, data_json, published, sort_order) VALUES (${sqlString(service.slug)}, ${sqlString(service.title)}, ${sqlString(service.summary)}, ${json(service)}, 1, ${index}) ON CONFLICT(slug) DO UPDATE SET title = excluded.title, summary = excluded.summary, data_json = excluded.data_json, published = 1, sort_order = excluded.sort_order, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');`,
  ),
  ...industries.map((industry, index) =>
    `INSERT INTO industries (slug, category, title, summary, data_json, published, sort_order) VALUES (${sqlString(industry.slug)}, ${sqlString(industry.category)}, ${sqlString(industry.name)}, ${sqlString(industry.summary)}, ${json(industry)}, 1, ${index}) ON CONFLICT(slug) DO UPDATE SET category = excluded.category, title = excluded.title, summary = excluded.summary, data_json = excluded.data_json, published = 1, sort_order = excluded.sort_order, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');`,
  ),
  ...insights.map((article) =>
    `INSERT INTO articles (slug, category, title, summary, data_json, published, published_at) VALUES (${sqlString(article.slug)}, ${sqlString(article.category)}, ${sqlString(article.title)}, ${sqlString(article.summary)}, ${json(article)}, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) ON CONFLICT(slug) DO UPDATE SET category = excluded.category, title = excluded.title, summary = excluded.summary, data_json = excluded.data_json, published = 1, published_at = COALESCE(articles.published_at, excluded.published_at), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');`,
  ),
  ...services.map((service) => {
    const content = [
      service.introduction,
      `Capabilities: ${service.capabilities.join("; ")}.`,
      `Approach: ${service.approach.map(({ title, description }) => `${title}: ${description}`).join(" ")}`,
      `Illustrative example, not a claim of previous delivery: ${service.example}`,
    ].join("\n\n");
    const tags = [service.title, service.shortTitle, ...service.capabilities];
    return `INSERT INTO ai_knowledge (slug, category, title, content, tags_json, approved, active)
      VALUES (${sqlString(`service-${service.slug}`)}, 'services', ${sqlString(service.title)}, ${sqlString(content)}, ${json(tags)}, 1, 1)
      ON CONFLICT(slug) DO NOTHING;`;
  }),
  ...industries.map((industry) => {
    const content = [
      industry.introduction,
      `Common challenges: ${industry.challenges.join(" ")}`,
      `Potential opportunities: ${industry.opportunities.join(" ")}`,
      `Illustrative agent workflows: ${industry.agents.join(" ")}`,
      `Relevant services: ${industry.services.join(", ")}.`,
      `Possible integrations: ${industry.integrations.join("; ")}.`,
      `Safeguards: ${industry.safeguards.join(" ")}`,
      `Illustrative example only: ${industry.example}`,
    ].join("\n\n");
    const tags = [industry.name, industry.category, ...industry.keywords, ...industry.services];
    return `INSERT INTO ai_knowledge (slug, category, title, content, tags_json, approved, active)
      VALUES (${sqlString(`industry-${industry.slug}`)}, 'industries', ${sqlString(industry.name)}, ${sqlString(content)}, ${json(tags)}, 1, 1)
      ON CONFLICT(slug) DO NOTHING;`;
  }),
  ...[
    {
      slug: "company-overview",
      category: "company",
      title: "Company overview",
      content: "HighEnd IT Sales & Solutions LLC is based in Abu Dhabi, UAE. The company website describes its capabilities as AI solutions, AI agents and agentic automation, generative AI and enterprise knowledge assistants, AI readiness, cloud and DevOps, software and application development, data and analytics, cybersecurity, IT consulting and managed services, and technology products. The published website does not verify customer deployments, certifications, company achievements, or guarantees.",
      tags: ["company", "HighEnd IT Sales & Solutions", "Abu Dhabi", "UAE", "services"],
    },
    {
      slug: "faq-pricing",
      category: "faq",
      title: "Pricing and estimates",
      content: "No approved public pricing or rate card is available in the assistant knowledge base. Do not estimate or invent prices, timelines, or guarantees. Explain that scope, requirements, integrations, and operating constraints need to be discussed with the company before an estimate can be prepared.",
      tags: ["pricing", "cost", "quote", "estimate"],
    },
    {
      slug: "faq-consultation",
      category: "faq",
      title: "Consultations and contact",
      content: "The assistant can suggest the consultation page at /consultation/ but cannot submit a request, send email, reserve a time, or confirm a booking. A visitor must use the website form and receive a response through the company’s separately configured process. The website currently does not have an email or calendar integration.",
      tags: ["consultation", "contact", "booking", "appointment"],
    },
    {
      slug: "faq-agi",
      category: "faq",
      title: "AGI and advanced intelligence",
      content: "HighEnd IT Sales & Solutions describes readiness for future and AGI-era developments as exploration and planning. The company does not claim that it has achieved AGI or built AGI. Focus on practical AI capabilities available today and describe future intelligence as an evolving area.",
      tags: ["AGI", "artificial general intelligence", "readiness", "future"],
    },
    {
      slug: "assistant-safety",
      category: "policies",
      title: "Assistant limitations and safety",
      content: "The assistant provides preliminary information based on published company content. Its output is not medical, legal, financial, cybersecurity assurance, or regulatory advice. It cannot approve regulated services, make consequential decisions, access private customer records, execute workflows, or commit the company. Industry workflows are illustrative examples, not completed deployments. A qualified human must assess sensitive, regulated, safety-critical, or organization-specific decisions.",
      tags: ["limitations", "safety", "human review", "regulated", "advice"],
    },
  ].map((document) =>
    `INSERT INTO ai_knowledge (slug, category, title, content, tags_json, approved, active)
      VALUES (${sqlString(document.slug)}, ${sqlString(document.category)}, ${sqlString(document.title)}, ${sqlString(document.content)}, ${json(document.tags)}, 1, 1)
      ON CONFLICT(slug) DO NOTHING;`,
  ),
];

const directory = await mkdtemp(join(tmpdir(), "highend-seed-"));
const sqlFile = join(directory, "seed.sql");
try {
  await writeFile(sqlFile, `${statements.join("\n")}\n`, { encoding: "utf8", flag: "wx" });
  const wranglerCli = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));
  execFileSync(process.execPath, [
    wranglerCli,
    "d1", "execute", "highend-content", mode, "--file", sqlFile,
  ], { stdio: "inherit" });
  console.log(`Seeded ${services.length} services, ${industries.length} industries, ${industryCategories.length} categories, ${insights.length} articles and approved public assistant knowledge (${mode}).`);
} finally {
  await rm(directory, { recursive: true, force: true });
}

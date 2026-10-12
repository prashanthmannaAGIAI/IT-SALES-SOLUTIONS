import { z } from "zod";

export const agentOutputSchema = z.object({
  answer: z.string().trim().min(1).max(2200),
  clarifyingQuestions: z.array(z.string().max(300)).max(5),
  recommendedServiceSlugs: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100)).max(5),
  solutionBrief: z.object({
    objective: z.string().max(500),
    approach: z.string().max(1400),
    requirements: z.array(z.string().max(300)).max(8),
    risks: z.array(z.string().max(300)).max(8),
    humanReview: z.string().max(500),
  }).strict().nullable(),
  nextSteps: z.array(z.string().max(300)).max(6),
  knowledgeSlugs: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120)).max(8),
}).strict();

export type AgentOutput = z.infer<typeof agentOutputSchema>;

export interface AgentDefinition {
  id: string;
  name: string;
  purpose: string;
  input: string;
  output: string;
  tools: readonly string[];
  access: string;
  instructions: string;
  patterns: readonly RegExp[];
  execution: "model" | "local";
}

export interface AgentRun {
  id: string;
  name: string;
  status: "completed" | "failed";
  durationMs: number;
  summary: string;
}

const readOnlyTools = ["approved_knowledge.search", "published_services.read"] as const;

export const agentDefinitions: readonly AgentDefinition[] = [
  {
    id: "research",
    name: "Research Agent",
    purpose: "Synthesize approved company knowledge relevant to a visitor's question.",
    input: "Validated user question and approved public knowledge matches.",
    output: "Grounded response with source slugs, uncertainty and follow-up questions.",
    tools: ["approved_knowledge.search"],
    access: "Approved, active public knowledge only; no web access or private records.",
    instructions: "Research Agent: ground factual statements in provided approved sources; distinguish source facts from suggestions; if evidence is missing, say so.",
    patterns: [/\bresearch\b|\bsources?\b|\bevidence\b|\bwhat does .* say\b/i],
    execution: "model",
  },
  {
    id: "industry-solutions",
    name: "Industry Solutions Agent",
    purpose: "Map general industry challenges to illustrative capabilities and safeguards.",
    input: "Industry or sector question and approved industry knowledge.",
    output: "Illustrative opportunities, relevant services, integrations, risks and clarification needs.",
    tools: [...readOnlyTools],
    access: "Approved public industry and service content only; no deployment or outcome claims.",
    instructions: "Industry Solutions Agent: adapt general capability descriptions to the stated sector. Label workflows as illustrative and surface specialist, safety, privacy and regulatory review.",
    patterns: [/\bindustry\b|\bsector\b|\bhealthcare\b|\bhealth\b|\bfinance\b|\bfintech\b|\bmanufactur|\beducation\b|\bgovernment\b|\boil\b|\benergy\b|\blogistics\b|\bretail\b/i],
    execution: "model",
  },
  {
    id: "business-consultant",
    name: "Business Consultant Agent",
    purpose: "Clarify business goals, constraints, stakeholders and measurable next steps.",
    input: "Validated business need and conversation context.",
    output: "Clarifying questions, preliminary options and a human-reviewed next step.",
    tools: ["approved_knowledge.search"],
    access: "Public approved company content and user-provided conversation only.",
    instructions: "Business Consultant Agent: start from the desired business outcome and constraints; avoid invented ROI or guarantees; ask focused clarifying questions.",
    patterns: [/\bbusiness\b|\bchallenge\b|\bproblem\b|\bgoal\b|\bimprov|\bbenefit\b|\breturn on investment\b|\broi\b|\bstrategy\b/i],
    execution: "model",
  },
  {
    id: "ai-solutions-architect",
    name: "AI Solutions Architect Agent",
    purpose: "Prepare preliminary, constraint-aware AI solution outlines.",
    input: "Validated solution or architecture request and approved capabilities.",
    output: "Structured preliminary brief with assumptions, dependencies and risks.",
    tools: [...readOnlyTools],
    access: "Published service descriptions and approved public knowledge only; no infrastructure access.",
    instructions: "AI Solutions Architect Agent: propose a preliminary design, not a commitment. State unknowns, data boundaries, evaluation needs, security considerations and human review.",
    patterns: [/\barchitect(?:ure)?\b|\bsolution\b|\bdesign\b|\brequirements\b|\btechnical plan\b|\btechnical design\b|\bblueprint\b/i],
    execution: "model",
  },
  {
    id: "automation",
    name: "Automation Agent",
    purpose: "Identify bounded workflow automation opportunities and human approval points.",
    input: "Workflow description and approved automation capabilities.",
    output: "Illustrative workflow steps, exception paths, control points and next questions.",
    tools: [...readOnlyTools],
    access: "Read-only public knowledge; cannot execute workflows, access accounts or change records.",
    instructions: "Automation Agent: suggest bounded workflow assistance only. Identify triggers, inputs, exceptions, approval points and rollback needs; never claim to have run an automation.",
    patterns: [/\bautomati|\bworkflow\b|\bagent\b|\bagentic\b|\bprocess\b|\btask routing\b/i],
    execution: "model",
  },
  {
    id: "cloud-devops",
    name: "Cloud and DevOps Agent",
    purpose: "Discuss cloud foundations, software delivery, reliability and operational constraints.",
    input: "Validated cloud, infrastructure or delivery question.",
    output: "Read-only guidance, prerequisites, risks and human-reviewed options.",
    tools: ["approved_knowledge.search", "published_services.read"],
    access: "Public approved descriptions only; no cloud credentials, shell or production access.",
    instructions: "Cloud and DevOps Agent: provide planning guidance only; do not change infrastructure, run deployments or assert a provider feature or price absent approved sources.",
    patterns: [/\bcloud\b|\bdevops\b|\bdeploy|\bkubernetes\b|\binfrastructure\b|\bhosting\b|\bci\/cd\b|\bproduction\b|\bserver\b/i],
    execution: "model",
  },
  {
    id: "knowledge",
    name: "Knowledge Agent",
    purpose: "Retrieve approved, active company knowledge and expose only grounded source metadata.",
    input: "Validated user question and D1 knowledge records.",
    output: "Relevant source snippets and stable knowledge slugs.",
    tools: ["approved_knowledge.search"],
    access: "SQL retrieval enforces approved=1 and active=1; no drafts, prompts or admin data.",
    instructions: "Knowledge Agent: execute deterministic local read-only retrieval. It does not make external calls or have model permissions.",
    patterns: [],
    execution: "local",
  },
  {
    id: "sales-assistant",
    name: "Sales Assistant Agent",
    purpose: "Help a visitor prepare for a human-led enquiry without making commercial commitments.",
    input: "Validated prospect question and public service knowledge.",
    output: "Needs-discovery questions and a suggested consultation action.",
    tools: [...readOnlyTools],
    access: "Public approved content only; no CRM, outbound messaging, pricing, contract or booking access.",
    instructions: "Sales Assistant Agent: do not invent prices, discounts, contract terms, delivery dates or customer references. Do not claim to send messages or book a meeting.",
    patterns: [/\bprice\b|\bpricing\b|\bquote\b|\bsales\b|\bproposal\b|\bcontract\b|\bconsultation\b|\bbuy\b|\bpurchase\b|\bbook\b/i],
    execution: "model",
  },
  {
    id: "analytics",
    name: "Analytics Agent",
    purpose: "Help frame data questions, analytics opportunities and measurement plans.",
    input: "Validated analytics or data question and approved company capabilities.",
    output: "Potential measures, data prerequisites, caveats and human review needs.",
    tools: [...readOnlyTools],
    access: "No analytics database or visitor telemetry; approved public knowledge and conversation only.",
    instructions: "Analytics Agent: do not imply access to the visitor's data or fabricate results, metrics, benchmarks or forecasts. Recommend how a human could validate measures.",
    patterns: [/\banalytic|\bdata\b|\bdashboard\b|\bmetric|\breporting\b|\bforecast|\binsight\b/i],
    execution: "model",
  },
  {
    id: "customer-support",
    name: "Customer Support Agent",
    purpose: "Answer general capability questions, clarify limitations and guide users to human support.",
    input: "Validated support question and approved public knowledge.",
    output: "Grounded assistance, a limitation or escalation where appropriate.",
    tools: ["approved_knowledge.search", "published_services.read"],
    access: "Public approved information only; no accounts, tickets, customer history or service controls.",
    instructions: "Customer Support Agent: do not claim to inspect accounts, open a ticket, contact staff or resolve a production incident. Route account-specific and urgent issues to a person.",
    patterns: [/\bsupport\b|\bhelp me\b|\bissue\b|\bproblem with\b|\bcomplaint\b|\bservice request\b|\bfailure\b/i],
    execution: "model",
  },
  {
    id: "responsible-ai-guardrail",
    name: "Responsible AI Guardrail Agent",
    purpose: "Apply deterministic input/output policy checks and flag human-approval requirements.",
    input: "Validated request, route and specialist result.",
    output: "Policy decision and approval flags; no generative output.",
    tools: [],
    access: "Only request text and validated structured outputs; no databases, model provider or external actions.",
    instructions: "Deterministic server-side checks only; never represents a separate model invocation.",
    patterns: [],
    execution: "local",
  },
];

export interface AgentPlan {
  knowledgeAgent: AgentDefinition;
  specialists: AgentDefinition[];
  guardrailAgent: AgentDefinition;
  workflowAgent: AgentDefinition;
}

export function selectAgentPlan(query: string, enabledAgentIds?: ReadonlySet<string>): AgentPlan {
  const candidates = agentDefinitions
    .filter((agent) => agent.execution === "model" && (!enabledAgentIds || enabledAgentIds.has(agent.id)))
    .map((agent) => ({
      agent,
      score: agent.patterns.reduce((score, pattern) => score + Number(pattern.test(query)), 0),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.agent.id.localeCompare(right.agent.id));
  const fallback = agentDefinitions.find((agent) =>
    agent.id === "business-consultant" && (!enabledAgentIds || enabledAgentIds.has(agent.id)));
  const specialists = (candidates.length ? candidates.slice(0, 2) : fallback ? [{ agent: fallback, score: 1 }] : [])
    .map(({ agent }) => agent);
  return {
    workflowAgent: {
      id: "orchestrator",
      name: "HE Intelligence Orchestrator",
      purpose: "Select a bounded, read-only workflow and combine validated specialist results.",
      input: "Validated request and conversation.",
      output: "Ordered agent plan and consolidated structured answer.",
      tools: [],
      access: "No direct external tools or privileged data access.",
      instructions: "Deterministic local routing; no separate model invocation.",
      patterns: [],
      execution: "local",
    },
    knowledgeAgent: agentDefinitions.find((agent) => agent.id === "knowledge")!,
    specialists,
    guardrailAgent: agentDefinitions.find((agent) => agent.id === "responsible-ai-guardrail")!,
  };
}

const humanApprovalPatterns = [
  /\b(send|write|draft|email|message|contact|publish|post)\b.{0,60}\b(client|customer|external|supplier|vendor|prospect)\b/i,
  /\b(price|pricing|quote|contract|agreement|discount|purchases?|buy|order)\b/i,
  /\b(production|live environment|infrastructure|server|deployment|deploy|cloud account)\b.{0,60}\b(change|update|delete|remove|restart|scale|purchase|modify|alter|provision)\b/i,
  /\b(change|update|delete|remove|restart|scale|purchase|modify|alter|provision|deploy)\b.{0,60}\b(production|live environment|infrastructure|server|cloud account)\b/i,
  /\b(delete|remove|wipe|purge|destroy)\b.{0,60}\b(data|database|record|account|production|customer)\b/i,
];

export function needsHumanApproval(query: string): boolean {
  return humanApprovalPatterns.some((pattern) => pattern.test(query));
}

export function parseAgentOutput(value: unknown): AgentOutput {
  return agentOutputSchema.parse(value);
}

export function getAgentDefinition(id: string): AgentDefinition | undefined {
  return id === "orchestrator"
    ? selectAgentPlan("").workflowAgent
    : agentDefinitions.find((agent) => agent.id === id);
}

export interface Service {
  slug: string;
  title: string;
  shortTitle: string;
  icon: string;
  summary: string;
  introduction: string;
  outcomes: string[];
  capabilities: string[];
  approach: { title: string; description: string }[];
  example: string;
  featured: boolean;
}

export const services: Service[] = [
  {
    slug: "ai-solutions",
    title: "AI Solutions",
    shortTitle: "AI solutions",
    icon: "brain",
    summary: "Put practical artificial intelligence to work on real business needs, with people and purpose at the centre.",
    introduction: "Artificial intelligence is most useful when it supports a clear task, fits into how people actually work, and has an appropriate level of oversight. We help explore those conditions before settling on a solution.",
    outcomes: ["Identify a well-defined problem worth exploring.", "Choose an approach that suits the available data and risk.", "Plan human review, evaluation and ongoing ownership."],
    capabilities: ["AI opportunity discovery", "Generative AI use-case design", "Workflow and system integration planning", "Evaluation and human-review design"],
    approach: [
      { title: "Understand the work", description: "Map the task, people involved, existing systems and constraints before recommending a tool." },
      { title: "Shape a proportionate solution", description: "Compare rule-based automation, AI assistance and other options against the intended outcome." },
      { title: "Evaluate before expanding", description: "Define measures, review points and operating responsibilities that make sense for the use case." },
    ],
    example: "An illustrative example: a team could trial AI-assisted classification of incoming requests, with a staff member checking each suggested category before it affects a workflow. This describes a possible use case, not a delivered client project.",
    featured: true,
  },
  {
    slug: "ai-agents",
    title: "AI Agents & Agentic Automation",
    shortTitle: "AI agents & automation",
    icon: "network",
    summary: "Explore bounded AI-assisted workflows with explicit permissions, review points and clear ways to stop or recover.",
    introduction: "Agentic systems can coordinate steps across a workflow, but autonomy should never be assumed. Start with narrow tasks, approved tools and a person responsible for consequential decisions.",
    outcomes: ["Select tasks suitable for bounded assistance.", "Set tool permissions and human approval gates.", "Make actions, errors and hand-offs understandable."],
    capabilities: ["Workflow mapping", "Agent and tool-boundary design", "Human approval patterns", "Testing and exception planning"],
    approach: [
      { title: "Set the boundary", description: "Define exactly what an assistant may read, suggest or do—and what remains off limits." },
      { title: "Keep a person in the loop", description: "Design a review or confirmation step wherever an action has material consequences." },
      { title: "Test the difficult cases", description: "Exercise ambiguity, unavailable tools, incorrect suggestions and interruption before considering wider use." },
    ],
    example: "An illustrative example: a research assistant might collect information from an approved internal knowledge set and prepare a draft summary for employee review. It would not send the summary or make commitments by itself.",
    featured: true,
  },
  {
    slug: "generative-ai",
    title: "Generative AI & Enterprise Knowledge Assistants",
    shortTitle: "Generative AI & knowledge",
    icon: "message",
    summary: "Design grounded conversational experiences that help people find, understand and work with approved information.",
    introduction: "A useful enterprise knowledge assistant needs more than a language model. Content access, source quality, permission handling, answer evaluation and a clear path when it cannot help are all part of the design.",
    outcomes: ["Assess the readiness and ownership of source material.", "Plan permission-aware retrieval and source attribution.", "Evaluate answer quality, uncertainty and escalation."],
    capabilities: ["Knowledge discovery and content assessment", "Conversational experience design", "Retrieval and access-control planning", "Evaluation and safe-fallback design"],
    approach: [
      { title: "Start with trusted knowledge", description: "Identify approved sources, owners, access rules, update cadence and content gaps." },
      { title: "Ground and explain answers", description: "Plan how responses connect to authorized source material and communicate uncertainty." },
      { title: "Measure usefulness and risk", description: "Test representative questions, missing answers, access boundaries and misleading content." },
    ],
    example: "An illustrative example: an internal assistant could help employees locate relevant sections in an approved policy library and link to those sections. It should say when its sources do not provide a reliable answer.",
    featured: true,
  },
  {
    slug: "ai-readiness",
    title: "AI Readiness & AGI-Inspired Innovation",
    shortTitle: "AI readiness",
    icon: "spark",
    summary: "Build the foundations for useful AI today while thoughtfully preparing for more capable future systems.",
    introduction: "Readiness is practical work: governance, skills, data stewardship, security and the ability to evaluate new capabilities. Interest in artificial general intelligence (AGI) is not a claim that AGI exists here or has been achieved by HighEnd IT.",
    outcomes: ["Understand organizational strengths and readiness gaps.", "Prioritize responsible, near-term AI opportunities.", "Create a reviewable roadmap for changing capabilities."],
    capabilities: ["Readiness and capability review", "AI governance and responsibility planning", "Skills and operating-model considerations", "Horizon scanning and scenario planning"],
    approach: [
      { title: "Review the foundations", description: "Consider data, ownership, security, skills, governance and the work people need done." },
      { title: "Prioritize what is useful now", description: "Select proportionate opportunities that can be evaluated with existing capabilities." },
      { title: "Prepare to reassess", description: "Create a measured process for reviewing new systems, risks and possible future capabilities." },
    ],
    example: "An illustrative example: an organization could establish a recurring review to compare AI use cases, new capabilities, data controls and staff training needs. This is a planning scenario, not a claim of AGI development or achievement.",
    featured: true,
  },
  {
    slug: "cloud-devops",
    title: "Cloud & DevOps",
    shortTitle: "Cloud & DevOps",
    icon: "cloud",
    summary: "Plan cloud environments and delivery practices around resilience, security, operational fit and cost awareness.",
    introduction: "Cloud and DevOps decisions affect how software is delivered, operated and maintained. The right approach depends on existing systems, team capabilities, resilience needs and the organization’s own provider choices.",
    outcomes: ["Clarify hosting and operating requirements.", "Improve repeatability across delivery and infrastructure.", "Plan visibility, recovery and responsible access."],
    capabilities: ["Cloud architecture and migration planning", "Infrastructure automation", "CI/CD and release workflow design", "Observability and reliability planning"],
    approach: [
      { title: "Understand the environment", description: "Review workloads, dependencies, operating responsibilities and constraints." },
      { title: "Design for dependable delivery", description: "Choose deployment and infrastructure patterns that teams can maintain." },
      { title: "Plan the operational lifecycle", description: "Include monitoring, recovery, access, updates and cost visibility in the design." },
    ],
    example: "An illustrative example: a team might introduce automated checks and a repeatable deployment path for a low-risk application before extending the same approach elsewhere.",
    featured: true,
  },
  {
    slug: "software-development",
    title: "Software & Application Development",
    shortTitle: "Software development",
    icon: "code",
    summary: "Shape web, mobile and business applications around user needs, clear requirements and maintainable delivery.",
    introduction: "Good software begins with understanding its users and constraints. Scope, accessibility, integration, ownership and future maintenance should be considered alongside the interface and features.",
    outcomes: ["Translate needs into a coherent product scope.", "Create accessible, responsive application experiences.", "Plan integrations, testing and ongoing maintenance."],
    capabilities: ["Product and requirements discovery", "Web and application design", "API and systems integration planning", "Quality, accessibility and delivery practices"],
    approach: [
      { title: "Discover the need", description: "Clarify users, tasks, existing processes, technical constraints and success measures." },
      { title: "Design and build deliberately", description: "Prioritize core journeys and use maintainable patterns suited to the project." },
      { title: "Verify and support", description: "Test expected and difficult paths, document ownership and plan ongoing improvement." },
    ],
    example: "An illustrative example: a business could prototype an internal request portal to replace a fragmented intake process, then validate the flow with the people who use it.",
    featured: true,
  },
  {
    slug: "data-analytics",
    title: "Data & Analytics",
    shortTitle: "Data & analytics",
    icon: "layers",
    summary: "Improve how information is organized and used, with attention to data quality, meaning, access and decision context.",
    introduction: "Analytics are only as useful as the definitions, quality and context behind them. We help teams think through data sources and the decisions they are meant to support before choosing a reporting or analytics approach.",
    outcomes: ["Clarify key measures and their definitions.", "Identify data quality and access considerations.", "Design reporting around real decisions and audiences."],
    capabilities: ["Data landscape and needs discovery", "Reporting and dashboard requirements", "Integration and data-flow planning", "Governance and quality considerations"],
    approach: [
      { title: "Start with the decision", description: "Identify who needs to decide what, how often and with what level of confidence." },
      { title: "Trace the information", description: "Understand sources, ownership, quality, definitions and permission constraints." },
      { title: "Make insight usable", description: "Plan reporting that communicates context and limitations instead of just displaying numbers." },
    ],
    example: "An illustrative example: operations teams might bring a small set of clearly defined service measures into one view to support regular review.",
    featured: false,
  },
  {
    slug: "cybersecurity",
    title: "Cybersecurity",
    shortTitle: "Cybersecurity",
    icon: "shield",
    summary: "Consider security as a continuing practice across systems, people, access, data and technology decisions.",
    introduction: "Security needs depend on the environment and risk profile. We can help frame security-conscious technology choices and improvement priorities, but do not imply a certification, audit result or guarantee of protection.",
    outcomes: ["Identify security questions to resolve before implementation.", "Consider access, data handling and operational controls.", "Prioritize improvement areas for qualified review."],
    capabilities: ["Security-conscious architecture advice", "Identity and access considerations", "Data protection and resilience planning", "Security improvement roadmaps"],
    approach: [
      { title: "Understand scope and responsibility", description: "Clarify systems, stakeholders, constraints and where specialist assessment is required." },
      { title: "Consider the controls", description: "Review design questions around identity, least privilege, updates, data and recovery." },
      { title: "Prioritize improvements", description: "Document practical next steps and escalation needs without overstating assurance." },
    ],
    example: "An illustrative example: before connecting a new business application, a team could review who can access it, what information it handles and how access is removed.",
    featured: false,
  },
  {
    slug: "it-consulting",
    title: "IT Consulting & Managed Services",
    shortTitle: "IT consulting",
    icon: "spark",
    summary: "Get practical technology guidance and discuss ongoing support shaped around your organization’s needs.",
    introduction: "Technology priorities can be hard to sequence across systems, teams and suppliers. Consulting starts by understanding your situation; any operational support scope, service levels or responsibilities must be agreed explicitly.",
    outcomes: ["Clarify priorities and technology dependencies.", "Compare options against practical constraints.", "Define a support scope before any ongoing service begins."],
    capabilities: ["Technology and requirements discovery", "Solution option assessment", "Roadmap and implementation planning", "Managed-support scope discussions"],
    approach: [
      { title: "Listen and clarify", description: "Understand current conditions, business priorities, stakeholders and open questions." },
      { title: "Present considered options", description: "Explain trade-offs, dependencies and what needs further verification." },
      { title: "Agree the next step", description: "Document the scope, ownership and expectations before implementation or ongoing support." },
    ],
    example: "An illustrative example: an organization could request an independent review of an upcoming technology change to surface dependencies and decision points.",
    featured: false,
  },
  {
    slug: "technology-products",
    title: "IT Products & Technology Reselling",
    shortTitle: "IT products",
    icon: "layers",
    summary: "Discuss hardware, software and technology products selected to fit a defined need and environment.",
    introduction: "A product recommendation should be based on requirements, compatibility, availability and supplier terms. Product catalogues, inventory, reseller authorizations and pricing are not represented on this site.",
    outcomes: ["Clarify product and compatibility requirements.", "Consider integration and lifecycle fit.", "Request current availability and supplier terms."],
    capabilities: ["Technology product discovery", "Hardware and software requirements", "Compatibility and deployment considerations", "Supplier and procurement discussions"],
    approach: [
      { title: "Define the requirement", description: "Record intended use, environment, quantities and compatibility constraints." },
      { title: "Review suitable options", description: "Discuss candidates and dependencies without assuming stock or authorization." },
      { title: "Confirm current terms", description: "Verify availability, support, delivery and commercial terms before any purchase." },
    ],
    example: "An illustrative example: a team could compare endpoint devices against software requirements, support expectations and its established procurement process.",
    featured: false,
  },
];

export const featuredServices = services.filter((service) => service.featured);

export function getServicePath(slug: string): string {
  return `/services/${slug}/`;
}

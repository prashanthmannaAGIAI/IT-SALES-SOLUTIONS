export interface InsightSection {
  heading: string;
  paragraphs: string[];
}

export interface Insight {
  slug: string;
  category: string;
  title: string;
  summary: string;
  readTime: string;
  sections: InsightSection[];
}

export const insights: Insight[] = [
  {
    slug: "start-with-the-work-not-the-model",
    category: "Applied AI",
    title: "Start with the work, not the model",
    summary: "A practical way to decide whether a business task needs AI at all—and what to clarify before choosing a tool.",
    readTime: "4 minute read",
    sections: [
      {
        heading: "Describe the job to be done",
        paragraphs: [
          "Begin with a task people recognize: what arrives, what needs to happen, where the work slows down, and what a good result looks like. Avoid starting with a model name or a promise of automation.",
          "A clear description makes it easier to compare options. A consistent checklist, a process change or a better search experience may be more appropriate than a generative system.",
        ],
      },
      {
        heading: "Understand information and consequences",
        paragraphs: [
          "Ask what information the task uses, who is allowed to see it, how often it changes and what happens if an answer is wrong. The level of review should reflect the possible impact, not the novelty of the technology.",
          "If a task depends on inaccessible, incomplete or disputed information, introducing AI will not remove that underlying problem.",
        ],
      },
      {
        heading: "Test a small, reviewable step",
        paragraphs: [
          "Choose a limited trial with a person checking suggestions and a simple way to record when the result helps or fails. Decide in advance who owns the trial and how it will stop.",
          "The useful outcome is not an AI demonstration. It is evidence about whether a defined task can be improved responsibly.",
        ],
      },
    ],
  },
  {
    slug: "what-makes-a-knowledge-assistant-trustworthy",
    category: "Enterprise knowledge",
    title: "What makes a knowledge assistant trustworthy?",
    summary: "Grounded answers depend on source quality, permission boundaries and the ability to say when the system does not know.",
    readTime: "5 minute read",
    sections: [
      {
        heading: "Know which sources are approved",
        paragraphs: [
          "An assistant can only be as dependable as the information it is allowed to use. Identify content owners, the authoritative version, update expectations and materials that must be excluded.",
          "A large collection of conflicting documents is not automatically a useful knowledge base. Ownership and currency are design questions.",
        ],
      },
      {
        heading: "Respect who may see what",
        paragraphs: [
          "Search and retrieval should not make restricted information visible to someone who could not access it directly. Permission rules need to be part of the architecture and part of the tests.",
          "Source references help a reader verify an answer, but a citation alone is not proof that a conclusion is correct.",
        ],
      },
      {
        heading: "Make uncertainty usable",
        paragraphs: [
          "Test missing answers, ambiguous questions and outdated material. The assistant should be able to explain its limits and route a person to an appropriate next step.",
          "Measure whether people can complete the task safely, not just whether a response sounds fluent.",
        ],
      },
    ],
  },
  {
    slug: "ai-readiness-is-organizational-readiness",
    category: "Responsible innovation",
    title: "AI readiness is organizational readiness",
    summary: "Preparing for more capable AI involves people, governance and dependable foundations—not just access to new tools.",
    readTime: "4 minute read",
    sections: [
      {
        heading: "Build foundations that matter now",
        paragraphs: [
          "Clear data ownership, useful documentation, access controls and accountable decision-making support many kinds of technology. These capabilities are valuable even when a particular AI idea does not proceed.",
          "Readiness should be evaluated in the context of the organization’s work and obligations, not treated as a generic maturity badge.",
        ],
      },
      {
        heading: "Prepare people and decision-makers",
        paragraphs: [
          "Teams need room to learn, raise concerns and understand where AI suggestions can and cannot be relied on. Someone also needs to own evaluation, changes and escalation.",
          "Training and operating policies should match the actual system and task rather than rely on broad claims about what a tool can do.",
        ],
      },
      {
        heading: "Explore the horizon with care",
        paragraphs: [
          "More capable future systems—including discussions about artificial general intelligence—raise questions worth monitoring. Discussion and preparation are not evidence that AGI has been achieved or is currently available as a business capability.",
          "A grounded approach is to revisit assumptions as technology changes, evaluate claims critically and keep today’s decisions proportionate to demonstrated capability.",
        ],
      },
    ],
  },
];

export function getInsightPath(slug: string): string {
  return `/insights/${slug}/`;
}

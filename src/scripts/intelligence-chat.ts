interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

interface SolutionBrief {
  objective: string;
  approach: string;
  requirements: string[];
  risks: string[];
  humanReview: string;
}

interface AssistantResponse {
  answer: string;
  clarifyingQuestions: string[];
  recommendedServices: Array<{ slug: string; title: string; summary: string }>;
  recommendedServiceSlugs: string[];
  solutionBrief: SolutionBrief | null;
  nextSteps: string[];
  knowledgeSources: Array<{ slug: string; category: string; title: string }>;
  consultationUrl: string;
  workflow: Array<{
    id: string;
    name: string;
    status: "completed" | "failed";
    durationMs: number;
    summary: string;
  }>;
  agentInsights: Array<{ agentId: string; name: string; summary: string }>;
  humanApprovalRequired: boolean;
  humanApprovalReason: string | null;
  costs: { provider: string; apiCurrencyCharge: number; reportedCosts: string };
}

interface ApiResult<T> {
  data?: T;
  error?: { message?: string };
}

const greeting = "Hello. I can answer questions about our published services and industry capabilities. What are you looking to improve?";
const unavailableMessage = "HE Intelligence is unavailable right now. No request was sent successfully. Please try again later or use the consultation form.";

export function attachIntelligenceChat(): void {
  const form = document.querySelector<HTMLFormElement>("#chat-form");
  const input = document.querySelector<HTMLInputElement>("#chat-input");
  const messagesElement = document.querySelector<HTMLElement>("#chat-messages");
  const status = document.querySelector<HTMLElement>("[data-assistant-status]");
  const reset = document.querySelector<HTMLButtonElement>(".chat-reset");
  if (!form || !input || !messagesElement || !status) return;

  let history: AssistantMessage[] = [];
  let ready = false;
  let busy = false;

  const setEnabled = (enabled: boolean): void => {
    ready = enabled;
    input.disabled = !enabled || busy;
    form.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled = !enabled || busy;
    document.querySelectorAll<HTMLButtonElement>(".suggestion-chip").forEach((button) => {
      button.disabled = !enabled || busy;
    });
    if (reset) reset.disabled = !enabled || busy;
    status.textContent = enabled
      ? "Self-hosted assistant configured · availability checked when you send"
      : "Assistant unavailable · use the consultation form";
  };

  const addMessage = (sender: "user" | "assistant", content?: string): HTMLElement => {
    const message = document.createElement("div");
    message.className = `chat-message chat-message--${sender}`;
    const label = document.createElement("span");
    label.className = "chat-message-label";
    label.textContent = sender === "user" ? "YOU" : "HIGHEND INTELLIGENCE";
    message.append(label);
    if (content) {
      const paragraph = document.createElement("p");
      paragraph.textContent = content;
      message.append(paragraph);
    }
    messagesElement.append(message);
    messagesElement.scrollTop = messagesElement.scrollHeight;
    return message;
  };

  const appendList = (container: HTMLElement, heading: string, values: string[]): void => {
    if (!values.length) return;
    const section = document.createElement("section");
    section.className = "chat-response-section";
    const title = document.createElement("strong");
    title.textContent = heading;
    const list = document.createElement("ul");
    for (const value of values) {
      const item = document.createElement("li");
      item.textContent = value;
      list.append(item);
    }
    section.append(title, list);
    container.append(section);
  };

  const renderResponse = (response: AssistantResponse): void => {
    const message = addMessage("assistant");
    const answer = document.createElement("p");
    answer.textContent = response.answer;
    message.append(answer);

    appendList(message, "A few questions to narrow this down", response.clarifyingQuestions);
    if (response.recommendedServices.length) {
      const section = document.createElement("section");
      section.className = "chat-response-section";
      const title = document.createElement("strong");
      title.textContent = "Relevant services";
      const list = document.createElement("ul");
      for (const service of response.recommendedServices) {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = `/services/${encodeURIComponent(service.slug)}/`;
        link.textContent = service.title;
        const summary = document.createElement("span");
        summary.textContent = ` — ${service.summary}`;
        item.append(link, summary);
        list.append(item);
      }
      section.append(title, list);
      message.append(section);
    }

    if (response.solutionBrief) {
      const brief = document.createElement("section");
      brief.className = "chat-response-section chat-solution-brief";
      const title = document.createElement("strong");
      title.textContent = "Preliminary solution brief";
      const objective = document.createElement("p");
      objective.textContent = `Objective: ${response.solutionBrief.objective}`;
      const approach = document.createElement("p");
      approach.textContent = `Approach: ${response.solutionBrief.approach}`;
      brief.append(title, objective, approach);
      appendList(brief, "Requirements to confirm", response.solutionBrief.requirements);
      appendList(brief, "Risks to assess", response.solutionBrief.risks);
      const review = document.createElement("p");
      review.textContent = `Human review: ${response.solutionBrief.humanReview}`;
      brief.append(review);
      message.append(brief);
    }

    appendList(message, "Suggested next steps", response.nextSteps);
    if (response.workflow.length) {
      const workflow = document.createElement("section");
      workflow.className = "chat-response-section agent-workflow";
      workflow.setAttribute("aria-label", "Agent workflow run record");
      const title = document.createElement("strong");
      title.textContent = "Agent workflow · run record";
      const note = document.createElement("p");
      note.textContent = "Shows only routing, retrieval and specialists that actually ran for this response.";
      const list = document.createElement("ol");
      for (const run of response.workflow) {
        const item = document.createElement("li");
        item.dataset.status = run.status;
        const heading = document.createElement("span");
        heading.className = "agent-run-heading";
        heading.textContent = `${run.name} · ${run.status === "completed" ? "completed" : "failed"} · ${run.durationMs} ms`;
        const summary = document.createElement("span");
        summary.textContent = run.summary;
        item.append(heading, summary);
        list.append(item);
      }
      workflow.append(title, note, list);
      message.append(workflow);
    }
    if (response.humanApprovalRequired && response.humanApprovalReason) {
      const approval = document.createElement("p");
      approval.className = "agent-approval-notice";
      approval.textContent = `Human approval required: ${response.humanApprovalReason}`;
      message.append(approval);
    }
    if (response.knowledgeSources.length) {
      const sources = document.createElement("p");
      sources.className = "chat-sources";
      sources.textContent = `Based on approved company information: ${response.knowledgeSources.map((source) => source.title).join("; ")}.`;
      message.append(sources);
    }
    const cost = document.createElement("p");
    cost.className = "chat-sources";
    cost.textContent = `Model: ${response.costs.provider}. AI API charge: ${response.costs.apiCurrencyCharge}. Hosting and hardware costs are not measured.`;
    message.append(cost);

    const consultation = document.createElement("a");
    consultation.className = "chat-consultation-link";
    consultation.href = response.consultationUrl === "/consultation/" ? response.consultationUrl : "/consultation/";
    consultation.textContent = "Prepare a consultation request";
    message.append(consultation);
    messagesElement.scrollTop = messagesElement.scrollHeight;
  };

  const checkConfiguration = async (): Promise<void> => {
    try {
      const response = await fetch("/api/assistant", { headers: { Accept: "application/json" } });
      const result = await response.json() as { configured?: boolean };
      setEnabled(response.ok && result.configured === true);
    } catch {
      setEnabled(false);
    }
  };

  const submitPrompt = async (prompt: string): Promise<void> => {
    const text = prompt.trim();
    if (!ready || busy || !text || text.length > 1200) return;
    busy = true;
    addMessage("user", text);
    input.value = "";
    input.disabled = true;
    form.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled = true;
    document.querySelectorAll<HTMLButtonElement>(".suggestion-chip").forEach((button) => {
      button.disabled = true;
    });
    messagesElement.setAttribute("aria-busy", "true");
    const pending = addMessage("assistant", "Submitting your request to HE Intelligence…");

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...history.slice(-4), { role: "user", content: text }],
        }),
      });
      const result = await response.json().catch(() => null) as ApiResult<AssistantResponse> | null;
      if (!response.ok || !result?.data) {
        throw new Error(result?.error?.message ?? unavailableMessage);
      }
      pending.remove();
      const assistantContext = [
        result.data.answer,
        ...result.data.clarifyingQuestions.map((question) => `Clarifying question: ${question}`),
        ...(result.data.solutionBrief ? [
          `Brief: ${result.data.solutionBrief.objective}. ${result.data.solutionBrief.approach}`,
        ] : []),
      ].join("\n").slice(0, 700);
      const conversation: AssistantMessage[] = [...history, { role: "user", content: text }, {
        role: "assistant",
        content: assistantContext,
      }];
      history = conversation.slice(-6);
      renderResponse(result.data);
    } catch (error) {
      pending.querySelector("p")!.textContent = error instanceof Error ? error.message : unavailableMessage;
      const fallback = document.createElement("a");
      fallback.className = "chat-consultation-link";
      fallback.href = "/consultation/";
      fallback.textContent = "Open the consultation form";
      pending.append(fallback);
    } finally {
      messagesElement.setAttribute("aria-busy", "false");
      busy = false;
      input.disabled = !ready;
      form.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled = !ready;
      document.querySelectorAll<HTMLButtonElement>(".suggestion-chip").forEach((button) => {
        button.disabled = !ready;
      });
      if (reset) reset.disabled = !ready;
      if (ready) input.focus();
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitPrompt(input.value);
  });
  document.querySelectorAll<HTMLButtonElement>(".suggestion-chip").forEach((button) => {
    button.addEventListener("click", () => void submitPrompt(button.dataset.prompt ?? ""));
  });
  reset?.addEventListener("click", () => {
    history = [];
    messagesElement.replaceChildren();
    addMessage("assistant", greeting);
    input.focus();
  });

  setEnabled(false);
  status.textContent = "Checking assistant configuration…";
  void checkConfiguration();
}

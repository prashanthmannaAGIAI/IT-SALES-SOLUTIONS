interface ApiResponse<T> {
  data?: T;
  role?: "admin" | "editor" | "viewer";
  error?: { message?: string };
}

interface PagedData<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

interface ManagedRecord {
  slug: string;
  title?: string;
  name?: string;
  published: number;
  data_json: string;
}

interface Submission {
  id: string;
  name: string;
  email: string;
  message?: string;
  context?: string;
  topic?: string;
  status: string;
  created_at: string;
}

interface ManagedUser {
  email: string;
  role: string;
  active: number;
  created_at: string;
}

interface KnowledgeRecord {
  slug: string;
  category: string;
  title: string;
  content: string;
  tags_json: string;
  approved: number;
  active: number;
  approved_by: string | null;
  approved_at: string | null;
}

async function api<T>(url: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  const result = await response.json() as ApiResponse<T>;
  if (!response.ok) throw new Error(result.error?.message ?? "The operation could not be completed.");
  return result;
}

function element<T extends Element>(selector: string): T | null {
  return document.querySelector<T>(selector);
}

function setStatus(target: HTMLElement | null, message: string): void {
  if (target) target.textContent = message;
}

export function attachAdminDashboard(): void {
  const collection = element<HTMLSelectElement>("[data-content-collection]");
  const records = element<HTMLSelectElement>("[data-content-record]");
  const editor = element<HTMLTextAreaElement>("[data-content-json]");
  const published = element<HTMLInputElement>("[data-content-published]");
  const contentStatus = element<HTMLElement>("[data-content-status]");
  const submissionStatus = element<HTMLElement>("[data-submission-status]");
  const userStatus = element<HTMLElement>("[data-user-status]");
  const adminStatus = element<HTMLElement>("[data-admin-status]");
  const knowledgeStatus = element<HTMLElement>("[data-knowledge-status]");
  const aiUsageStatus = element<HTMLElement>("[data-ai-usage-status]");
  let currentRole: ApiResponse<ManagedRecord[]>["role"];
  let loadedRecords: ManagedRecord[] = [];
  let loadedKnowledge: KnowledgeRecord[] = [];
  let submissionOffset = 0;
  const pageSize = 25;
  let projectOffset = 0;
  let proposalOffset = 0;
  let approvalOffset = 0;
  let errorOffset = 0;
  let activityOffset = 0;
  let proposalBeingEdited: string | null = null;

  const appendCell = (row: HTMLTableRowElement, value: unknown): HTMLTableCellElement => {
    const cell = document.createElement("td");
    cell.textContent = value == null ? "" : String(value);
    row.append(cell);
    return cell;
  };

  const loadHubSection = async <T>(section: string, options = ""): Promise<T | undefined> => {
    const result = await api<T>(`/api/admin/hub?section=${section}${options}`);
    return result.data;
  };

  const updatePager = (section: string, total: number, offset: number): void => {
    const label = element<HTMLElement>(`[data-${section}-page]`);
    const previous = element<HTMLButtonElement>(`[data-${section}-prev]`);
    const next = element<HTMLButtonElement>(`[data-${section}-next]`);
    if (label) label.textContent = `Showing ${total === 0 ? 0 : offset + 1}–${Math.min(offset + pageSize, total)} of ${total}`;
    if (previous) previous.disabled = offset === 0;
    if (next) next.disabled = offset + pageSize >= total;
  };

  const loadOverview = async (): Promise<void> => {
    const output = element<HTMLElement>("[data-overview-metrics]");
    const status = element<HTMLElement>("[data-overview-status]");
    if (!output) return;
    setStatus(status, "Loading current database values…");
    try {
      const data = await loadHubSection<Record<string, number | null>>("overview");
      const labels: Record<string, string> = {
        publishedServices: "Published services",
        publishedIndustries: "Published industries",
        publishedArticles: "Published articles",
        publishedProducts: "Published products",
        openProjects: "Open projects",
        proposalsAwaitingApproval: "Proposals awaiting approval",
        enquiries: "Enquiries",
        consultations: "Consultations",
        pendingApprovals: "Pending approvals",
        agentInvocations30d: "Agent invocations (30 days)",
        agentFailures30d: "Agent failures (30 days)",
      };
      output.replaceChildren();
      for (const [key, label] of Object.entries(labels)) {
        if (!data || !(key in data)) continue;
        const card = document.createElement("article");
        card.className = "admin-metric-card";
        const value = document.createElement("strong");
        value.textContent = data[key] === null ? "—" : String(data[key]);
        const caption = document.createElement("span");
        caption.textContent = label;
        card.append(value, caption);
        output.append(card);
      }
      setStatus(status, "Metrics loaded from the current database. Zero indicates no recorded rows.");
    } catch (error) {
      setStatus(status, error instanceof Error ? error.message : "Metrics could not be loaded.");
    }
  };

  const loadProjects = async (): Promise<void> => {
    const tbody = element<HTMLTableSectionElement>("[data-project-rows]");
    if (!tbody) return;
    setStatus(element("[data-project-status]"), "Loading projects…");
    const status = element<HTMLSelectElement>("[data-project-filter]")?.value ?? "";
    try {
      const query = new URLSearchParams({ limit: String(pageSize), offset: String(projectOffset) });
      if (status) query.set("status", status);
      const result = await api<PagedData<Record<string, unknown>>>(`/api/admin/hub?section=projects&${query}`);
      const projects = result.data?.data ?? [];
      updatePager("project", result.data?.total ?? 0, projectOffset);
      const projectOptions = element<HTMLSelectElement>("[data-project-options]");
      if (projectOptions) {
        projectOptions.replaceChildren(new Option("No project", ""));
        for (const project of projects) projectOptions.add(new Option(String(project.name), String(project.id)));
      }
      tbody.replaceChildren();
      for (const project of projects) {
        const row = document.createElement("tr");
        appendCell(row, project.name);
        const statusCell = document.createElement("td");
        const statusSelect = document.createElement("select");
        for (const option of ["planning", "active", "on_hold", "completed", "archived"]) {
          statusSelect.add(new Option(option, option));
        }
        statusSelect.value = String(project.status);
        statusCell.append(statusSelect);
        row.append(statusCell);
        appendCell(row, project.owner_email ?? "—");
        appendCell(row, project.summary);
        appendCell(row, new Date(String(project.updated_at)).toLocaleString());
        const action = document.createElement("td");
        const save = document.createElement("button");
        save.type = "button";
        save.className = "button button-secondary";
        save.textContent = "Update";
        save.addEventListener("click", async () => {
          save.disabled = true;
          try {
            await api("/api/admin/hub", {
              method: "PATCH",
              body: JSON.stringify({
                action: "project.update",
                id: project.id,
                name: project.name,
                summary: project.summary,
                ownerEmail: project.owner_email ?? "",
                status: statusSelect.value,
              }),
            });
            setStatus(element("[data-project-status]"), "Project updated.");
            await loadProjects();
          } catch (error) {
            setStatus(element("[data-project-status]"), error instanceof Error ? error.message : "Project could not be updated.");
          } finally {
            save.disabled = false;
          }
        });
        action.append(save);
        row.append(action);
        tbody.append(row);
      }
      if (!projects.length) tbody.innerHTML = '<tr><td colspan="6">No projects have been recorded.</td></tr>';
      setStatus(element("[data-project-status]"), `${result.data?.total ?? 0} projects. Showing ${projects.length}.`);
    } catch (error) {
      tbody.replaceChildren();
      setStatus(element("[data-project-status]"), error instanceof Error ? error.message : "Projects could not be loaded.");
    }
  };

  const loadProposals = async (): Promise<void> => {
    const tbody = element<HTMLTableSectionElement>("[data-proposal-rows]");
    if (!tbody) return;
    setStatus(element("[data-proposal-status]"), "Loading proposal drafts…");
    const status = element<HTMLSelectElement>("[data-proposal-filter]")?.value ?? "";
    try {
      const query = new URLSearchParams({ limit: String(pageSize), offset: String(proposalOffset) });
      if (status) query.set("status", status);
      const result = await api<PagedData<Record<string, unknown>>>(`/api/admin/hub?section=proposals&${query}`);
      const proposals = result.data?.data ?? [];
      updatePager("proposal", result.data?.total ?? 0, proposalOffset);
      tbody.replaceChildren();
      for (const proposal of proposals) {
        const row = document.createElement("tr");
        appendCell(row, proposal.title);
        appendCell(row, proposal.status);
        appendCell(row, proposal.project_name ?? "—");
        appendCell(row, String(proposal.content).slice(0, 220));
        appendCell(row, new Date(String(proposal.updated_at)).toLocaleString());
        const actions = document.createElement("td");
        if (proposal.status === "draft" || proposal.status === "rejected") {
          const edit = document.createElement("button");
          edit.type = "button";
          edit.className = "button button-secondary";
          edit.textContent = "Edit";
          edit.addEventListener("click", () => {
            const form = element<HTMLFormElement>("[data-proposal-form]");
            if (!form) return;
            (form.elements.namedItem("title") as HTMLInputElement).value = String(proposal.title);
            (form.elements.namedItem("content") as HTMLTextAreaElement).value = String(proposal.content);
            const projectSelect = form.elements.namedItem("projectId") as HTMLSelectElement;
            const projectId = String(proposal.project_id ?? "");
            if (projectId && !Array.from(projectSelect.options).some((option) => option.value === projectId)) {
              projectSelect.add(new Option(String(proposal.project_name ?? projectId), projectId));
            }
            projectSelect.value = projectId;
            (form.elements.namedItem("submit") as HTMLInputElement).checked = false;
            proposalBeingEdited = String(proposal.id);
            const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
            if (submit) submit.textContent = "Update proposal draft";
            form.scrollIntoView({ behavior: "smooth", block: "center" });
          });
          actions.append(edit);
          const submit = document.createElement("button");
          submit.type = "button";
          submit.className = "button button-secondary";
          submit.textContent = "Submit for approval";
          submit.addEventListener("click", async () => {
            if (!window.confirm("Submit this internal proposal draft for an administrator's review? It will not be sent externally.")) return;
            try {
              await api("/api/admin/hub", { method: "PATCH", body: JSON.stringify({ action: "proposal.submit", id: proposal.id }) });
              setStatus(element("[data-proposal-status]"), "Submitted to the internal approval queue.");
              await loadProposals();
              await loadApprovals();
            } catch (error) {
              setStatus(element("[data-proposal-status]"), error instanceof Error ? error.message : "The proposal could not be submitted.");
            }
          });
          actions.append(submit);
        }
        row.append(actions);
        tbody.append(row);
      }
      if (!proposals.length) tbody.innerHTML = '<tr><td colspan="6">No proposal drafts match this filter.</td></tr>';
      setStatus(element("[data-proposal-status]"), `${result.data?.total ?? 0} proposal drafts. Showing ${proposals.length}.`);
    } catch (error) {
      tbody.replaceChildren();
      setStatus(element("[data-proposal-status]"), error instanceof Error ? error.message : "Proposal drafts could not be loaded.");
    }
  };

  const loadApprovals = async (): Promise<void> => {
    const tbody = element<HTMLTableSectionElement>("[data-approval-rows]");
    if (!tbody || currentRole !== "admin") return;
    const filter = element<HTMLSelectElement>("[data-approval-filter]")?.value ?? "pending";
    setStatus(element("[data-approval-status]"), "Loading approval queue…");
    try {
      const result = await api<PagedData<Record<string, unknown>>>(`/api/admin/hub?section=approvals&status=${encodeURIComponent(filter)}&limit=${pageSize}&offset=${approvalOffset}`);
      updatePager("approval", result.data?.total ?? 0, approvalOffset);
      tbody.replaceChildren();
      for (const approval of result.data?.data ?? []) {
        const row = document.createElement("tr");
        appendCell(row, new Date(String(approval.created_at)).toLocaleString());
        appendCell(row, approval.resource_type);
        appendCell(row, approval.summary);
        appendCell(row, approval.requested_by);
        appendCell(row, approval.status);
        const actions = document.createElement("td");
        if (typeof approval.proposal_content === "string") {
          const details = document.createElement("details");
          const summary = document.createElement("summary");
          summary.textContent = "Review proposal draft";
          const content = document.createElement("pre");
          content.textContent = approval.proposal_content;
          details.append(summary, content);
          actions.append(details);
        }
        if (approval.status === "pending") {
          for (const decision of ["approved", "rejected"] as const) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "button button-secondary";
            button.textContent = decision === "approved" ? "Approve" : "Reject";
            button.addEventListener("click", async () => {
              if (!window.confirm(`${decision === "approved" ? "Approve" : "Reject"} this item for internal workflow only? No external action will be performed.`)) return;
              const note = window.prompt("Optional review note (leave blank if none):", "") ?? "";
              try {
                await api("/api/admin/hub", {
                  method: "PATCH",
                  body: JSON.stringify({ action: "approval.review", id: approval.id, status: decision, note }),
                });
                setStatus(element("[data-approval-status]"), `Marked ${decision}. No external action was executed.`);
                await loadApprovals();
                await loadProposals();
              } catch (error) {
                setStatus(element("[data-approval-status]"), error instanceof Error ? error.message : "The review decision could not be saved.");
              }
            });
            actions.append(button);
          }
        } else {
          actions.textContent = String(approval.review_note ?? "");
        }
        row.append(actions);
        tbody.append(row);
      }
      if (!tbody.childElementCount) tbody.innerHTML = '<tr><td colspan="6">No approval items match this filter.</td></tr>';
      setStatus(element("[data-approval-status]"), `${result.data?.total ?? 0} approval items. Showing ${result.data?.data.length ?? 0}.`);
    } catch (error) {
      setStatus(element("[data-approval-status]"), error instanceof Error ? error.message : "Approval queue could not be loaded.");
    }
  };

  const loadAgents = async (): Promise<void> => {
    const tbody = element<HTMLTableSectionElement>("[data-agent-rows]");
    if (!tbody || currentRole !== "admin") return;
    try {
      const result = await loadHubSection<Array<{ id: string; name: string; purpose: string; execution: string; enabled: boolean; configurable: boolean }>>("agents");
      tbody.replaceChildren();
      for (const agent of result ?? []) {
        const row = document.createElement("tr");
        appendCell(row, agent.name);
        appendCell(row, agent.purpose);
        appendCell(row, agent.execution);
        appendCell(row, agent.enabled ? "Enabled" : "Disabled");
        const action = document.createElement("td");
        if (agent.configurable) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "button button-secondary";
          button.textContent = agent.enabled ? "Disable" : "Enable";
          button.addEventListener("click", async () => {
            button.disabled = true;
            try {
              await api("/api/admin/hub", {
                method: "PATCH",
                body: JSON.stringify({ action: "agent.update", agentId: agent.id, enabled: !agent.enabled }),
              });
              await loadAgents();
              setStatus(element("[data-agent-status]"), `${agent.name} ${agent.enabled ? "disabled" : "enabled"}.`);
            } catch (error) {
              setStatus(element("[data-agent-status]"), error instanceof Error ? error.message : "Agent configuration could not be updated.");
            } finally {
              button.disabled = false;
            }
          });
          action.append(button);
        } else {
          action.textContent = "Always enabled";
        }
        row.append(action);
        tbody.append(row);
      }
      if (!tbody.childElementCount) tbody.innerHTML = '<tr><td colspan="5">No agents are configured.</td></tr>';
    } catch (error) {
      setStatus(element("[data-agent-status]"), error instanceof Error ? error.message : "Agent configuration could not be loaded.");
    }
  };

  const loadOperations = async (): Promise<void> => {
    const errorRows = element<HTMLTableSectionElement>("[data-error-rows]");
    const activityRows = element<HTMLTableSectionElement>("[data-activity-rows]");
    if (currentRole !== "admin") return;
    try {
      const errors = await loadHubSection<PagedData<Record<string, unknown>>>("errors", `&limit=${pageSize}&offset=${errorOffset}`);
      if (errorRows) {
        errorRows.replaceChildren();
        for (const item of errors?.data ?? []) {
          const row = document.createElement("tr");
          for (const key of ["usage_date", "agent_id", "invocations", "failures", "duration_ms"]) appendCell(row, item[key]);
          errorRows.append(row);
        }
        if (!errors?.data.length) errorRows.innerHTML = '<tr><td colspan="5">No recorded agent failures.</td></tr>';
      }
      updatePager("error", errors?.total ?? 0, errorOffset);
      setStatus(element("[data-error-status]"), `${errors?.total ?? 0} failure aggregate rows.`);
      const activity = await loadHubSection<PagedData<Record<string, unknown>>>("activity", `&limit=${pageSize}&offset=${activityOffset}`);
      if (activityRows) {
        activityRows.replaceChildren();
        for (const item of activity?.data ?? []) {
          const row = document.createElement("tr");
          for (const key of ["created_at", "actor_email", "actor_role", "action", "resource_type", "resource_id"]) appendCell(row, item[key]);
          activityRows.append(row);
        }
        updatePager("activity", activity?.total ?? 0, activityOffset);
        if (!activity?.data.length) activityRows.innerHTML = '<tr><td colspan="6">No audit activity has been recorded.</td></tr>';
      }
      setStatus(element("[data-activity-status]"), `${activity?.total ?? 0} audit events.`);
    } catch (error) {
      setStatus(element("[data-error-status]"), error instanceof Error ? error.message : "Operations data could not be loaded.");
    }
  };

  const loadSettings = async (): Promise<void> => {
    if (currentRole !== "admin") return;
    try {
      const settings = await loadHubSection<Array<{ setting_key: string; setting_value: string }>>("settings");
      const assistant = settings?.find((item) => item.setting_key === "assistant_enabled");
      const select = element<HTMLSelectElement>("[data-assistant-enabled]");
      if (assistant && select) select.value = assistant.setting_value;
    } catch (error) {
      setStatus(element("[data-settings-status]"), error instanceof Error ? error.message : "Workspace settings could not be loaded.");
    }
  };

  const loadKnowledge = async (): Promise<void> => {
    const panel = element<HTMLElement>("[data-knowledge-panel]");
    const selector = element<HTMLSelectElement>("[data-knowledge-record]");
    if (!panel || !selector) return;
    panel.hidden = currentRole !== "editor" && currentRole !== "admin";
    if (panel.hidden) return;
    setStatus(knowledgeStatus, "Loading approved and draft knowledge…");
    try {
      const result = await api<KnowledgeRecord[]>("/api/admin/knowledge");
      loadedKnowledge = result.data ?? [];
      selector.replaceChildren(new Option("Choose an entry", ""));
      for (const record of loadedKnowledge) {
        const state = record.approved && record.active ? "published" : record.approved ? "inactive" : "draft";
        selector.add(new Option(`${record.title} (${state})`, record.slug));
      }
      setStatus(knowledgeStatus, `${loadedKnowledge.length} entries loaded.`);
    } catch (error) {
      setStatus(knowledgeStatus, error instanceof Error ? error.message : "Knowledge entries could not be loaded.");
    }
  };

  const loadAiUsage = async (): Promise<void> => {
    const panel = element<HTMLElement>("[data-ai-usage-panel]");
    const output = element<HTMLElement>("[data-ai-usage-output]");
    if (!panel || !output || currentRole !== "admin") return;
    panel.hidden = false;
    setStatus(aiUsageStatus, "Loading aggregate usage…");
    try {
      const result = await api<Record<string, unknown>>("/api/admin/ai-usage");
      output.textContent = JSON.stringify(result, null, 2);
      setStatus(aiUsageStatus, "Aggregate usage refreshed. These metrics do not include infrastructure costs.");
    } catch (error) {
      setStatus(aiUsageStatus, error instanceof Error ? error.message : "Usage metrics could not be loaded.");
    }
  };

  const loadContent = async (): Promise<void> => {
    if (!collection || !records) return;
    setStatus(adminStatus, "Verifying Cloudflare Access identity and assigned role…");
    setStatus(contentStatus, "Loading records…");
    try {
      const result = await api<ManagedRecord[]>(`/api/admin/${collection.value}`);
      currentRole = result.role;
      loadedRecords = result.data ?? [];
      const canEdit = currentRole === "editor" || currentRole === "admin";
      const saveButton = element<HTMLButtonElement>("[data-content-save]");
      const deleteButton = element<HTMLButtonElement>("[data-content-delete]");
      const newButton = element<HTMLButtonElement>("[data-content-new]");
      if (saveButton) saveButton.hidden = !canEdit;
      if (newButton) newButton.hidden = !canEdit;
      if (deleteButton) deleteButton.hidden = currentRole !== "admin";
      records.replaceChildren(new Option("Choose a record", ""));
      for (const record of loadedRecords) {
        records.add(new Option(`${record.title ?? record.name ?? record.slug}${record.published ? " (published)" : " (draft)"}`, record.slug));
      }
      const adminPanel = element<HTMLElement>("[data-admin-only]");
      const submissionPanel = element<HTMLElement>("[data-submissions-panel]");
      const contentPanel = element<HTMLElement>("[data-content-panel]");
      if (contentPanel) contentPanel.hidden = false;
      if (adminPanel) adminPanel.hidden = currentRole !== "admin";
      if (submissionPanel) submissionPanel.hidden = currentRole !== "admin";
      const usagePanel = element<HTMLElement>("[data-ai-usage-panel]");
      if (usagePanel) usagePanel.hidden = currentRole !== "admin";
      const hubNav = element<HTMLElement>("[data-hub-nav]");
      const overviewPanel = element<HTMLElement>("[data-hub-overview]");
      const projectsPanel = element<HTMLElement>("[data-projects-panel]");
      const approvalsPanel = element<HTMLElement>("[data-approval-panel]");
      const agentsPanel = element<HTMLElement>("[data-agent-config-panel]");
      const operationsPanel = element<HTMLElement>("[data-operations-panel]");
      const settingsPanel = element<HTMLElement>("[data-settings-panel]");
      if (hubNav) hubNav.hidden = false;
      if (overviewPanel) overviewPanel.hidden = false;
      if (projectsPanel) projectsPanel.hidden = currentRole !== "editor" && currentRole !== "admin";
      if (approvalsPanel) approvalsPanel.hidden = currentRole !== "admin";
      if (agentsPanel) agentsPanel.hidden = currentRole !== "admin";
      if (operationsPanel) operationsPanel.hidden = currentRole !== "admin";
      if (settingsPanel) settingsPanel.hidden = currentRole !== "admin";
      for (const link of document.querySelectorAll<HTMLElement>("[data-admin-link]")) link.hidden = currentRole !== "admin";
      const projectLink = element<HTMLElement>("[data-project-link]");
      if (projectLink) projectLink.hidden = currentRole === "viewer";
      setStatus(adminStatus, `Access verified. Signed-in account role: ${currentRole ?? "unknown"}.`);
      setStatus(contentStatus, `${loadedRecords.length} records loaded.`);
      void loadOverview();
      if (currentRole === "editor" || currentRole === "admin") {
        void loadProjects();
        void loadProposals();
      }
      if (currentRole === "admin") {
        void loadUsers();
        void loadSubmissions();
        void loadAiUsage();
        void loadApprovals();
        void loadAgents();
        void loadOperations();
        void loadSettings();
      }
      void loadKnowledge();
    } catch (error) {
      setStatus(adminStatus, error instanceof Error ? error.message : "Your account could not be verified.");
    }
  };

  const loadUsers = async (): Promise<void> => {
    const tbody = element<HTMLTableSectionElement>("[data-user-rows]");
    if (!tbody) return;
    try {
      const result = await api<ManagedUser[]>("/api/admin/users");
      tbody.replaceChildren();
      for (const user of result.data ?? []) {
        const row = document.createElement("tr");
        for (const value of [user.email, user.role, user.active ? "Yes" : "No", new Date(user.created_at).toLocaleString()]) {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.append(cell);
        }
        const actionCell = document.createElement("td");
        if (user.active) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "button button-secondary";
          button.textContent = "Deactivate";
          button.addEventListener("click", async () => {
            if (!window.confirm(`Deactivate access for ${user.email}?`)) return;
            try {
              await api(`/api/admin/users?email=${encodeURIComponent(user.email)}`, { method: "DELETE" });
              setStatus(userStatus, `Access deactivated for ${user.email}.`);
              void loadUsers();
            } catch (error) {
              setStatus(userStatus, error instanceof Error ? error.message : "The account could not be deactivated.");
            }
          });
          actionCell.append(button);
        } else {
          actionCell.textContent = "Inactive";
        }
        row.append(actionCell);
        tbody.append(row);
      }
      if (!tbody.childElementCount) tbody.textContent = "No administrator accounts are assigned.";
    } catch (error) {
      setStatus(userStatus, error instanceof Error ? error.message : "Accounts could not be loaded.");
    }
  };

  const loadSubmissions = async (): Promise<void> => {
    const type = element<HTMLSelectElement>("[data-submission-type]")?.value ?? "enquiry";
    const tbody = element<HTMLTableSectionElement>("[data-submission-rows]");
    if (!tbody) return;
    const statusFilter = element<HTMLSelectElement>("[data-submission-status-filter]");
    if (statusFilter) {
      const options = type === "enquiry"
        ? ["new", "in_review", "completed", "archived"]
        : ["requested", "reviewing", "confirmed", "completed", "cancelled", "archived"];
      const selected = statusFilter.value;
      statusFilter.replaceChildren(new Option("All statuses", ""));
      for (const status of options) statusFilter.add(new Option(status, status));
      if (options.includes(selected)) statusFilter.value = selected;
    }
    const search = element<HTMLInputElement>("[data-submission-search]")?.value.trim() ?? "";
    const statusValue = statusFilter?.value ?? "";
    const params = new URLSearchParams({
      type,
      limit: String(pageSize),
      offset: String(submissionOffset),
    });
    if (statusValue) params.set("status", statusValue);
    if (search) params.set("search", search);
    setStatus(submissionStatus, "Loading requests…");
    try {
      const result = await api<PagedData<Submission>>(`/api/admin/submissions?${params}`);
      tbody.replaceChildren();
      for (const submission of result.data?.data ?? []) {
        const row = document.createElement("tr");
        const requestDetails = submission.message ?? submission.context ?? submission.topic ?? "";
        const values = [new Date(submission.created_at).toLocaleString(), submission.name, submission.email, requestDetails];
        for (const value of values) {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.append(cell);
        }
        const statusCell = document.createElement("td");
        const statusSelect = document.createElement("select");
        const availableStatuses = type === "enquiry"
          ? ["new", "in_review", "completed", "archived"]
          : ["requested", "reviewing", "confirmed", "completed", "cancelled", "archived"];
        for (const status of availableStatuses) statusSelect.add(new Option(status, status));
        statusSelect.value = submission.status;
        statusCell.append(statusSelect);
        const actionCell = document.createElement("td");
        const save = document.createElement("button");
        save.type = "button";
        save.className = "button button-secondary";
        save.textContent = "Update";
        save.addEventListener("click", async () => {
          save.disabled = true;
          try {
            await api(`/api/admin/submissions?type=${type}&id=${encodeURIComponent(submission.id)}`, {
              method: "PATCH",
              body: JSON.stringify({ status: statusSelect.value }),
            });
            setStatus(submissionStatus, "Request status updated.");
            void loadOverview();
          } catch (error) {
            setStatus(submissionStatus, error instanceof Error ? error.message : "The request could not be updated.");
          } finally {
            save.disabled = false;
          }
        });
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "button button-secondary";
        remove.textContent = "Delete";
        remove.addEventListener("click", async () => {
          if (!window.confirm("Permanently delete this request and its personal information?")) return;
          remove.disabled = true;
          try {
            await api(`/api/admin/submissions?type=${type}&id=${encodeURIComponent(submission.id)}`, { method: "DELETE" });
            setStatus(submissionStatus, "Request and its personal information deleted.");
            void loadSubmissions();
            void loadOverview();
          } catch (error) {
            setStatus(submissionStatus, error instanceof Error ? error.message : "The request could not be deleted.");
          } finally {
            remove.disabled = false;
          }
        });
        actionCell.append(save, remove);
        row.append(statusCell, actionCell);
        tbody.append(row);
      }
      if (!tbody.childElementCount) tbody.innerHTML = '<tr><td colspan="6">No requests match this filter.</td></tr>';
      const total = result.data?.total ?? 0;
      const pageLabel = element<HTMLElement>("[data-submission-page]");
      if (pageLabel) pageLabel.textContent = `Showing ${total === 0 ? 0 : submissionOffset + 1}–${Math.min(submissionOffset + pageSize, total)} of ${total}`;
      const previous = element<HTMLButtonElement>("[data-submission-prev]");
      const next = element<HTMLButtonElement>("[data-submission-next]");
      if (previous) previous.disabled = submissionOffset === 0;
      if (next) next.disabled = submissionOffset + pageSize >= total;
      setStatus(submissionStatus, `${result.data?.data.length ?? 0} requests loaded.`);
    } catch (error) {
      setStatus(submissionStatus, error instanceof Error ? error.message : "Requests could not be loaded.");
    }
  };

  element<HTMLFormElement>("[data-project-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    if (!form.reportValidity()) return;
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const values = Object.fromEntries(new FormData(form).entries());
    if (button) button.disabled = true;
    setStatus(element("[data-project-status]"), "Creating project…");
    try {
      await api("/api/admin/hub", {
        method: "POST",
        body: JSON.stringify({ action: "project.create", ...values }),
      });
      form.reset();
      setStatus(element("[data-project-status]"), "Project created.");
      await loadProjects();
      await loadOverview();
    } catch (error) {
      setStatus(element("[data-project-status]"), error instanceof Error ? error.message : "Project could not be created.");
    } finally {
      if (button) button.disabled = false;
    }
  });

  element<HTMLButtonElement>("[data-project-load]")?.addEventListener("click", () => void loadProjects());
  element<HTMLSelectElement>("[data-project-filter]")?.addEventListener("change", () => {
    projectOffset = 0;
    void loadProjects();
  });
  element<HTMLButtonElement>("[data-project-prev]")?.addEventListener("click", () => {
    projectOffset = Math.max(0, projectOffset - pageSize);
    void loadProjects();
  });
  element<HTMLButtonElement>("[data-project-next]")?.addEventListener("click", () => {
    projectOffset += pageSize;
    void loadProjects();
  });
  element<HTMLButtonElement>("[data-proposal-load]")?.addEventListener("click", () => void loadProposals());
  element<HTMLSelectElement>("[data-proposal-filter]")?.addEventListener("change", () => {
    proposalOffset = 0;
    void loadProposals();
  });
  element<HTMLButtonElement>("[data-proposal-prev]")?.addEventListener("click", () => {
    proposalOffset = Math.max(0, proposalOffset - pageSize);
    void loadProposals();
  });
  element<HTMLButtonElement>("[data-proposal-next]")?.addEventListener("click", () => {
    proposalOffset += pageSize;
    void loadProposals();
  });
  element<HTMLButtonElement>("[data-approval-load]")?.addEventListener("click", () => void loadApprovals());
  element<HTMLSelectElement>("[data-approval-filter]")?.addEventListener("change", () => {
    approvalOffset = 0;
    void loadApprovals();
  });
  element<HTMLButtonElement>("[data-approval-prev]")?.addEventListener("click", () => {
    approvalOffset = Math.max(0, approvalOffset - pageSize);
    void loadApprovals();
  });
  element<HTMLButtonElement>("[data-approval-next]")?.addEventListener("click", () => {
    approvalOffset += pageSize;
    void loadApprovals();
  });
  element<HTMLButtonElement>("[data-error-prev]")?.addEventListener("click", () => {
    errorOffset = Math.max(0, errorOffset - pageSize);
    void loadOperations();
  });
  element<HTMLButtonElement>("[data-error-next]")?.addEventListener("click", () => {
    errorOffset += pageSize;
    void loadOperations();
  });
  element<HTMLButtonElement>("[data-activity-prev]")?.addEventListener("click", () => {
    activityOffset = Math.max(0, activityOffset - pageSize);
    void loadOperations();
  });
  element<HTMLButtonElement>("[data-activity-next]")?.addEventListener("click", () => {
    activityOffset += pageSize;
    void loadOperations();
  });

  element<HTMLFormElement>("[data-proposal-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    if (!form.reportValidity()) return;
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const values = Object.fromEntries(new FormData(form).entries());
    if (button) button.disabled = true;
    setStatus(element("[data-proposal-status]"), "Saving proposal draft…");
    try {
      if (proposalBeingEdited) {
        const id = proposalBeingEdited;
        await api("/api/admin/hub", {
          method: "PATCH",
          body: JSON.stringify({
            action: "proposal.update",
            id,
            title: values.title,
            content: values.content,
            projectId: values.projectId,
          }),
        });
        proposalBeingEdited = null;
        if (button) button.textContent = "Save proposal draft";
        if (values.submit === "on") {
          await api("/api/admin/hub", { method: "PATCH", body: JSON.stringify({ action: "proposal.submit", id }) });
        }
      } else {
        await api("/api/admin/hub", {
          method: "POST",
          body: JSON.stringify({
            action: "proposal.create",
            title: values.title,
            content: values.content,
            projectId: values.projectId,
            submit: values.submit === "on",
          }),
        });
      }
      form.reset();
      setStatus(element("[data-proposal-status]"), "Proposal draft saved. It remains internal unless a human separately shares it.");
      await loadProposals();
      await loadApprovals();
      await loadOverview();
    } catch (error) {
      setStatus(element("[data-proposal-status]"), error instanceof Error ? error.message : "Proposal draft could not be saved.");
    } finally {
      if (button) button.disabled = false;
    }
  });

  element<HTMLButtonElement>("[data-ai-proposal-generate]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const requirements = element<HTMLTextAreaElement>("[data-ai-proposal-requirements]")?.value.trim() ?? "";
    if (!requirements) {
      setStatus(element("[data-proposal-status]"), "Enter non-sensitive requirements before generating an outline.");
      return;
    }
    button.disabled = true;
    setStatus(element("[data-proposal-status]"), "Requesting a preliminary outline from HE Intelligence…");
    try {
      const result = await api<{
        answer: string;
        solutionBrief: {
          objective: string;
          approach: string;
          requirements: string[];
          risks: string[];
          humanReview: string;
        } | null;
      }>("/api/assistant", {
        method: "POST",
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Prepare a preliminary solution brief for an internal proposal draft using these requirements. Do not invent prices, clients, outcomes, delivery dates, certifications or guarantees. State assumptions, risks and human review needs. Requirements: ${requirements}`,
          }],
        }),
      });
      const response = result.data;
      if (!response) throw new Error("HE Intelligence did not return a draft.");
      const form = element<HTMLFormElement>("[data-proposal-form]");
      if (!form) return;
      const title = form.elements.namedItem("title") as HTMLInputElement;
      const content = form.elements.namedItem("content") as HTMLTextAreaElement;
      const submitForReview = form.elements.namedItem("submit") as HTMLInputElement;
      if (!title.value.trim()) title.value = "Preliminary solution outline";
      const brief = response.solutionBrief;
      content.value = brief
        ? [
            `Objective: ${brief.objective}`,
            `Approach: ${brief.approach}`,
            `Requirements:\n${brief.requirements.map((item) => `- ${item}`).join("\n") || "- To be confirmed"}`,
            `Risks:\n${brief.risks.map((item) => `- ${item}`).join("\n") || "- To be assessed"}`,
            `Human review: ${brief.humanReview}`,
            `HE Intelligence summary: ${response.answer}`,
          ].join("\n\n")
        : response.answer;
      submitForReview.checked = false;
      proposalBeingEdited = null;
      const saveButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      if (saveButton) saveButton.textContent = "Save proposal draft";
      setStatus(element("[data-proposal-status]"), "Outline generated. Review and edit it before saving; generation did not approve or send it.");
      form.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      setStatus(element("[data-proposal-status]"), error instanceof Error ? error.message : "HE Intelligence could not generate the outline.");
    } finally {
      button.disabled = false;
    }
  });

  element<HTMLFormElement>("[data-assistant-setting-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const enabled = element<HTMLSelectElement>("[data-assistant-enabled]")?.value === "true";
    const status = element<HTMLElement>("[data-settings-status]");
    setStatus(status, "Saving setting…");
    try {
      await api("/api/admin/hub", { method: "PATCH", body: JSON.stringify({ action: "assistant.update", enabled }) });
      setStatus(status, `HE Intelligence ${enabled ? "enabled" : "disabled"} at the server.`);
    } catch (error) {
      setStatus(status, error instanceof Error ? error.message : "The assistant setting could not be saved.");
    }
  });

  element<HTMLButtonElement>("[data-content-load]")?.addEventListener("click", () => void loadContent());
  element<HTMLButtonElement>("[data-ai-usage-load]")?.addEventListener("click", () => void loadAiUsage());
  element<HTMLButtonElement>("[data-submission-load]")?.addEventListener("click", () => void loadSubmissions());
  element<HTMLSelectElement>("[data-submission-type]")?.addEventListener("change", () => {
    submissionOffset = 0;
    void loadSubmissions();
  });
  element<HTMLSelectElement>("[data-submission-status-filter]")?.addEventListener("change", () => {
    submissionOffset = 0;
    void loadSubmissions();
  });
  element<HTMLInputElement>("[data-submission-search]")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submissionOffset = 0;
      void loadSubmissions();
    }
  });
  element<HTMLButtonElement>("[data-submission-prev]")?.addEventListener("click", () => {
    submissionOffset = Math.max(0, submissionOffset - pageSize);
    void loadSubmissions();
  });
  element<HTMLButtonElement>("[data-submission-next]")?.addEventListener("click", () => {
    submissionOffset += pageSize;
    void loadSubmissions();
  });
  collection?.addEventListener("change", () => {
    if (records) records.replaceChildren(new Option("Choose a record", ""));
    if (editor) editor.value = "";
    setStatus(contentStatus, "");
  });
  records?.addEventListener("change", () => {
    const record = loadedRecords.find((item) => item.slug === records.value);
    if (!record || !editor || !published) return;
    try {
      editor.value = JSON.stringify(JSON.parse(record.data_json), null, 2);
      published.checked = Boolean(record.published);
      setStatus(contentStatus, `Loaded ${record.slug}.`);
    } catch {
      setStatus(contentStatus, "This record contains invalid stored JSON and cannot be edited.");
    }
  });
  element<HTMLButtonElement>("[data-content-new]")?.addEventListener("click", () => {
    if (editor) editor.value = "{}";
    if (published) published.checked = false;
    if (records) records.value = "";
    setStatus(contentStatus, "Enter a complete new record in the JSON editor.");
  });
  element<HTMLButtonElement>("[data-content-save]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    if (!collection || !editor || !published) return;
    let content: unknown;
    try {
      content = JSON.parse(editor.value);
    } catch {
      setStatus(contentStatus, "The record must contain valid JSON.");
      return;
    }
    button.disabled = true;
    setStatus(contentStatus, "Saving record…");
    try {
      const result = await api<{ slug: string }>(`/api/admin/${collection.value}`, {
        method: "PUT",
        body: JSON.stringify({ content, published: published.checked }),
      });
      setStatus(contentStatus, `Saved ${result.data?.slug ?? "record"}.`);
      await loadContent();
    } catch (error) {
      setStatus(contentStatus, error instanceof Error ? error.message : "The record could not be saved.");
    } finally {
      button.disabled = false;
    }
  });
  element<HTMLButtonElement>("[data-content-delete]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    if (!collection || !records?.value) {
      setStatus(contentStatus, "Choose a record before deleting.");
      return;
    }
    const slug = records.value;
    if (!window.confirm(`Permanently delete ${slug}? This cannot be undone.`)) return;
    button.disabled = true;
    try {
      await api(`/api/admin/${collection.value}?slug=${encodeURIComponent(slug)}`, { method: "DELETE" });
      if (editor) editor.value = "";
      setStatus(contentStatus, `Deleted ${slug}.`);
      await loadContent();
    } catch (error) {
      setStatus(contentStatus, error instanceof Error ? error.message : "The record could not be deleted.");
    } finally {
      button.disabled = false;
    }
  });
  element<HTMLSelectElement>("[data-knowledge-record]")?.addEventListener("change", (event) => {
    const slug = (event.currentTarget as HTMLSelectElement).value;
    const record = loadedKnowledge.find((item) => item.slug === slug);
    const slugInput = element<HTMLInputElement>("[data-knowledge-slug]");
    const category = element<HTMLInputElement>("[data-knowledge-category]");
    const title = element<HTMLInputElement>("[data-knowledge-title]");
    const tags = element<HTMLTextAreaElement>("[data-knowledge-tags]");
    const content = element<HTMLTextAreaElement>("[data-knowledge-content]");
    const approved = element<HTMLInputElement>("[data-knowledge-approved]");
    const active = element<HTMLInputElement>("[data-knowledge-active]");
    const deleteButton = element<HTMLButtonElement>("[data-knowledge-delete]");
    if (!record || !slugInput || !category || !title || !tags || !content || !approved || !active) return;
    slugInput.value = record.slug;
    category.value = record.category;
    title.value = record.title;
    content.value = record.content;
    try {
      const parsedTags: unknown = JSON.parse(record.tags_json);
      tags.value = Array.isArray(parsedTags)
        ? parsedTags.filter((tag): tag is string => typeof tag === "string").join("\n")
        : "";
    } catch {
      tags.value = "";
      setStatus(knowledgeStatus, "Stored tags are invalid; review them before saving.");
    }
    approved.checked = currentRole === "admin" && Boolean(record.approved);
    approved.disabled = currentRole !== "admin";
    active.checked = Boolean(record.active);
    if (deleteButton) deleteButton.hidden = currentRole !== "admin";
    setStatus(knowledgeStatus, record.approved
      ? `Loaded ${record.slug}. Changes must be reviewed and approved again.`
      : `Loaded ${record.slug}${record.approved_by ? `; last approved by ${record.approved_by}` : " (not approved)"}.`);
  });
  element<HTMLButtonElement>("[data-knowledge-new]")?.addEventListener("click", () => {
    const selector = element<HTMLSelectElement>("[data-knowledge-record]");
    const slugInput = element<HTMLInputElement>("[data-knowledge-slug]");
    const category = element<HTMLInputElement>("[data-knowledge-category]");
    const title = element<HTMLInputElement>("[data-knowledge-title]");
    const tags = element<HTMLTextAreaElement>("[data-knowledge-tags]");
    const content = element<HTMLTextAreaElement>("[data-knowledge-content]");
    const approved = element<HTMLInputElement>("[data-knowledge-approved]");
    const active = element<HTMLInputElement>("[data-knowledge-active]");
    if (selector) selector.value = "";
    if (slugInput) slugInput.value = "";
    if (category) category.value = "";
    if (title) title.value = "";
    if (tags) tags.value = "";
    if (content) content.value = "";
    if (approved) {
      approved.checked = false;
      approved.disabled = currentRole !== "admin";
    }
    if (active) active.checked = true;
    setStatus(knowledgeStatus, "New entries are drafts until approved by an administrator.");
  });
  element<HTMLButtonElement>("[data-knowledge-save]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const slug = element<HTMLInputElement>("[data-knowledge-slug]");
    const category = element<HTMLInputElement>("[data-knowledge-category]");
    const title = element<HTMLInputElement>("[data-knowledge-title]");
    const tags = element<HTMLTextAreaElement>("[data-knowledge-tags]");
    const content = element<HTMLTextAreaElement>("[data-knowledge-content]");
    const approved = element<HTMLInputElement>("[data-knowledge-approved]");
    const active = element<HTMLInputElement>("[data-knowledge-active]");
    if (!slug || !category || !title || !tags || !content || !approved || !active) return;
    button.disabled = true;
    setStatus(knowledgeStatus, "Saving knowledge entry…");
    try {
      const result = await api<{ slug: string }>("/api/admin/knowledge", {
        method: "PUT",
        body: JSON.stringify({
          slug: slug.value,
          category: category.value,
          title: title.value,
          content: content.value,
          tags: tags.value.split(/\r?\n/).map((tag) => tag.trim()).filter(Boolean),
          approved: approved.checked,
          active: active.checked,
        }),
      });
      setStatus(knowledgeStatus, `Saved ${result.data?.slug ?? "knowledge entry"}.`);
      await loadKnowledge();
    } catch (error) {
      setStatus(knowledgeStatus, error instanceof Error ? error.message : "Knowledge could not be saved.");
    } finally {
      button.disabled = false;
    }
  });
  element<HTMLButtonElement>("[data-knowledge-delete]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const slug = element<HTMLInputElement>("[data-knowledge-slug]")?.value;
    if (!slug || currentRole !== "admin") {
      setStatus(knowledgeStatus, "Choose a knowledge entry; only administrators can delete it.");
      return;
    }
    if (!window.confirm(`Permanently delete ${slug} from assistant knowledge?`)) return;
    button.disabled = true;
    try {
      await api(`/api/admin/knowledge?slug=${encodeURIComponent(slug)}`, { method: "DELETE" });
      setStatus(knowledgeStatus, `Deleted ${slug}.`);
      element<HTMLButtonElement>("[data-knowledge-new]")?.click();
      await loadKnowledge();
    } catch (error) {
      setStatus(knowledgeStatus, error instanceof Error ? error.message : "Knowledge could not be deleted.");
    } finally {
      button.disabled = false;
    }
  });
  element<HTMLFormElement>("[data-user-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    if (!form.reportValidity()) return;
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const payload = Object.fromEntries(new FormData(form).entries());
    if (button) button.disabled = true;
    try {
      await api("/api/admin/users", { method: "PUT", body: JSON.stringify(payload) });
      form.reset();
      setStatus(userStatus, "Administrator role saved.");
      await loadUsers();
    } catch (error) {
      setStatus(userStatus, error instanceof Error ? error.message : "The role could not be saved.");
    } finally {
      if (button) button.disabled = false;
    }
  });

  void loadContent();
}

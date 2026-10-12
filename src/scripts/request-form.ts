interface ApiFailure {
  error?: {
    message?: string;
    fields?: Record<string, string[]>;
  };
}

export function attachRequestForms(): void {
  document.querySelectorAll<HTMLFormElement>("[data-request-form]").forEach((form) => {
    const industryField = form.querySelector<HTMLInputElement>("[data-industry-interest]");
    const industry = new URLSearchParams(window.location.search).get("industry")?.trim().slice(0, 120);
    if (industryField && industry) industryField.value = industry;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = form.querySelector<HTMLElement>("[data-request-status]");
      const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      if (!status || !submit || !form.reportValidity()) return;

      form.querySelectorAll<HTMLElement>("[data-field-errors]").forEach((element) => {
        element.textContent = "";
      });
      const endpoint = form.dataset.endpoint;
      if (!endpoint) {
        status.textContent = "This request form is not configured. Please use another contact method.";
        return;
      }

      const payload = Object.fromEntries(
        [...new FormData(form).entries()].map(([key, value]) => [
          key,
          value instanceof File ? value.name : value,
        ]),
      );
      const requestType = form.dataset.requestType ?? "Request";
      submit.disabled = true;
      status.textContent = "Submitting your request…";
      form.setAttribute("aria-busy", "true");

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(payload),
        });
        const result = await response.json() as ApiFailure & { id?: string; status?: string };
        if (!response.ok) {
          const fields = result.error?.fields;
          if (fields) {
            for (const [name, messages] of Object.entries(fields)) {
              const field = form.elements.namedItem(name);
              const label = field instanceof HTMLElement ? field.closest("label") : null;
              const errors = label?.querySelector<HTMLElement>("[data-field-errors]");
              if (errors) errors.textContent = messages.join(" ");
            }
          }
          status.textContent = result.error?.message ?? `${requestType} could not be submitted. Please try again.`;
          return;
        }

        status.textContent = `${requestType} received. We have recorded your request; this does not confirm an appointment.`;
        form.reset();
        if (industryField && industry) industryField.value = industry;
      } catch {
        status.textContent = `We could not connect to the request service. Your ${requestType.toLowerCase()} was not submitted; please try again later.`;
      } finally {
        submit.disabled = false;
        form.removeAttribute("aria-busy");
      }
    });
  });
}

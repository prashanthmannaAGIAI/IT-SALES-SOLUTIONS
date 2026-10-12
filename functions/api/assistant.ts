import { assistantAvailability, handleAssistantRequest } from "../../src/lib/assistant";

export const onRequestGet: PagesFunction<Env> = ({ env }) =>
  Response.json(assistantAvailability(env), {
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

export const onRequestPost: PagesFunction<Env> = ({ request, env }) =>
  handleAssistantRequest(request, env);

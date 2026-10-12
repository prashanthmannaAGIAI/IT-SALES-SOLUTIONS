import { errorResponse, jsonResponse } from "../../src/lib/http";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const result = await env.DB.prepare("SELECT 1 AS ready").first<{ ready: number }>();
    if (result?.ready !== 1) throw new Error("Database health check returned an invalid result.");
    return jsonResponse({ status: "ok" });
  } catch (error) {
    return errorResponse(error);
  }
};

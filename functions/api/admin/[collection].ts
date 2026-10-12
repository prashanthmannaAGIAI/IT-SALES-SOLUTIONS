import { authenticateAdmin, requireRole, type AdminRole } from "../../../src/lib/auth";
import {
  deleteManagedContent,
  listManagedContent,
  saveManagedContent,
} from "../../../src/lib/admin-content";
import type { ContentCollection, Database } from "../../../src/lib/database";
import { ApiError, errorResponse, jsonResponse, readJsonBody, requireSameOrigin } from "../../../src/lib/http";

const collections = ["services", "industries", "articles", "products"] as const;

function contentType(value: string | undefined): ContentCollection {
  if (collections.includes(value as ContentCollection)) return value as ContentCollection;
  throw new ApiError(404, "CONTENT_NOT_FOUND", "The requested content collection was not found.");
}

async function authorize(request: Request, env: Env, allowed: readonly AdminRole[]) {
  const identity = await authenticateAdmin(request, env.DB as Database, env);
  requireRole(identity, allowed);
  return identity;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const type = contentType(params.collection);
    const identity = await authorize(request, env, ["viewer", "editor", "admin"]);
    const data = await listManagedContent(env.DB as Database, type);
    return jsonResponse({ data, role: identity.role });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    requireSameOrigin(request);
    const type = contentType(params.collection);
    const identity = await authorize(request, env, ["editor", "admin"]);
    const body = await readJsonBody(request, 256_000);
    if (
      typeof body !== "object" || body === null || Array.isArray(body) ||
      !("published" in body) || typeof body.published !== "boolean" || !("content" in body)
    ) {
      throw new ApiError(400, "INVALID_BODY", "Provide content and a published boolean.");
    }
    const slug = await saveManagedContent(env.DB as Database, type, body.content, identity, body.published);
    return jsonResponse({ data: { slug } });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    requireSameOrigin(request);
    const type = contentType(params.collection);
    const identity = await authorize(request, env, ["admin"]);
    const slug = new URL(request.url).searchParams.get("slug")?.trim() ?? "";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new ApiError(400, "INVALID_SLUG", "Provide a valid content slug.");
    }
    await deleteManagedContent(env.DB as Database, type, slug, identity);
    return jsonResponse({ data: { slug, deleted: true } });
  } catch (error) {
    return errorResponse(error);
  }
};

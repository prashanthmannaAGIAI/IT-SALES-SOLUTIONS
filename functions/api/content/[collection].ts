import { getPublishedContent, isContentCollection, type Database } from "../../../src/lib/database";
import { ApiError, errorResponse, jsonResponse } from "../../../src/lib/http";

export const onRequestGet: PagesFunction<Env> = async ({ env, params, request }) => {
  try {
    const collection = params.collection ?? "";
    if (!isContentCollection(collection)) {
      throw new ApiError(404, "CONTENT_NOT_FOUND", "The requested content collection was not found.");
    }
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug")?.trim();
    if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new ApiError(400, "INVALID_SLUG", "The content identifier is invalid.");
    }
    const content = await getPublishedContent<unknown>(env.DB as Database, collection, slug);
    if (slug && content.length === 0) {
      throw new ApiError(404, "CONTENT_NOT_FOUND", "The requested content was not found.");
    }
    return jsonResponse({ data: content }, 200, {
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    });
  } catch (error) {
    return errorResponse(error);
  }
};

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function jsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json; charset=utf-8");
  if (!responseHeaders.has("Cache-Control")) responseHeaders.set("Cache-Control", "no-store");
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  responseHeaders.set("Referrer-Policy", "no-referrer");
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    const body: ApiErrorBody = {
      error: {
        code: error.code,
        message: error.message,
        ...(error.fields ? { fields: error.fields } : {}),
      },
    };
    return jsonResponse(body, error.status);
  }

  console.error("Unhandled API failure", {
    errorName: error instanceof Error ? error.name : "UnknownError",
  });
  return jsonResponse(
    { error: { code: "INTERNAL_ERROR", message: "The request could not be completed." } },
    500,
  );
}

const DEFAULT_MAX_REQUEST_BYTES = 12_000;

export async function readJsonBody(request: Request, maxBytes = DEFAULT_MAX_REQUEST_BYTES): Promise<unknown> {
  const contentType = request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Submit this form using JSON.");
  }

  const contentLength = Number(request.headers.get("Content-Length") ?? 0);
  if (contentLength > maxBytes) {
    throw new ApiError(413, "REQUEST_TOO_LARGE", "The request exceeds the allowed size.");
  }

  if (!request.body) throw new ApiError(400, "INVALID_BODY", "A request body is required.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new ApiError(413, "REQUEST_TOO_LARGE", "The request exceeds the allowed size.");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "INVALID_JSON", "The request body must contain valid JSON.");
  }
}

export function requireSameOrigin(request: Request): void {
  const origin = request.headers.get("Origin");
  let requestOrigin: string;
  try {
    requestOrigin = new URL(request.url).origin;
  } catch {
    throw new ApiError(400, "INVALID_REQUEST", "The request could not be validated.");
  }
  if (!origin || origin !== requestOrigin) {
    throw new ApiError(403, "ORIGIN_REJECTED", "Submit this request from the official website.");
  }
}

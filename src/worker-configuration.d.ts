declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    PERSONAL_DATA_STORAGE_APPROVED: string;
    CF_ACCESS_TEAM_DOMAIN: string;
    CF_ACCESS_AUD: string;
    RATE_LIMIT_HMAC_SECRET: string;
    OLLAMA_BASE_URL: string;
    OLLAMA_MODEL: string;
    OLLAMA_API_KEY: string;
    AI_MAX_DAILY_REQUESTS: string;
  }
}

interface Env extends Cloudflare.Env {}

type PagesFunction<Bindings> = (context: {
  request: Request;
  env: Bindings;
  params: Record<string, string>;
}) => Response | Promise<Response>;

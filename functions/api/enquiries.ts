import type { Database } from "../../src/lib/database";
import { handleSubmission } from "../../src/lib/submissions";

export const onRequestPost: PagesFunction<Env> = ({ request, env }) =>
  handleSubmission(request, {
    DB: env.DB as Database,
    PERSONAL_DATA_STORAGE_APPROVED: env.PERSONAL_DATA_STORAGE_APPROVED,
    RATE_LIMIT_HMAC_SECRET: env.RATE_LIMIT_HMAC_SECRET,
  }, "enquiry");

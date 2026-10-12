import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import type { Database } from "./database";
import { ApiError } from "./http";

export type AdminRole = "admin" | "editor" | "viewer";

export interface AdminIdentity {
  email: string;
  role: AdminRole;
}

interface AccessEnvironment {
  CF_ACCESS_TEAM_DOMAIN: string;
  CF_ACCESS_AUD: string;
}

const keySets = new Map<string, JWTVerifyGetKey>();

export async function authenticateAdmin(
  request: Request,
  database: Database,
  environment: AccessEnvironment,
  keyResolver?: JWTVerifyGetKey,
): Promise<AdminIdentity> {
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) throw new ApiError(401, "AUTHENTICATION_REQUIRED", "Sign in through the organization access portal.");

  const teamDomain = environment.CF_ACCESS_TEAM_DOMAIN.trim().replace(/^https:\/\//i, "").replace(/\/+$/, "");
  const audience = environment.CF_ACCESS_AUD.trim();
  if (!teamDomain.endsWith(".cloudflareaccess.com") || !audience) {
    throw new ApiError(503, "AUTHENTICATION_NOT_CONFIGURED", "Administrator access is not configured.");
  }

  const issuer = `https://${teamDomain}`;
  const resolver = keyResolver ?? getKeySet(issuer);
  let email: string;
  try {
    const { payload } = await jwtVerify(token, resolver, {
      issuer,
      audience,
      algorithms: ["RS256"],
    });
    if (typeof payload.email !== "string" || !payload.email.includes("@")) {
      throw new ApiError(401, "INVALID_ACCESS_TOKEN", "Administrator identity could not be verified.");
    }
    email = payload.email.trim().toLowerCase();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, "INVALID_ACCESS_TOKEN", "Sign in through the organization access portal.");
  }

  const result = await database.prepare(
    "SELECT email, role FROM admin_users WHERE email = ? COLLATE NOCASE AND active = 1 LIMIT 1",
  ).bind(email).first<{ email: string; role: AdminRole }>();
  if (!result) throw new ApiError(403, "ROLE_NOT_ASSIGNED", "This account is not authorized for the administration dashboard.");
  return { email: result.email, role: result.role };
}

export function requireRole(identity: AdminIdentity, allowedRoles: readonly AdminRole[]): void {
  if (!allowedRoles.includes(identity.role)) {
    throw new ApiError(403, "INSUFFICIENT_ROLE", "Your account does not have permission to perform this action.");
  }
}

function getKeySet(issuer: string): JWTVerifyGetKey {
  let keySet = keySets.get(issuer);
  if (!keySet) {
    keySet = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    keySets.set(issuer, keySet);
  }
  return keySet;
}

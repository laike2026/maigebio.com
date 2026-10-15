import "server-only";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { query } from "@/lib/db";

const scrypt = promisify(scryptCallback);
const COOKIE = "maige_admin_session";
const SESSION_HOURS = 12;

export type AdminUser = {
  id: string;
  email: string;
  display_name: string;
  role_id: string;
  permissions: string[];
  must_change_password: boolean;
};

export function can(user: AdminUser, module: string, action = "view") {
  if (user.must_change_password) return false;
  const permissions = user.permissions;
  const scope = module === "seo_issues" || module === "redirects" || module === "seo_metrics" ? "seo" : module === "roles" ? "users" : module === "lead_statuses" ? "leads" : module;
  return permissions.includes("*") || permissions.includes(`${scope}:*`) || permissions.includes(`${scope}:${action}`);
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [method, salt, hash] = encoded.split("$");
  if (method !== "scrypt" || !salt || !hash || hash.length !== 128) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }

export async function createSession(userId: string, remember: boolean, ip: string, userAgent: string) {
  const token = randomBytes(32).toString("base64url");
  const maxAge = remember ? 30 * 24 * 3600 : SESSION_HOURS * 3600;
  await query("INSERT INTO sessions(user_id, token_hash, expires_at, ip, user_agent) VALUES($1,$2,now()+($3::text || ' seconds')::interval,$4,$5)", [userId, tokenHash(token), maxAge, ip.slice(0, 80), userAgent.slice(0, 300)]);
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge });
}

export async function revokeSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await query("UPDATE sessions SET revoked_at=now() WHERE token_hash=$1 AND revoked_at IS NULL", [tokenHash(token)]);
  jar.delete(COOKIE);
}

export async function getSession(): Promise<AdminUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const result = await query<AdminUser>(
    `SELECT u.id,u.email,u.display_name,u.role_id,u.must_change_password,r.permissions
     FROM sessions s JOIN users u ON u.id=s.user_id JOIN roles r ON r.id=u.role_id
     WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now()
       AND u.active=true AND u.deleted_at IS NULL LIMIT 1`, [tokenHash(token)]);
  return result.rows[0] || null;
}

export async function requireAdmin(module: string, action = "view") {
  const user = await getSession();
  if (!user) return { user: null, allowed: false };
  return { user, allowed: can(user, module, action) };
}

export async function requestOriginAllowed(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const allowedHosts = [request.headers.get("host"), request.headers.get("x-forwarded-host"), new URL(request.url).host];
  return allowedHosts.includes(new URL(origin).host);
}

export async function audit(action: string, module: string, userId: string | null, objectId = "", before: object | null = null, after: object | null = null, success = true) {
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
    await query(
      "INSERT INTO audit_logs(user_id,action,module,object_id,before_summary,after_summary,ip,user_agent,success) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [userId, action, module, objectId, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null, ip.slice(0, 80), (h.get("user-agent") || "").slice(0, 300), success]);
  } catch (error) { console.error("Audit log failed", error instanceof Error ? error.name : "unknown"); }
}

export function publicUser(user: AdminUser) {
  return { id: user.id, email: user.email, displayName: user.display_name, role: user.role_id, permissions: user.permissions, mustChangePassword: user.must_change_password };
}

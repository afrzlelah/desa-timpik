const { createHmac, timingSafeEqual } = require("node:crypto");

const COOKIE_NAME = "timpik_admin_session";
const SESSION_SECONDS = 60 * 60 * 8;

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function sign(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function getSession(req, secret) {
  const cookie = String(req.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!cookie) return null;

  const token = cookie.slice(COOKIE_NAME.length + 1);
  const separator = token.lastIndexOf(".");
  if (separator < 1) return null;
  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!safeEqual(signature, sign(payload, secret))) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number(session.exp) > Math.floor(Date.now() / 1000) ? session : null;
  } catch {
    return null;
  }
}

async function isActiveAdmin(session, supabase) {
  if (!session) return false;
  // Existing environment-based admin sessions remain valid during the migration.
  if (session.auth !== "supabase") return true;
  if (!session.sub || !supabase) return false;

  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", session.sub)
    .maybeSingle();
  return !error && Boolean(data);
}

function createSessionCookie(req, session, secret, maxAge = SESSION_SECONDS) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const token = `${payload}.${sign(payload, secret)}`;
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  const secure = String(protocol || "").split(",")[0].trim() === "https" || req.socket?.encrypted === true;
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

function clearSessionCookie(req) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  const secure = String(protocol || "").split(",")[0].trim() === "https" || req.socket?.encrypted === true;
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`;
}

function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const host = String(req.headers.host || "").toLowerCase();
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  const expectedProtocol = String(protocol || "").split(",")[0].trim() || (req.socket?.encrypted ? "https" : "http");
  try {
    const parsedOrigin = new URL(origin);
    return parsedOrigin.host.toLowerCase() === host && parsedOrigin.protocol === `${expectedProtocol}:`;
  } catch {
    return false;
  }
}

module.exports = { COOKIE_NAME, SESSION_SECONDS, getSession, isActiveAdmin, createSessionCookie, clearSessionCookie, isSameOrigin };

const { createHmac, timingSafeEqual } = require("node:crypto");

const COOKIE_NAME = "timpik_admin_session";
const SESSION_SECONDS = 60 * 60 * 8;

function send(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
  res.end(JSON.stringify(body));
}

function requestUsesHttps(req) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  return String(protocol || "").split(",")[0].trim() === "https" || req.socket?.encrypted === true;
}

function cookieOptions(req, maxAge) {
  const secure = requestUsesHttps(req);
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

function sign(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function isLocalRequest(req) {
  const host = String(req.headers.host || "").split(":")[0].toLowerCase();
  return host === "localhost" || host === "127.0.0.1";
}

function readCookie(req) {
  const cookieHeader = req.headers.cookie || "";
  const entry = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return entry ? entry.slice(COOKIE_NAME.length + 1) : "";
}

function isAuthenticated(req, secret) {
  const token = readCookie(req);
  const separator = token.lastIndexOf(".");
  if (!token || separator < 1) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!safeEqual(signature, sign(payload, secret))) return false;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return session.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

async function readJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 10_000) throw new Error("Request terlalu besar");
  }
  return JSON.parse(raw || "{}");
}

module.exports = async function handler(req, res) {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!username || !password || !secret || secret.length < 32) {
    return send(res, 503, { error: "Konfigurasi login admin belum lengkap." });
  }

  if (req.method === "GET") {
    return isAuthenticated(req, secret)
      ? send(res, 200, { authenticated: true })
      : send(res, 401, { authenticated: false });
  }

  if (req.method === "POST") {
    let credentials;
    try {
      credentials = await readJson(req);
    } catch {
      return send(res, 400, { error: "Permintaan login tidak valid." });
    }

    const normalizedUsername = (value) => String(value || "").trim().toLowerCase();
    const validUsername = safeEqual(normalizedUsername(credentials.username), normalizedUsername(username));
    const validPassword = safeEqual(credentials.password || "", password);
    if (!validUsername || !validPassword) {
      const body = { error: "Nama pengguna atau kata sandi tidak cocok." };
      if (isLocalRequest(req)) {
        body.debug = { usernameMatches: validUsername, passwordMatches: validPassword };
      }
      return send(res, 401, body);
    }

    const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS })).toString("base64url");
    const token = `${payload}.${sign(payload, secret)}`;
    const secure = requestUsesHttps(req);
    const cookie = `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure ? "; Secure" : ""}`;
    return send(res, 200, { authenticated: true }, { "Set-Cookie": cookie });
  }

  if (req.method === "DELETE") {
    return send(res, 200, { authenticated: false }, { "Set-Cookie": cookieOptions(req, 0) });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return send(res, 405, { error: "Metode tidak didukung." });
};

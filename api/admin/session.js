const { createClient } = require("@supabase/supabase-js");
const {
  SESSION_SECONDS,
  getSession,
  isActiveAdmin,
  createSessionCookie,
  clearSessionCookie,
  isSameOrigin,
} = require("../_admin-session");

function send(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 10_000) throw new Error("Request terlalu besar");
  }
  return JSON.parse(raw || "{}");
}

function getSupabaseConfig() {
  return {
    url: process.env.PUBLIC_SUPABASE_URL,
    anonKey: process.env.PUBLIC_SUPABASE_KEY,
    secretKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

function createServiceClient(url, secretKey) {
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function issueSession(req, res, secret, session) {
  const payload = { ...session, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS };
  return send(res, 200, { authenticated: true }, {
    "Set-Cookie": createSessionCookie(req, payload, secret, SESSION_SECONDS),
  });
}

module.exports = async function handler(req, res) {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32) {
    return send(res, 503, { error: "Konfigurasi sesi admin belum lengkap." });
  }

  if (req.method === "GET") {
    const session = getSession(req, sessionSecret);
    if (!session) return send(res, 401, { authenticated: false });
    if (session.auth !== "supabase") return send(res, 200, { authenticated: true });

    const { url, secretKey } = getSupabaseConfig();
    if (!url || !secretKey) return send(res, 503, { error: "Konfigurasi Supabase server belum lengkap." });
    const active = await isActiveAdmin(session, createServiceClient(url, secretKey));
    return active
      ? send(res, 200, { authenticated: true })
      : send(res, 401, { authenticated: false });
  }

  if (req.method === "POST") {
    if (!isSameOrigin(req)) return send(res, 403, { error: "Permintaan lintas situs ditolak." });

    let credentials;
    try {
      credentials = await readJson(req);
    } catch {
      return send(res, 400, { error: "Permintaan login tidak valid." });
    }

    const configuredUsername = process.env.ADMIN_USERNAME;
    const configuredPassword = process.env.ADMIN_PASSWORD;
    const submittedUsername = String(credentials.username || credentials.email || "").trim();
    const submittedPassword = String(credentials.password || "");

    if (
      configuredUsername && configuredPassword &&
      submittedUsername.toLowerCase() === configuredUsername.trim().toLowerCase() &&
      safePasswordEqual(submittedPassword, configuredPassword)
    ) {
      return issueSession(req, res, sessionSecret, { auth: "env", role: "owner" });
    }

    const { url, anonKey, secretKey } = getSupabaseConfig();
    if (!url || !anonKey || !secretKey || !submittedUsername.includes("@")) {
      return send(res, 401, { error: "Email/nama pengguna atau kata sandi tidak cocok." });
    }

    const authClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await authClient.auth.signInWithPassword({
      email: submittedUsername.toLowerCase(),
      password: submittedPassword,
    });
    if (error || !data.user) return send(res, 401, { error: "Email/nama pengguna atau kata sandi tidak cocok." });

    const userSession = {
      auth: "supabase",
      sub: data.user.id,
      email: data.user.email || submittedUsername.toLowerCase(),
      display_name: data.user.user_metadata?.display_name || "Administrator",
    };
    const active = await isActiveAdmin(userSession, createServiceClient(url, secretKey));
    if (!active) return send(res, 401, { error: "Email/nama pengguna atau kata sandi tidak cocok." });
    return issueSession(req, res, sessionSecret, userSession);
  }

  if (req.method === "DELETE") {
    if (!isSameOrigin(req)) return send(res, 403, { error: "Permintaan lintas situs ditolak." });
    return send(res, 200, { authenticated: false }, { "Set-Cookie": clearSessionCookie(req) });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return send(res, 405, { error: "Metode tidak didukung." });
};

function safePasswordEqual(left, right) {
  const { timingSafeEqual } = require("node:crypto");
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

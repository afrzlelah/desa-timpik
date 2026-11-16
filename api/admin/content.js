const { createHmac, timingSafeEqual } = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");

const COOKIE_NAME = "timpik_admin_session";
const CONTENT_KEYS = new Set([
  "profil",
  "kontak",
  "berita",
  "agenda",
  "surat",
  "kelembagaan",
  "potensi",
  "apbdes",
]);

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.end(JSON.stringify(body));
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function hasValidSession(req, secret) {
  const cookie = String(req.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!cookie) return false;

  const token = cookie.slice(COOKIE_NAME.length + 1);
  const separator = token.lastIndexOf(".");
  if (separator < 1) return false;
  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  if (!safeEqual(signature, expected)) return false;

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
    if (raw.length > 1_000_000) throw new Error("Request terlalu besar");
  }
  return JSON.parse(raw || "{}");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    res.setHeader("Allow", "POST, DELETE");
    return send(res, 405, { error: "Metode tidak didukung." });
  }

  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32 || !hasValidSession(req, sessionSecret)) {
    return send(res, 401, { error: "Sesi admin tidak valid." });
  }

  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return send(res, 503, { error: "Kunci Supabase server belum dikonfigurasi." });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (req.method === "DELETE") {
    const key = String(req.query?.key || "");
    if (!CONTENT_KEYS.has(key)) return send(res, 400, { error: "Kunci konten tidak valid." });
    const { error } = await supabase.from("site_content").delete().eq("content_key", key);
    if (error) return send(res, 502, { error: "Gagal menghapus konten dari Supabase." });
    return send(res, 200, { deleted: true, key });
  }

  let body;
  try {
    body = await readJson(req);
  } catch {
    return send(res, 400, { error: "Isi permintaan tidak valid." });
  }

  if (!CONTENT_KEYS.has(body.key) || body.data === undefined) {
    return send(res, 400, { error: "Kunci atau data konten tidak valid." });
  }
  const { data, error } = await supabase
    .from("site_content")
    .upsert({ content_key: body.key, data: body.data, updated_at: new Date().toISOString() })
    .select("content_key,updated_at")
    .single();

  if (error) return send(res, 502, { error: "Gagal menyimpan konten ke Supabase." });
  return send(res, 200, { saved: true, ...data });
};

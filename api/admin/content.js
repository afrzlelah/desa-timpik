const { createClient } = require("@supabase/supabase-js");
const { getSession, isActiveAdmin, isSameOrigin } = require("../_admin-session");

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
  if (!isSameOrigin(req)) return send(res, 403, { error: "Permintaan lintas situs ditolak." });

  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  const session = sessionSecret && sessionSecret.length >= 32 ? getSession(req, sessionSecret) : null;
  if (!session) {
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
  if (!(await isActiveAdmin(session, supabase))) {
    return send(res, 401, { error: "Akses admin sudah dicabut. Silakan masuk kembali." });
  }

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

  if (body.action === "delete") {
    if (!CONTENT_KEYS.has(body.key)) return send(res, 400, { error: "Kunci konten tidak valid." });
    const { error } = await supabase.from("site_content").delete().eq("content_key", body.key);
    if (error) return send(res, 502, { error: "Gagal menghapus konten dari Supabase." });
    return send(res, 200, { deleted: true, key: body.key });
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

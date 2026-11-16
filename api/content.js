const { createClient } = require("@supabase/supabase-js");

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

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return send(res, 405, { error: "Metode tidak didukung." });
  }

  const key = String(req.query?.key || "");
  if (key !== "all" && !CONTENT_KEYS.has(key)) return send(res, 400, { error: "Kunci konten tidak valid." });

  const url = process.env.PUBLIC_SUPABASE_URL;
  const anonKey = process.env.PUBLIC_SUPABASE_KEY;
  if (!url || !anonKey) return send(res, 503, { error: "Konfigurasi Supabase publik belum lengkap." });

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (key === "all") {
    const { data, error } = await supabase
      .from("site_content")
      .select("content_key,data,updated_at")
      .order("content_key");
    if (error) return send(res, 502, { error: "Gagal membaca konten dari Supabase." });
    const contents = Object.fromEntries((data || []).map((row) => [row.content_key, row.data]));
    return send(res, 200, { contents });
  }

  const { data, error } = await supabase
    .from("site_content")
    .select("content_key,data,updated_at")
    .eq("content_key", key)
    .maybeSingle();

  if (error) return send(res, 502, { error: "Gagal membaca konten dari Supabase." });
  if (!data) return send(res, 404, { error: "Konten belum tersedia di Supabase.", key });
  return send(res, 200, data);
};

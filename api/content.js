const { createClient } = require("@supabase/supabase-js");

const CONTENT_KEYS = new Set([
  "profil",
  "kontak",
  "berita",
  "agenda",
  "pengumuman",
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

function normalizeProfil(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return data;
  }

  return {
    ...data,

    // Data sejarah desa
    sejarah_judul:
      data.sejarah_judul || "Desa Timpik, Kecamatan Susukan",

    sejarah_paragraf_1:
      data.sejarah_paragraf_1 || "",

    sejarah_paragraf_2:
      data.sejarah_paragraf_2 || "",
  };
}

function normalizeContent(key, data) {
  if (key === "profil") {
    return normalizeProfil(data);
  }

  return data;
}

module.exports = async function handler(req, res) {
  // ==========================================
  // 1. VALIDASI METHOD
  // ==========================================

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");

    return send(res, 405, {
      error: "Metode tidak didukung.",
    });
  }

  // ==========================================
  // 2. VALIDASI PARAMETER
  // ==========================================

  const key = String(req.query?.key || "");

  const requestedKeys = String(req.query?.keys || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (
    (key && key !== "all" && !CONTENT_KEYS.has(key)) ||
    (!key && requestedKeys.length === 0) ||
    requestedKeys.some((item) => !CONTENT_KEYS.has(item)) ||
    requestedKeys.length > CONTENT_KEYS.size
  ) {
    return send(res, 400, {
      error: "Kunci konten tidak valid.",
      receivedKey: key || null,
      receivedKeys: requestedKeys,
      allowedKeys: [...CONTENT_KEYS],
    });
  }

  // ==========================================
  // 3. KONFIGURASI SUPABASE
  // ==========================================

  const url = process.env.PUBLIC_SUPABASE_URL;
  const anonKey = process.env.PUBLIC_SUPABASE_KEY;

  if (!url || !anonKey) {
    return send(res, 503, {
      error: "Konfigurasi Supabase publik belum lengkap.",
    });
  }

  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  // ==========================================
  // 4. AMBIL SEMUA KONTEN
  // ==========================================

  if (key === "all" || requestedKeys.length > 0) {
    let query = supabase
      .from("site_content")
      .select("content_key,data,updated_at")
      .order("content_key");

    if (requestedKeys.length > 0) {
      query = query.in(
        "content_key",
        [...new Set(requestedKeys)]
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase content read error:", error);

      return send(res, 502, {
        error: "Gagal membaca konten dari Supabase.",
        detail: error.message,
        code: error.code,
      });
    }

    const contents = Object.fromEntries(
      (data || []).map((row) => [
        row.content_key,
        normalizeContent(row.content_key, row.data),
      ])
    );

    return send(res, 200, {
      contents,
    });
  }

  // ==========================================
  // 5. AMBIL SATU KONTEN
  // ==========================================

  const { data, error } = await supabase
    .from("site_content")
    .select("content_key,data,updated_at")
    .eq("content_key", key)
    .maybeSingle();

  if (error) {
    console.error("Supabase content read error:", error);

    return send(res, 502, {
      error: "Gagal membaca konten dari Supabase.",
      detail: error.message,
      code: error.code,
    });
  }

  if (!data) {
    return send(res, 404, {
      error: "Konten belum tersedia di Supabase.",
      key,
    });
  }

  // ==========================================
  // 6. NORMALISASI DATA PROFIL
  // ==========================================

  const response = {
    ...data,
    data: normalizeContent(data.content_key, data.data),
  };

  return send(res, 200, response);
};
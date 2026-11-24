const { createClient } = require("@supabase/supabase-js");
const {
  getSession,
  isActiveAdmin,
  isSameOrigin,
} = require("../_admin-session");

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

const MAX_BODY_SIZE = 1_000_000;

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.end(JSON.stringify(body));
}

function isValidContentKey(key) {
  return typeof key === "string" && CONTENT_KEYS.has(key);
}

async function readJson(req) {
  let raw = "";

  for await (const chunk of req) {
    raw += chunk.toString();

    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_SIZE) {
      throw new Error("Request terlalu besar.");
    }
  }

  try {
    return JSON.parse(raw || "{}");
  } catch {
    throw new Error("Isi permintaan tidak valid.");
  }
}

async function deleteContent(supabase, key) {
  const { error } = await supabase
    .from("site_content")
    .delete()
    .eq("content_key", key);

  if (error) {
    console.error("Supabase delete error:", error);

    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
  };
}

module.exports = async function handler(req, res) {
  // ==========================================
  // 1. VALIDASI METHOD
  // ==========================================

  if (!["POST", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "POST, DELETE");

    return send(res, 405, {
      error: "Metode tidak didukung.",
    });
  }

  // ==========================================
  // 2. VALIDASI SAME ORIGIN
  // ==========================================

  if (!isSameOrigin(req)) {
    return send(res, 403, {
      error: "Permintaan lintas situs ditolak.",
    });
  }

  // ==========================================
  // 3. VALIDASI SESSION ADMIN
  // ==========================================

  const sessionSecret = process.env.ADMIN_SESSION_SECRET;

  if (!sessionSecret || sessionSecret.length < 32) {
    console.error("ADMIN_SESSION_SECRET belum dikonfigurasi.");

    return send(res, 503, {
      error: "Konfigurasi sesi admin belum tersedia.",
    });
  }

  const session = getSession(req, sessionSecret);

  if (!session) {
    return send(res, 401, {
      error: "Sesi admin tidak valid. Silakan masuk kembali.",
    });
  }

  // ==========================================
  // 4. KONEKSI SUPABASE
  // ==========================================

  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;

  const serviceKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("Konfigurasi Supabase belum lengkap.");

    return send(res, 503, {
      error: "Kunci Supabase server belum dikonfigurasi.",
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  // ==========================================
  // 5. VALIDASI STATUS ADMIN
  // ==========================================

  let activeAdmin = false;

  try {
    activeAdmin = await isActiveAdmin(session, supabase);
  } catch (error) {
    console.error("Admin validation error:", error);

    return send(res, 500, {
      error: "Gagal memverifikasi hak akses admin.",
    });
  }

  if (!activeAdmin) {
    return send(res, 401, {
      error: "Akses admin sudah dicabut. Silakan masuk kembali.",
    });
  }

  // ==========================================
  // 6. DELETE VIA QUERY PARAMETER
  // ==========================================

  if (req.method === "DELETE") {
    const key = String(req.query?.key || "");

    if (!isValidContentKey(key)) {
      return send(res, 400, {
        error: `Kunci konten tidak valid: ${key || "(kosong)"}.`,
        allowedKeys: [...CONTENT_KEYS],
      });
    }

    const result = await deleteContent(supabase, key);

    if (!result.success) {
      return send(res, 502, {
        error: "Gagal menghapus konten dari Supabase.",
        detail: result.error,
      });
    }

    return send(res, 200, {
      deleted: true,
      key,
    });
  }

  // ==========================================
  // 7. BACA REQUEST BODY
  // ==========================================

  let body;

  try {
    body = await readJson(req);
  } catch (error) {
    const isTooLarge = error.message === "Request terlalu besar.";

    return send(res, isTooLarge ? 413 : 400, {
      error: error.message,
    });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return send(res, 400, {
      error: "Format isi permintaan tidak valid.",
    });
  }

  // ==========================================
  // 8. DELETE VIA REQUEST BODY
  // ==========================================

  if (body.action === "delete") {
    if (!isValidContentKey(body.key)) {
      return send(res, 400, {
        error: `Kunci konten tidak valid: ${body.key || "(kosong)"}.`,
        allowedKeys: [...CONTENT_KEYS],
      });
    }

    const result = await deleteContent(supabase, body.key);

    if (!result.success) {
      return send(res, 502, {
        error: "Gagal menghapus konten dari Supabase.",
        detail: result.error,
      });
    }

    return send(res, 200, {
      deleted: true,
      key: body.key,
    });
  }

  // ==========================================
  // 9. VALIDASI DATA KONTEN
  // ==========================================

  if (!isValidContentKey(body.key)) {
    return send(res, 400, {
      error: "Kunci konten tidak valid.",
      receivedKey: body.key ?? null,
      allowedKeys: [...CONTENT_KEYS],
    });
  }

  if (
    body.data === undefined ||
    body.data === null ||
    typeof body.data !== "object"
  ) {
    return send(res, 400, {
      error: "Data konten tidak valid.",
      receivedKey: body.key,
    });
  }

  // ==========================================
  // 10. SIMPAN / UPDATE KONTEN
  // ==========================================

  const { data, error } = await supabase
    .from("site_content")
    .upsert(
      {
        content_key: body.key,
        data: body.data,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "content_key",
      }
    )
    .select("content_key, updated_at")
    .single();

  if (error) {
    console.error("Supabase upsert error:", error);

    return send(res, 502, {
      error: "Gagal menyimpan konten ke Supabase.",
      detail: error.message,
      code: error.code,
    });
  }

  // ==========================================
  // 11. RESPONSE BERHASIL
  // ==========================================

  return send(res, 200, {
    saved: true,
    key: data.content_key,
    updated_at: data.updated_at,
  });
};
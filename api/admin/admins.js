const { createClient } = require("@supabase/supabase-js");
const { getSession, isActiveAdmin, isSameOrigin } = require("../_admin-session");

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
    if (raw.length > 10_000) throw new Error("Request terlalu besar");
  }
  return JSON.parse(raw || "{}");
}

function getSiteUrl() {
  const value = process.env.PUBLIC_SITE_URL || "https://desatimpik.id";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return null;
    return url.origin;
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  if (!["GET", "POST", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST, DELETE");
    return send(res, 405, { error: "Metode tidak didukung." });
  }
  if (req.method !== "GET" && !isSameOrigin(req)) {
    return send(res, 403, { error: "Permintaan lintas situs ditolak." });
  }

  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  const session = sessionSecret && sessionSecret.length >= 32 ? getSession(req, sessionSecret) : null;
  if (!session) return send(res, 401, { error: "Sesi admin tidak valid. Silakan masuk kembali." });

  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return send(res, 503, { error: "Kunci Supabase server belum dikonfigurasi." });
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  if (!(await isActiveAdmin(session, supabase))) {
    return send(res, 403, { error: "Akun ini tidak memiliki hak admin." });
  }

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("admin_users")
      .select("user_id,email,display_name,created_at")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Could not list admin users:", error.message);
      return send(res, 502, { error: "Daftar admin gagal dimuat. Pastikan migrasi pengelolaan admin sudah dijalankan." });
    }
    return send(res, 200, { admins: data || [] });
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await readJson(req);
    } catch {
      return send(res, 400, { error: "Data undangan tidak valid." });
    }

    const email = String(body.email || "").trim().toLowerCase();
    const displayName = String(body.displayName || "").trim();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return send(res, 400, { error: "Masukkan alamat email yang valid." });
    }
    if (!displayName || displayName.length > 80) {
      return send(res, 400, { error: "Nama admin wajib diisi dan maksimal 80 karakter." });
    }
    const { data: existingAdmin, error: lookupError } = await supabase
      .from("admin_users")
      .select("email");
    if (lookupError) return send(res, 502, { error: "Email admin tidak dapat diperiksa." });
    if ((existingAdmin || []).some((admin) => String(admin.email || "").toLowerCase() === email)) {
      return send(res, 409, { error: "Email tersebut sudah memiliki akses admin." });
    }
    const siteUrl = getSiteUrl();
    if (!siteUrl) return send(res, 503, { error: "PUBLIC_SITE_URL harus berupa URL HTTPS yang valid." });

    const { data: invitation, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { display_name: displayName },
      redirectTo: `${siteUrl}/admin/accept-invite`,
    });
    if (inviteError || !invitation.user) {
      console.error("Could not invite admin:", inviteError?.message || "No user returned");
      return send(res, 502, { error: "Undangan gagal dikirim. Periksa alamat email, SMTP Supabase, dan URL redirect yang diizinkan." });
    }

    const { error: insertError } = await supabase.from("admin_users").insert({
      user_id: invitation.user.id,
      email,
      display_name: displayName,
    });
    if (insertError) {
      console.error("Could not register invited admin:", insertError.message);
      return send(res, 502, { error: "Email undangan terkirim, tetapi aksesnya belum tercatat. Jangan gunakan tautan itu sampai admin memeriksa daftar admin." });
    }

    return send(res, 201, { invited: true, admin: { user_id: invitation.user.id, email, display_name: displayName } });
  }

  const userId = String(req.query?.id || "");
  if (!userId || userId.length > 80) return send(res, 400, { error: "ID admin tidak valid." });
  if (session.auth === "supabase" && session.sub === userId) {
    return send(res, 400, { error: "Akun yang sedang digunakan tidak bisa menghapus dirinya sendiri." });
  }

  const { count, error: countError } = await supabase
    .from("admin_users")
    .select("user_id", { count: "exact", head: true });
  if (countError) return send(res, 502, { error: "Jumlah admin tidak dapat diperiksa." });
  if ((count || 0) <= 1) return send(res, 409, { error: "Admin terakhir tidak dapat dihapus." });

  const { data: target, error: targetError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (targetError || !target) return send(res, 404, { error: "Akun admin tidak ditemukan." });

  const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error("Could not delete admin user:", deleteError.message);
    return send(res, 502, { error: "Akun admin gagal dihapus." });
  }
  return send(res, 200, { deleted: true });
};

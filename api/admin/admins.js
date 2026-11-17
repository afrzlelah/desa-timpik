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
    const { data: records, error } = await supabase
      .from("admin_users")
      .select("user_id,display_name,created_at")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Could not list admin users:", error.message);
      return send(res, 502, { error: "Daftar admin gagal dimuat." });
    }
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authError) return send(res, 502, { error: "Detail akun admin gagal dimuat." });
    const usersById = new Map((authUsers.users || []).map((user) => [user.id, user]));
    const admins = (records || []).map((record) => {
      const user = usersById.get(record.user_id);
      return {
        user_id: record.user_id,
        email: user?.email || "Email tidak tersedia",
        display_name: record.display_name || user?.user_metadata?.display_name || "Administrator",
        created_at: record.created_at,
      };
    });
    return send(res, 200, { admins });
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await readJson(req);
    } catch {
      return send(res, 400, { error: "Data akun admin tidak valid." });
    }

    const email = String(body.email || "").trim().toLowerCase();
    const displayName = String(body.displayName || "").trim();
    const password = String(body.password || "");
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return send(res, 400, { error: "Masukkan alamat email yang valid." });
    }
    if (!displayName || displayName.length > 80) {
      return send(res, 400, { error: "Nama admin wajib diisi dan maksimal 80 karakter." });
    }
    if (password.length < 12 || password.length > 128) {
      return send(res, 400, { error: "Kata sandi awal harus berisi 12–128 karakter." });
    }
    const { data: existingAdminRecords, error: lookupError } = await supabase
      .from("admin_users")
      .select("user_id");
    if (lookupError) return send(res, 502, { error: "Email admin tidak dapat diperiksa." });
    const adminIds = new Set((existingAdminRecords || []).map((admin) => admin.user_id));
    const { data: authUsers, error: authListError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authListError) return send(res, 502, { error: "Email admin tidak dapat diperiksa." });
    if ((authUsers.users || []).some((user) => adminIds.has(user.id) && String(user.email || "").toLowerCase() === email)) {
      return send(res, 409, { error: "Email tersebut sudah memiliki akses admin." });
    }
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    if (createError || !created.user) {
      console.error("Could not create admin:", createError?.message || "No user returned");
      return send(res, 400, { error: "Akun gagal dibuat. Email mungkin sudah terdaftar atau kata sandi ditolak Supabase." });
    }

    const { error: insertError } = await supabase.from("admin_users").insert({
      user_id: created.user.id,
      display_name: displayName,
    });
    if (insertError) {
      await supabase.auth.admin.deleteUser(created.user.id).catch(() => {});
      console.error("Could not register created admin:", insertError.message);
      return send(res, 502, { error: "Akun admin gagal dicatat dan pembuatan dibatalkan." });
    }

    return send(res, 201, { created: true, admin: { user_id: created.user.id, email, display_name: displayName } });
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

const { createHmac, timingSafeEqual, randomUUID } = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");

const COOKIE_NAME = "timpik_admin_session";
const BUCKET = "berita";
const MAX_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
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

async function readImage(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (req.body instanceof Uint8Array) return Buffer.from(req.body);
  if (typeof req.body === "string") return Buffer.from(req.body);

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const data = Buffer.from(chunk);
    size += data.length;
    if (size > MAX_BYTES) throw new Error("Ukuran gambar maksimal 4 MB.");
    chunks.push(data);
  }
  return Buffer.concat(chunks);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Metode tidak didukung." });
  }

  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32 || !hasValidSession(req, sessionSecret)) {
    return send(res, 401, { error: "Sesi admin tidak valid. Silakan masuk kembali." });
  }

  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return send(res, 503, { error: "Kunci Supabase server belum dikonfigurasi." });
  }

  const contentType = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  const extension = IMAGE_TYPES.get(contentType);
  if (!extension) return send(res, 415, { error: "Format gambar harus JPG, PNG, WebP, atau AVIF." });

  const declaredLength = Number(req.headers["content-length"] || 0);
  if (declaredLength > MAX_BYTES) return send(res, 413, { error: "Ukuran gambar maksimal 4 MB." });

  let image;
  try {
    image = await readImage(req);
  } catch (error) {
    return send(res, 413, { error: error.message || "Ukuran gambar maksimal 4 MB." });
  }
  if (!image.length) return send(res, 400, { error: "File gambar kosong." });
  if (image.length > MAX_BYTES) return send(res, 413, { error: "Ukuran gambar maksimal 4 MB." });

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: bucket, error: bucketError } = await supabase.storage.getBucket(BUCKET);
  if (bucketError || !bucket) {
    return send(res, 502, { error: "Bucket Supabase 'berita' tidak ditemukan atau tidak dapat diakses." });
  }
  if (!bucket.public) {
    return send(res, 409, { error: "Bucket 'berita' harus diatur sebagai public agar gambar tampil di website." });
  }

  const path = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, image, {
    contentType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError) {
    console.error("Supabase berita image upload failed:", uploadError.message);
    return send(res, 502, { error: "Gagal mengunggah gambar ke Supabase. Periksa konfigurasi bucket dan kunci server." });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return send(res, 201, { publicUrl: data.publicUrl, path });
};

# BUKU PANDUAN OPERASIONAL & SERAH TERIMA SISTEM
## Website Resmi & Sistem Pelayanan Administrasi Desa Timpik
*Kecamatan Susukan, Kabupaten Semarang, Provinsi Jawa Tengah*
*Disusun oleh Tim KKN untuk Pemerintah Desa Timpik*

---

## 1. Pendahuluan
Sistem Portal Desa Timpik dirancang dengan prinsip **Keamanan Tertinggi (Zero-Server Vulnerability)** dan **Kemudahan Pemeliharaan Mandiri**. Perangkat Desa tidak memerlukan keahlian koding untuk menjalankan operasional harian.

---

## 2. Alur Operasional Layanan Surat Warga (Harian)

Setiap kali warga mengajukan surat melalui Google Form:
1. **Pemeriksaan Data Masuk:**
   - Buka Google Sheets rekapitulasi formulir (tersimpan di Google Drive resmi desa).
   - Periksa lampiran foto KTP, KK, atau berkas pendukung.
2. **Pencetakan Surat di Balai Desa:**
   - Gunakan template baku surat di komputer kantor desa.
   - Bubuhkan tanda tangan Kepala Desa / Sekdes dan cap stempel basah.
3. **Pemberitahuan kepada Warga:**
   - Kirimkan pesan singkat WhatsApp ke nomor warga: *"Surat [Jenis Surat] atas nama [Nama Warga] telah selesai dan dapat diambil di Balai Desa Timpik pada jam pelayanan (Rp 0,-)."*
4. **Pembaruan Status Lacak (Tracking):**
   - Buka file data status tracking (`src/data/tracking.json` atau Google Sheets sinkronisasi) untuk mengubah status menjadi `"siap_diambil"`.

---

## 3. Alur Penanganan Aduan & Aspirasi Masyarakat
1. Seluruh aduan warga yang masuk via Google Form atau WhatsApp akan diverifikasi oleh **Kasi Pemerintahan** / **Kasi Pelayanan**.
2. Masalah fasilitas umum (jalan berlubang, lampu penerangan, debit irigasi sawah) segera diteruskan ke Kepala Dusun terkait (Bogo, Sumber, Krajan, atau Kencana) atau pengurus P3A Bogo Wastro.

---

## 4. Pembaruan Berita & Pengumuman Desa
Untuk menambahkan kabar atau dokumentasi kegiatan desa baru:
- Tambahkan entri baru pada file `src/data/berita.json`.
- Masukkan foto kegiatan ke folder `public/images/`.
- Format entri berita:
```json
{
  "id": "judul-kegiatan-desa",
  "judul": "Judul Berita Resmi",
  "kategori": "Pertanian & Agraris",
  "tanggal": "10 Nov 2026",
  "penulis": "Pemerintah Desa Timpik",
  "ringkasan": "Ringkasan berita singkat untuk ditampilkan di halaman depan...",
  "konten": "Isi lengkap berita kegiatan pembangunan atau kebudayaan...",
  "gambar": "/images/foto-kegiatan.jpg"
}
```

---

## 5. Kontak Penting Tim KKN untuk Konsultasi Teknis
Bila perangkat desa memerlukan asistensi lanjutan setelah penarikan mahasiswa KKN:
- **Dokumentasi Teknis:** Tersedia lengkap pada file `README.md` dan `PANDUAN_KKN_GOOGLE_FORM.md`.
- **Hosting & Domain:** Website ini dapat di-hosting selamanya secara gratis di **Cloudflare Pages** atau **Vercel** dengan domain resmi desa (misal: `desatimpik.id` atau `timpik.desa.id`).


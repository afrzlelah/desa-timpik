# Website Resmi Desa Timpik (Kecamatan Susukan, Kabupaten Semarang)
## Kolaborasi Pemerintah Desa Timpik & Tim KKN

Portal website resmi dan sistem layanan otomasi permohonan surat administrasi warga berbasis **Zero-Attack-Surface Jamstack (Astro + Tailwind CSS + Google Forms + Cloudflare Edge)**.

---

## 🌟 Fitur Utama Website

1. **Beranda & Profil Desa (Ref: Desa Rampunan)**
   * Menampilkan dokumentasi asli lapangan:
     * **Gapura Balai Desa Timpik** dengan patung wayang Punokawan (simbol pengayoman budaya).
     * **Kantor Balai Desa & Pendopo Pertemuan Warga**.
     * **Plang Totem 14 Kelembagaan Resmi Desa**.
   * Informasi demografi, letak wilayah agraris 243 Ha, dan jam kerja pelayanan.
2. **Katalog Layanan Otomasi Surat (Ref: FST Walisongo)**
   * Pencarian instan (*instant search*) tanpa *reload* halaman.
   * Filter kategori: *Semua*, *Kependudukan*, *Usaha & Ekonomi*, *Kesejahteraan Sosial*, *Izin & Rekomendasi*.
   * Rincian syarat berkas, kode surat resmi, estimasi waktu penyelesaian (1x24 jam), dan jaminan biaya **Rp 0,- (100% Gratis)**.
   * Tombol aksi langsung ke formulir **Google Form resmi** dengan keamanan Google Workspace.
   * Modal interaktif petunjuk berkas dan checklist dokumen warga.
3. **Potensi Desa (Agraris & Kebudayaan)**
   * Sektor Agraris: Persawahan 243 Ha, GAPOKTAN *"Putri Kencana"*, P3A *"Bogo Wastro"*, dan Lumbung Pangan Masyarakat (LPM).
   * Sektor Seni Tradisi: Wayang Orang (Badoyo) Dusun Bogo, Seni Karawitan Sekar Melati & Wedotomo, dan Kesenian Angguk Alhidayah Dusun Sumber.
4. **Kelembagaan Desa (14 Lembaga Sesuai Plang Lapangan)**
   * BPD, TP PKK, LPMD, PPDI, Karang Taruna Margo Ngudi Utomo, Satlinmas, BUMDes Makmur, Gapoktan Putri Kencana, P3A Bogo Wastro, Pokdarwis, Babinsa & Bhabinkamtibmas, Perpustakaan Sumber Ilmu, LPM Pangan, dan Kampung KB.

---

## 🛡️ Arsitektur Keamanan (Anti-Hacker / Anti-Judol)

* **Zero Dynamic Server Attack Surface:** Di-compile menjadi file statis murni (*Static Site Generation*). Tidak ada interpreter PHP (`.php`) yang bisa disusupi *WebShell* atau script judi online (*judol injection*), dan tidak ada direktori `/wp-admin` yang bisa di-*brute-force*.
* **Zero Database Vulnerability:** Tidak ada database MySQL di hosting publik sehingga mustahil terkena *SQL Injection*.
* **Google Cloud Security:** Seluruh pengajuan data pribadi KTP/KK warga ditangani langsung oleh formulir Google Form terenkripsi TLS 1.3 dan tersimpan di Google Drive/Sheets admin desa.
* **Keamanan HTTP Headers:** Dilengkapi meta security tags (*X-Content-Type-Options*, *X-XSS-Protection*, *Referrer-Policy*).

---

## 🚀 Panduan Menjalankan Proyek

### 1. Mode Pengembangan (Development Server)
```bash
npm run dev
```
Buka browser pada: `http://localhost:4321`

### 2. Kompilasi Produksi (Production Build)
```bash
npm run build
```
Hasil kompilasi siap saji berada di folder `dist/` (bisa langsung di-deploy gratis ke **Cloudflare Pages**, **Vercel**, atau **GitHub Pages**).

---

## 📝 Cara Anak KKN / Perangkat Desa Mengubah Link Google Form

Buka file [`src/data/surat.json`](file:///c:/Users/afrzl/Videos/Projekan/kkn_ubed/src/data/surat.json).  
Cari jenis surat yang diinginkan, lalu ubah kolom `"link_gform"` dengan URL formulir Google Form yang telah dibuat. Contoh:
```json
{
  "id": "sku",
  "nama": "Surat Keterangan Usaha (SKU)",
  "link_gform": "https://forms.gle/ContohLinkGformAsli"
}
```
Lalu jalankan `npm run build` kembali.


# Panduan Integrasi Google Form Layanan Surat Desa Timpik
## Khusus Rekan-Rekan Mahasiswa KKN & Operator Desa Timpik

Panduan ini disusun agar tim KKN dan perangkat Balai Desa Timpik dapat dengan mudah membuat dan menghubungkan formulir permohonan surat Google Form ke website resmi desa.

---

## 1. Standar Pertanyaan Google Form untuk Setiap Surat

Saat membuat Google Form baru di Google Drive desa/KKN, disarankan menyertakan kolom pertanyaan dengan struktur berikut:

1. **Nama Lengkap Pemohon** *(Jawaban Singkat - Wajib)*
2. **Nomor Induk Kependudukan (NIK)** *(Jawaban Singkat - Wajib, setel validasi angka 16 digit)*
3. **Nomor Kartu Keluarga (KK)** *(Jawaban Singkat - Wajib, setel validasi angka 16 digit)*
4. **Tempat & Tanggal Lahir** *(Jawaban Singkat - Wajib)*
5. **Jenis Kelamin** *(Pilihan Ganda: Laki-laki / Perempuan - Wajib)*
6. **Agama** *(Pilihan Ganda - Wajib)*
7. **Pekerjaan** *(Jawaban Singkat - Wajib)*
8. **Alamat Lengkap Dusun di Desa Timpik** *(Pilihan Ganda / Dropdown: Dusun Bogo, Dusun Sumber, Dusun Timpik Krajan, Dusun Kencana - Wajib)*
9. **Nomor WhatsApp Aktif Pemohon** *(Jawaban Singkat - Wajib, untuk konfirmasi pengambilan surat)*
10. **Tujuan / Keperluan Surat** *(Paragraf - Wajib, misal: Untuk pengajuan KUR BRI, Persyaratan pendaftaran sekolah, dll)*
11. **Unggah Foto KTP Asli** *(Upload File - Wajib, format gambar/PDF, maks 5 MB)*
12. **Unggah Foto Kartu Keluarga (KK)** *(Upload File - Wajib, format gambar/PDF, maks 5 MB)*
13. **Unggah Foto Surat Pengantar RT/RW** *(Upload File - Wajib, format gambar/PDF, maks 5 MB)*
14. *(Khusus SKU)* **Unggah Foto Tempat / Komoditas Usaha** *(Upload File)*

---

## 2. Cara Menghubungkan Link Google Form ke Website

1. Buka formulir Google Form yang sudah dibuat di browser.
2. Klik tombol **Kirim** (Send) di pojok kanan atas.
3. Pilih tab **Tautan** (ikon rantai), centang *Perpendek URL* (Shorten URL), lalu klik **Salin** (Copy). Contoh: `https://forms.gle/xYz12345`.
4. Buka file [`src/data/surat.json`](file:///c:/Users/afrzl/Videos/Projekan/kkn_ubed/src/data/surat.json) di text editor / VS Code.
5. Cari jenis surat yang sesuai (misal SKU, SKD, SKCK, SKTM) dan ganti nilai `"link_gform"` dengan tautan yang disalin tadi:
   ```json
   {
     "id": "sku",
     "nama": "Surat Keterangan Usaha (SKU)",
     "link_gform": "https://forms.gle/xYz12345"
   }
   ```
6. Simpan file (`Ctrl + S`), lalu jalankan `npm run build` untuk mengompilasi pembaruan.

---

## 3. Rekomendasi Notifikasi Otomatis ke Petugas Balai Desa

Agar perangkat desa langsung tahu saat ada warga yang mengajukan surat:
1. Di Google Form, buka tab **Tanggapan (Responses)**.
2. Klik ikon titik tiga di kanan atas tab Tanggapan.
3. Pilih **"Dapatkan notifikasi email untuk tanggapan baru"**.
4. Masukkan email resmi desa (`desatimpik.susukan@gmail.com`) agar setiap permohonan baru langsung masuk ke inbox petugas desa.
5. Klik **"Tautkan ke Spreadsheet"** agar rekap seluruh warga yang mengajukan surat rapi dalam satu file Excel / Google Sheets secara otomatis seumur hidup.


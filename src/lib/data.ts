import beritaData from '../data/berita.json';
import kelembagaanData from '../data/kelembagaan.json';
import potensiData from '../data/potensi.json';
import profilData from '../data/profil.json';
import suratData from '../data/surat.json';
import agendaData from '../data/agenda.json';

export interface Berita {
  id: string;
  judul: string;
  kategori: string;
  tanggal: string;
  penulis: string;
  dusun_id?: string;
  lembaga_id?: string;
  ringkasan: string;
  konten: string;
  gambar: string;
  tag: string;
}

export interface Dusun {
  id: string;
  nama: string;
  panggilan: string;
  deskripsi: string;
  kepala_dusun: string;
  potensi_utama: string;
  jumlah_rt: string;
  jumlah_penduduk?: string;
  luas?: string;
}

export interface Lembaga {
  id: string;
  nama: string;
  singkatan: string;
  kategori: string;
  dusun_terkait?: string;
  surat_terkait?: string[];
  deskripsi: string;
  fokus: string[];
}

export interface Surat {
  id: string;
  nama: string;
  kategori: string;
  kode: string;
  lembaga_terkait?: string[];
  deskripsi: string;
  syarat: string[];
  waktu_proses: string;
  biaya: string;
  link_gform: string;
  badge_color?: string;
}

// 1. DATA ACCESS & RELATIONS FOR BERITA
export function getAllBerita(): Berita[] {
  return beritaData;
}

export function getBeritaById(id: string): (Berita & { dusun?: Dusun; lembaga?: Lembaga; relatedBerita: Berita[] }) | null {
  const berita = beritaData.find(b => b.id === id);
  if (!berita) return null;

  const dusun = profilData.dusun.find(d => d.id === berita.dusun_id);
  const lembaga = kelembagaanData.find(l => l.id === berita.lembaga_id);
  const relatedBerita = beritaData.filter(b => b.id !== id && (b.kategori === berita.kategori || b.dusun_id === berita.dusun_id)).slice(0, 3);

  return {
    ...berita,
    dusun,
    lembaga,
    relatedBerita
  };
}

// 2. DATA ACCESS & RELATIONS FOR DUSUN
export function getAllDusun(): Dusun[] {
  return profilData.dusun;
}

export function getDusunById(id: string): (Dusun & { beritaList: Berita[]; lembagaList: Lembaga[]; relatedPotensi: any }) | null {
  const dusun = profilData.dusun.find(d => d.id === id);
  if (!dusun) return null;

  const beritaList = beritaData.filter(b => b.dusun_id === id);
  const lembagaList = kelembagaanData.filter(l => l.dusun_terkait === id);
  
  // Potential linkage
  let relatedPotensi = null;
  if (id === 'bogo') {
    relatedPotensi = potensiData.kebudayaan.kesenian.find(k => k.nama.includes('Wayang'));
  } else if (id === 'sumber') {
    relatedPotensi = potensiData.kebudayaan.kesenian.find(k => k.nama.includes('Angguk'));
  } else if (id === 'kencana') {
    relatedPotensi = potensiData.agraris.komoditas_utama.find(k => k.nama.includes('Lumbung'));
  }

  return {
    ...dusun,
    beritaList,
    lembagaList,
    relatedPotensi
  };
}

// 3. DATA ACCESS & RELATIONS FOR KELEMBAGAAN
export function getAllLembaga(): Lembaga[] {
  return kelembagaanData;
}

export function getLembagaById(id: string): (Lembaga & { dusun?: Dusun; suratList: Surat[]; beritaList: Berita[] }) | null {
  const lembaga = kelembagaanData.find(l => l.id === id);
  if (!lembaga) return null;

  const dusun = profilData.dusun.find(d => d.id === lembaga.dusun_terkait);
  const suratList = suratData.filter(s => lembaga.surat_terkait?.includes(s.id) || s.lembaga_terkait?.includes(id));
  const beritaList = beritaData.filter(b => b.lembaga_id === id);

  return {
    ...lembaga,
    dusun,
    suratList,
    beritaList
  };
}

// 4. DATA ACCESS & RELATIONS FOR SURAT
export function getAllSurat(): Surat[] {
  return suratData;
}

export function getSuratById(id: string): (Surat & { lembagaList: Lembaga[]; relatedSurat: Surat[] }) | null {
  const surat = suratData.find(s => s.id === id);
  if (!surat) return null;

  const lembagaList = kelembagaanData.filter(l => surat.lembaga_terkait?.includes(l.id));
  const relatedSurat = suratData.filter(s => s.id !== id && s.kategori === surat.kategori).slice(0, 3);

  return {
    ...surat,
    lembagaList,
    relatedSurat
  };
}

// 5. UNIFIED SEARCH FUNCTION
export interface SearchResult {
  title: string;
  type: 'Surat' | 'Berita' | 'Dusun' | 'Lembaga' | 'Agenda' | 'Halaman';
  description: string;
  url: string;
  badge: string;
}

export function searchAll(query: string): SearchResult[] {
  if (!query) return [];
  const q = query.toLowerCase().trim();
  const results: SearchResult[] = [];

  // Search Surat
  suratData.forEach(s => {
    if (s.nama.toLowerCase().includes(q) || s.deskripsi.toLowerCase().includes(q) || s.kode.toLowerCase().includes(q)) {
      results.push({
        title: s.nama,
        type: 'Surat',
        description: s.deskripsi,
        url: `/layanan-surat/${s.id}`,
        badge: s.kategori
      });
    }
  });

  // Search Berita
  beritaData.forEach(b => {
    if (b.judul.toLowerCase().includes(q) || b.ringkasan.toLowerCase().includes(q) || b.tag.toLowerCase().includes(q)) {
      results.push({
        title: b.judul,
        type: 'Berita',
        description: b.ringkasan,
        url: `/berita/${b.id}`,
        badge: b.kategori
      });
    }
  });

  // Search Agenda
  agendaData.forEach(a => {
    if (a.nama.toLowerCase().includes(q) || a.deskripsi.toLowerCase().includes(q) || a.lokasi.toLowerCase().includes(q)) {
      results.push({
        title: a.nama,
        type: 'Agenda',
        description: `${a.tanggal} • ${a.lokasi}`,
        url: `/info-desa#agenda`,
        badge: a.kategori
      });
    }
  });

  // Search Dusun
  profilData.dusun.forEach(d => {
    if (d.nama.toLowerCase().includes(q) || d.deskripsi.toLowerCase().includes(q) || d.potensi_utama.toLowerCase().includes(q)) {
      results.push({
        title: d.nama,
        type: 'Dusun',
        description: d.deskripsi,
        url: `/dusun/${d.id}`,
        badge: d.potensi_utama
      });
    }
  });

  // Search Lembaga
  kelembagaanData.forEach(l => {
    if (l.nama.toLowerCase().includes(q) || l.singkatan.toLowerCase().includes(q) || l.deskripsi.toLowerCase().includes(q)) {
      results.push({
        title: `${l.singkatan} - ${l.nama}`,
        type: 'Lembaga',
        description: l.deskripsi,
        url: `/kelembagaan/${l.id}`,
        badge: l.kategori
      });
    }
  });

  // Search Special Pages
  if ('info desa pengumuman maklumat'.includes(q)) {
    results.push({
      title: 'Pusat Informasi & Pengumuman Desa',
      type: 'Halaman',
      description: 'Pengumuman resmi balai desa, jam pelayanan, dan agenda kegiatan',
      url: '/info-desa',
      badge: 'Portal Resmi'
    });
  }

  if ('transparansi apbdes anggaran keuangan dana desa'.includes(q)) {
    results.push({
      title: 'Transparansi APBDes & Realisasi Anggaran 2026',
      type: 'Halaman',
      description: 'Laporan keterbukaan penerimaan dan belanja pembangunan fisik irigasi',
      url: '/transparansi',
      badge: 'Akuntabilitas'
    });
  }

  if ('kontak telepon wa whatsapp darurat ambulans bidan babinsa'.includes(q)) {
    results.push({
      title: 'Kontak & Hotline Darurat Balai Desa',
      type: 'Halaman',
      description: 'Nomor telepon pelayanan, ambulans desa 24 jam, bidan desa, dan babinsa',
      url: '/kontak',
      badge: 'Kontak Resmi'
    });
  }

  return results;
}


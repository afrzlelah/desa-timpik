import type { APIRoute } from 'astro';
import berita from '../data/berita.json';
import kelembagaan from '../data/kelembagaan.json';
import surat from '../data/surat.json';

const publicPaths = [
  '/',
  '/profil',
  '/pemerintahan',
  '/kelembagaan',
  '/potensi',
  '/info-desa',
  '/statistik',
  '/transparansi',
  '/agenda',
  '/peta-desa',
  '/kontak',
  '/berita',
  '/layanan-surat',
  '/layanan-surat/pengantar-rt',
  ...kelembagaan.map((item) => `/kelembagaan/${encodeURIComponent(item.id)}`),
  ...surat.map((item) => `/layanan-surat/${encodeURIComponent(item.id)}`),
  ...berita.map((item) => `/berita/${encodeURIComponent(item.id)}`),
];

const escapeXml = (value: string) => value.replace(/[<>&"']/g, (char) => ({
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  "'": '&apos;',
})[char] || char);

export const GET: APIRoute = ({ site }) => {
  const origin = site?.origin || 'https://desatimpik.id';
  const urls = [...new Set(publicPaths)].map((path) => {
    const location = new URL(path, origin).href;
    return `<url><loc>${escapeXml(location)}</loc></url>`;
  }).join('');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};

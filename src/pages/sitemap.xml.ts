import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import berita from '../data/berita.json';
import kelembagaan from '../data/kelembagaan.json';
import surat from '../data/surat.json';

const staticPaths = [
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
  ...kelembagaan.map((item) => '/kelembagaan/' + encodeURIComponent(item.id)),
  ...surat.map((item) => '/layanan-surat/' + encodeURIComponent(item.id)),
  ...berita.map((item) => '/berita/' + encodeURIComponent(item.id)),
];

const escapeXml = (value: string) => value.replace(/[<>&"']/g, (char) => ({
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  "'": '&apos;',
})[char] || char);

export const GET: APIRoute = async ({ site }) => {
  const origin = site?.origin || 'https://desatimpik.id';
  const publicPaths = new Set(staticPaths);
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseKey = import.meta.env.PUBLIC_SUPABASE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await supabase
        .from('site_content')
        .select('content_key,data')
        .in('content_key', ['berita', 'kelembagaan', 'profil', 'surat']);
      if (error) throw error;

      for (const row of data || []) {
        const content = row.data;
        if (row.content_key === 'berita' && Array.isArray(content)) {
          for (const item of content) if (item?.id) publicPaths.add('/berita/' + encodeURIComponent(String(item.id)));
        }
        if (row.content_key === 'kelembagaan' && Array.isArray(content)) {
          for (const item of content) if (item?.id) publicPaths.add('/kelembagaan/' + encodeURIComponent(String(item.id)));
        }
        if (row.content_key === 'surat' && Array.isArray(content)) {
          for (const item of content) if (item?.id) publicPaths.add('/layanan-surat/' + encodeURIComponent(String(item.id)));
        }
        if (row.content_key === 'profil' && Array.isArray(content?.dusun)) {
          for (const item of content.dusun) if (item?.id) publicPaths.add('/dusun/' + encodeURIComponent(String(item.id)));
        }
      }
    } catch (error) {
      console.warn('Sitemap memakai daftar statis karena data Supabase tidak dapat dimuat.', error);
    }
  }

  const urls = [...publicPaths].map((path) => {
    const location = new URL(path, origin).href;
    return '<url><loc>' + escapeXml(location) + '</loc></url>';
  }).join('');

  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls + '</urlset>',
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};

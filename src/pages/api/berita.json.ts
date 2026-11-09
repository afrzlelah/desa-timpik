import type { APIRoute } from 'astro';
import { getAllBerita } from '../../lib/data';

export const GET: APIRoute = async () => {
  const berita = getAllBerita();

  return new Response(JSON.stringify({
    success: true,
    total: berita.length,
    data: berita
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};


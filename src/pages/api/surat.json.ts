import type { APIRoute } from 'astro';
import { getAllSurat } from '../../lib/data';

export const GET: APIRoute = async () => {
  const surat = getAllSurat();

  return new Response(JSON.stringify({
    success: true,
    total: surat.length,
    data: surat
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};


import type { APIRoute } from 'astro';
import { getAllDusun } from '../../lib/data';

export const GET: APIRoute = async () => {
  const dusun = getAllDusun();

  return new Response(JSON.stringify({
    success: true,
    total: dusun.length,
    data: dusun
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};


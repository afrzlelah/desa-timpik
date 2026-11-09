import type { APIRoute } from 'astro';
import { searchAll } from '../../lib/data';

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get('q') || '';
  const results = searchAll(query);

  return new Response(JSON.stringify({
    success: true,
    query,
    total: results.length,
    data: results
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};


import type { APIRoute } from 'astro';
import profilData from '../../data/profil.json';

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({
    success: true,
    data: {
      statistik: profilData.statistik,
      transparansi: profilData.transparansi_apbdes,
      dusun: profilData.dusun
    }
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};


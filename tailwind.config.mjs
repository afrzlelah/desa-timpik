/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        civic: {
          navy: '#0B1E36',       /* Elegant deep sovereign navy */
          blue: '#1D4ED8',       /* Elegant vibrant sapphire/royal blue */
          royal: '#1E40AF',      /* Classic royal blue */
          sky: '#0284C7',        /* Crisp sky blue accent */
          lightBlue: '#EFF6FF',  /* Soft ice blue highlight */
          cream: '#F8FAFC',      /* Clean cool crisp off-white */
          sand: '#F1F5F9',       /* Crisp cool slate-100 background */
          border: '#E2E8F0',     /* Elegant clean hairline divider */
          borderLight: '#F1F5F9',
          forest: '#1E3A8A',     /* Elegant dark navy accent */
          forestLight: '#EFF6FF',
          gold: '#0284C7',       /* Replaced warm brown with refined ocean sapphire blue */
          goldLight: '#F0F9FF',
          crimson: '#BE123C',    /* Emergency crimson */
          ink: '#0F172A',        /* Crisp high-contrast reading text */
          muted: '#64748B'       /* Crisp secondary slate text */
        },
        desa: {
          dark: '#0B1E36',
          navy: '#0B1E36',
          blue: '#1D4ED8',
          primary: '#1D4ED8',
          light: '#F8FAFC',
          accent: '#0284C7',
          gold: '#0284C7',
          cream: '#FFFFFF'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Newsreader"', 'Merriweather', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      }
    },
  },
  plugins: [],
}

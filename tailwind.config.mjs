/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  safelist: [
    'hero-card',
    'service-card',
    'testimonial-card',
    'process-circle',
    'nav-link',
    'btn-gold',
    'btn-burgundy',
    'about-card',
    'stat-item',
    'cred-dot',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1C2456',
          light: '#2A3470',
        },
        crimson: {
          DEFAULT: '#8B1A1A',
          mid: '#A0272A',
          soft: '#C0393C',
        },
        gold: {
          DEFAULT: '#C4973A',
          light: '#F0D9A8',
          pale: '#FAF3E0',
        },
        cream: '#FAF7F2',
        warmgray: '#F4F1EB',
        textdark: '#1A1A2E',
        textmuted: '#5C5C7A',
        footer: '#111827',
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        content: '1200px',
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
      },
    },
  },
  plugins: [],
};

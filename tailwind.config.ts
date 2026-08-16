import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0B1220',
        surface: '#141B2D',
        'surface-alt': '#1C2439',
        border: '#2A3352',
        primary: '#5B8DEF',
        'primary-muted': '#2E4E8F',
        text: '#F4F6FB',
        'text-muted': '#8B94AD',
        danger: '#EF5B5B',
        success: '#3BC17A',
        'bubble-outgoing': '#5B8DEF',
        'bubble-incoming': '#1C2439',
      },
    },
  },
  plugins: [],
};

export default config;

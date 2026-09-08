import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        risk: {
          low: '#16a34a',
          medium: '#d97706',
          high: '#dc2626',
        },
        chakra: { DEFAULT: '#0B3D7A', 700: '#082a57' }, // Ashoka Chakra navy — primary brand color
        saffron: { DEFAULT: '#FF9933', 700: '#B36200' }, // flag saffron; 700 for text, DEFAULT for bars/backgrounds only
        indiagreen: { DEFAULT: '#138808', 700: '#0c5c05' }, // flag green
      },
    },
  },
  plugins: [],
};

export default config;

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
        saffron: { DEFAULT: '#FF9933', 700: '#B36200', 800: '#8A4B00' }, // primary action colour; 700 = button bg / text (AA on white), 800 = hover, DEFAULT = strip/bars only (fails AA for text)
        chakra: { DEFAULT: '#0B3D7A', 700: '#082a57' }, // navy — secondary accent: brand wheel, field icons, link hover, hairlines
        indiagreen: { DEFAULT: '#138808', 700: '#0c5c05' }, // flag green
      },
    },
  },
  plugins: [],
};

export default config;

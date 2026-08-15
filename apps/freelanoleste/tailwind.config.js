import preset from '../../packages/ui/tailwind.preset.js';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        marquee: 'marquee 32s linear infinite',
        'marquee-reverse': 'marquee 40s linear infinite reverse',
      },
    },
  },
};

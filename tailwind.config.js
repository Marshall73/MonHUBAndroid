/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: require('./src/theme.json'),
      fontSize: {
        'screen-title': ['32px', '38px'],
        'item-title': ['18px', '23px'],
        'section-title': ['20px', '26px'],
      },
    },
  },
};

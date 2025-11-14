/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#2444bc',
        secondary: '#44B44C',
        accent: '#555',
      },
    },
  },
  plugins: [],
};

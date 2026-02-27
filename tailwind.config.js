/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        danceBob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        dance: {
          '0%': { transform: 'translateY(0) scaleX(1)' },
          '25%': { transform: 'translateY(-8px) scaleX(1)' },
          '50%': { transform: 'translateY(0) scaleX(-1)' },
          '75%': { transform: 'translateY(-8px) scaleX(-1)' },
          '100%': { transform: 'translateY(0) scaleX(1)' },
        },
        guitarSwing: {
          '0%, 100%': { transform: 'rotate(-15deg)' },
          '50%': { transform: 'rotate(15deg)' },
        },
      },
      animation: {
        'dance-bob': 'danceBob 1.3s ease-in-out infinite',
        'dance': 'dance 0.6s ease-in-out infinite',
        'guitar-swing': 'guitarSwing 0.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

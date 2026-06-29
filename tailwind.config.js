/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      transitionTimingFunction: {
        spring: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  safelist: [
    "animate-fade-in",
    "animate-slide-up",
    "animate-scale-in",
    "stagger-children",
    "skeleton",
  ],
  plugins: [require('@tailwindcss/typography')],
}


/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F172A",
        mist: "#F8FAFC",
        brand: {
          50: "#EEF8FF",
          100: "#D5EDFF",
          500: "#1D9BF0",
          600: "#0E7DD3",
          700: "#0A5C9C",
        },
        coral: "#FF7A59",
        gold: "#F6C453",
        pine: "#1E6F5C",
      },
      boxShadow: {
        panel: "0 20px 45px rgba(15, 23, 42, 0.08)",
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "'Noto Sans SC'", "sans-serif"],
      },
      backgroundImage: {
        "soft-grid":
          "linear-gradient(rgba(148, 163, 184, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.12) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

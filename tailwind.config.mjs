/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          canvas: "var(--studio-canvas)",
        },
        ink: {
          onyx: "var(--ink-onyx)",
        },
        text: {
          muted: "var(--text-muted)",
        },
        card: {
          solid: "var(--card-bg-solid)",
          hover: "var(--card-bg-hover)",
        },
        border: {
          ultra: "var(--border-ultra-thin)",
          hover: "var(--border-thin-hover)",
        },
        terminal: {
          bg: "var(--dark-terminal-bg)",
          border: "var(--dark-terminal-border)",
          text: "var(--dark-terminal-text)",
        },
      },
      boxShadow: {
        luxury: "var(--shadow-luxury-xs)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};

export default config;
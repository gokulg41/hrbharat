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
        surface: {
          canvas: "var(--surface-canvas)",
          card: "var(--surface-card)",
          "card-hover": "var(--surface-card-hover)",
        },
        ink: {
          900: "var(--ink-900)",
          600: "var(--ink-600)",
          400: "var(--ink-400)",
        },
        brand: {
          DEFAULT: "var(--brand-primary)",
          hover: "var(--brand-primary-hover)",
          subtle: "var(--brand-primary-subtle)",
        },
        border: {
          subtle: "var(--border-subtle)",
          hover: "var(--border-hover)",
        },
        status: {
          success: "var(--status-success)",
          "success-bg": "var(--status-success-bg)",
          warning: "var(--status-warning)",
          "warning-bg": "var(--status-warning-bg)",
          danger: "var(--status-danger)",
          "danger-bg": "var(--status-danger-bg)",
        },
      },
      boxShadow: {
        card: "var(--shadow-card)",
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

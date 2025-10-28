import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#f6a76e",
          dark: "#e58b49"
        }
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "Noto Sans",
          "sans-serif"
        ]
      },
      boxShadow: {
        card: "0 12px 24px -16px rgba(0, 0, 0, 0.25)"
      }
    }
  },
  plugins: []
};

export default config;

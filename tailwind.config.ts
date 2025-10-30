import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        app: { bg: "#0e0e12", card: "#0f0f15" },
        accent: {
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5"
        }
      },
      boxShadow: {
        "indigo-soft": "0 8px 24px -12px rgba(99,102,241,0.35)",
        modal: "0 10px 60px -10px rgba(99,102,241,0.25)"
      },
      borderRadius: { "2xl": "1.25rem" },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: { "fade-in-up": "fade-in-up 700ms ease-out both" }
    }
  },
  plugins: []
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-primary, #070b14)",
        foreground: "var(--text-primary, #f8fafc)",
        navy: {
          950: "#070b14",
          900: "#0b1120",
          850: "#0f172a",
          800: "#131e36",
          700: "#1a2948",
          600: "#243862",
        },
        cyan: {
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
        },
        violet: {
          500: "#8b5cf6",
          600: "#7c3aed",
        },
        accent: {
          cyan: "#00e5ff",
          blue: "#3b82f6",
          violet: "#a855f7",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius, 0.75rem)",
        md: "calc(var(--radius, 0.75rem) - 2px)",
        sm: "calc(var(--radius, 0.75rem) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;

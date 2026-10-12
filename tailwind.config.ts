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
        background: "var(--bg-primary)",
        foreground: "var(--text-primary)",
        theme: {
          main: "var(--bg-primary)",
          surface: "var(--bg-secondary)",
          elevated: "var(--bg-elevated)",
          sidebar: "var(--bg-sidebar)",
          card: "var(--bg-card)",
          border: "var(--border)",
          text: "var(--text-primary)",
          muted: "var(--text-muted)",
          accent: "var(--accent-primary)",
        },
        navy: {
          950: "var(--bg-primary)",
          900: "var(--bg-secondary)",
          850: "var(--bg-elevated)",
          800: "var(--bg-elevated)",
          700: "var(--border)",
          600: "var(--border-focus)",
        },
        cyan: {
          400: "var(--accent-primary)",
          500: "var(--accent-hover)",
          600: "var(--accent-secondary)",
        },
        violet: {
          500: "var(--accent-secondary)",
          600: "var(--accent-tertiary)",
        },
        accent: {
          cyan: "var(--accent-primary)",
          blue: "var(--accent-tertiary)",
          violet: "var(--accent-secondary)",
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

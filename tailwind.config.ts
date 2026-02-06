import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontSize: {
        // A simple, token-ish type scale (used by new UI primitives)
        xs: ["0.75rem", { lineHeight: "1.1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.85rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.75rem" }],
      },
      spacing: {
        // Space tokens (opt-in). Example: className="p-ct-4" not needed; use p-4 etc.
        // Keeping here for a gradual migration.
        "ct-1": "0.25rem",
        "ct-2": "0.5rem",
        "ct-3": "0.75rem",
        "ct-4": "1rem",
        "ct-5": "1.25rem",
        "ct-6": "1.5rem",
      },
      colors: {
        ct: {
          bg: "var(--ct-bg)",
          panel: "var(--ct-panel)",
          surface: "var(--ct-surface)",
          border: "var(--ct-border)",
          text: "var(--ct-text)",
          muted: "var(--ct-muted)",
          accent: "var(--ct-accent)",
          accent2: "var(--ct-accent-2)",
          ok: "var(--ct-ok)",
          bad: "var(--ct-bad)",
        },
      },
      borderRadius: {
        ct: "var(--ct-radius)",
      },
      boxShadow: {
        ct: "0 18px 60px rgba(0,0,0,.45)",
      },
    },
  },
  plugins: [],
};

export default config;

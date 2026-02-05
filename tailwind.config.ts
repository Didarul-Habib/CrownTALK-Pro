import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
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

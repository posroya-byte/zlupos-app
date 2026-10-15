import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        zlupos: {
          cyan: "#00E5FF",
          cyanDark: "#00C8FF",
          purple: "#6C38FF",
          purpleDark: "#4C1D95",
          bgDark: "#0B0F19",
          cardDark: "#161F33",
          borderDark: "#222F47",
        },
        ink: "var(--ink)",
        muted: "var(--muted)",
        paper: "var(--paper)",
        surface: "var(--surface)",
        line: "var(--line)",
        brand: "var(--green)",
        "brand-dark": "var(--green-dark)",
        lime: "var(--lime)",
        coral: "var(--coral)",
      },
      fontFamily: {
        sans: ["var(--font-cairo)", "Tahoma", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
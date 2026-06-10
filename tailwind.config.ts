import type { Config } from "tailwindcss";

// Tokens mirror DESIGN.md §2–4. Components reference these, never raw hex.
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#0B0B0F",
        surface: "#131319",
        inset: "#0D0D12",
        line: "#24242F",
        line2: "#2C2C3A",
        line3: "#3A3A4A",
        fg: "#F2F2F6",
        fg2: "#D7D7E2",
        muted: "#A6A6B6",
        subtle: "#76767F",
        faint: "#5B5B68",
        accent: "#7C3AED",
        "accent-fg": "#A78BFA",
        "accent-2": "#22D3EE",
        success: "#34C759",
        danger: "#FF453A",
        warning: "#FFB020",
        // legacy alias kept so existing `brand`/`brand-fg` classes resolve
        brand: { DEFAULT: "#7C3AED", fg: "#A78BFA" },
      },
      borderRadius: {
        sm: "10px",
        md: "14px",
        lg: "20px",
        xl: "28px",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
      },
      boxShadow: {
        glow: "0 8px 30px rgba(124,58,237,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;

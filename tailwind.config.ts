import type { Config } from "tailwindcss";

// Tokens mirror DESIGN.md. Components reference these, never raw hex.
// "Quiet studio" palette: warm near-black, off-white ink, one coral accent.
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#0A0A0B",
        surface: "#141416",
        inset: "#0F0F11",
        line: "#222225",
        line2: "#2B2B2F",
        line3: "#3A3A3F",
        fg: "#ECEAE6",
        fg2: "#C7C5C0",
        muted: "#8B8A86",
        subtle: "#69696A",
        faint: "#4D4D4C",
        accent: "#FF5C38",
        "accent-fg": "#FF8A6B",
        "accent-2": "#22D3EE",
        success: "#34C759",
        danger: "#FF453A",
        warning: "#FFB020",
        // legacy alias → now the coral accent (existing brand/* classes re-skin)
        brand: { DEFAULT: "#FF5C38", fg: "#FF8A6B" },
      },
      borderRadius: {
        sm: "8px",
        md: "10px",
        lg: "14px",
        xl: "16px",
        "2xl": "14px",
        "3xl": "18px",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
      },
      boxShadow: {
        glow: "0 6px 24px rgba(255,92,56,0.22)",
      },
    },
  },
  plugins: [],
};

export default config;

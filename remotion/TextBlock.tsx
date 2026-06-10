import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "./fonts";
import { textEmphasisStyle, punchStyle } from "./animations";
import type { PlanTheme, SceneEffect } from "./planTypes";

interface TextBlockProps {
  screenText: string;
  narration?: string;
  accent: string;
  text: string;
  mutedText: string;
  emphasis: "highlight" | "scale" | "underline" | "none";
  safeArea: number;
  theme: PlanTheme;
  kickerText: string;
  effect: SceneEffect;
}

/**
 * Main on-screen text, driven by the design theme's typography + layout.
 * Stays mobile-readable: headline scales down for longer strings.
 */
export const TextBlock: React.FC<TextBlockProps> = ({
  screenText,
  narration,
  accent,
  text,
  mutedText,
  emphasis,
  safeArea,
  theme,
  kickerText,
  effect,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const { typography: typo, layout } = theme;
  // A director-set punch effect overrides the theme's default text emphasis.
  const emph =
    effect && effect !== "none"
      ? punchStyle(frame, fps, effect)
      : textEmphasisStyle(frame, fps, emphasis);

  const len = screenText.length;
  const base = width * 0.11 * typo.headlineScale;
  const headlineSize = Math.max(
    width * 0.05,
    base - Math.max(0, len - 8) * (width * 0.0035),
  );

  const isLeft = layout.align === "left";
  const isBottom = layout.align === "bottom";
  const highlight = emphasis === "highlight";

  const glowShadow =
    layout.glow > 0 ? `0 8px ${40 * layout.glow}px ${accent}${hexAlpha(layout.glow)}` : "none";

  const outlineStyle: React.CSSProperties = layout.outline
    ? {
        color: "transparent",
        WebkitTextStroke: `${Math.max(2, width * 0.003)}px ${accent}`,
        textShadow: `0 0 ${18 * Math.max(0.4, layout.glow)}px ${accent}, 0 0 ${36 * Math.max(0.4, layout.glow)}px ${accent}aa`,
      }
    : { color: text, textShadow: glowShadow };

  const container: React.CSSProperties = {
    position: "absolute",
    left: safeArea,
    right: safeArea,
    display: "flex",
    flexDirection: "column",
    gap: width * 0.022,
    alignItems: isLeft || isBottom ? "flex-start" : "center",
    textAlign: isLeft || isBottom ? "left" : "center",
    fontFamily: fontFamily(typo.fontId),
    ...(isBottom
      ? { bottom: safeArea * 1.4 }
      : { top: "50%", transform: "translateY(-50%)" }),
  };

  return (
    <div style={container}>
      {layout.kicker && kickerText ? (
        <div
          style={{
            fontSize: width * 0.026,
            fontWeight: 700,
            letterSpacing: 4,
            color: accent,
            textTransform: "uppercase",
          }}
        >
          {kickerText}
        </div>
      ) : null}

      {layout.accentBar ? (
        <div
          style={{
            width: width * 0.16,
            height: Math.max(8, width * 0.012),
            background: accent,
            borderRadius: 999,
            marginBottom: width * 0.01,
          }}
        />
      ) : null}

      {layout.decoration === "rules" ? (
        <div style={{ width: "42%", height: 2, background: `${accent}99` }} />
      ) : null}

      <div
        style={{
          fontSize: headlineSize,
          lineHeight: 1.1,
          fontWeight: typo.weightHeadline,
          letterSpacing: typo.letterSpacing,
          fontStyle: typo.italic ? "italic" : "normal",
          textTransform: typo.upper ? "uppercase" : "none",
          transform: emph.transform,
          ...(highlight
            ? {
                background: accent,
                color: pickReadable(accent),
                padding: "0.08em 0.28em",
                borderRadius: 14,
                boxDecorationBreak: "clone",
                WebkitBoxDecorationBreak: "clone",
              }
            : outlineStyle),
        }}
      >
        {screenText}
      </div>

      {layout.decoration === "underline" ? (
        <div style={{ width: width * 0.22, height: 5, background: accent, borderRadius: 999 }} />
      ) : null}
      {layout.decoration === "rules" ? (
        <div style={{ width: "42%", height: 2, background: `${accent}99` }} />
      ) : null}

      {narration ? (
        <div
          style={{
            fontSize: width * 0.031,
            lineHeight: 1.42,
            fontWeight: 500,
            color: mutedText,
            maxWidth: isLeft || isBottom ? "94%" : "90%",
          }}
        >
          {narration}
        </div>
      ) : null}
    </div>
  );
};

/** 0..1 glow → 2-digit hex alpha for color suffix. */
function hexAlpha(glow: number): string {
  const a = Math.round(Math.min(1, Math.max(0, glow)) * 0x66);
  return a.toString(16).padStart(2, "0");
}

/** Choose black/white text for a highlight chip based on accent luminance. */
function pickReadable(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#fff";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0A0A0A" : "#FFFFFF";
}

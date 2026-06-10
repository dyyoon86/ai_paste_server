import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { koreanFontFamily } from "./fonts";
import { textEmphasisStyle } from "./animations";
import type { TextEmphasis } from "./planTypes";

interface TextBlockProps {
  screenText: string;
  narration?: string;
  accent: string;
  text: string;
  mutedText: string;
  emphasis: TextEmphasis;
  safeArea: number;
}

/**
 * Main on-screen text. Sizing scales with composition width to stay mobile
 * readable (render_notes: "Keep all text within mobile safe area.").
 */
export const TextBlock: React.FC<TextBlockProps> = ({
  screenText,
  narration,
  accent,
  text,
  mutedText,
  emphasis,
  safeArea,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const emph = textEmphasisStyle(frame, fps, emphasis);

  // Headline size: large but scales down for longer strings so it fits.
  const len = screenText.length;
  const base = width * 0.11;
  const headlineSize = Math.max(width * 0.05, base - Math.max(0, len - 8) * (width * 0.0035));

  const highlight = emphasis === "highlight";

  return (
    <div
      style={{
        position: "absolute",
        left: safeArea,
        right: safeArea,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: 28,
        alignItems: "center",
        textAlign: "center",
        fontFamily: koreanFontFamily,
      }}
    >
      <div
        style={{
          fontSize: headlineSize,
          lineHeight: 1.12,
          fontWeight: 900,
          color: text,
          letterSpacing: -1,
          transform: emph.transform,
          ...(highlight
            ? {
                background: accent,
                padding: "0.1em 0.3em",
                borderRadius: 18,
                boxDecorationBreak: "clone",
              }
            : {}),
          textShadow: highlight ? "none" : `0 8px 40px ${accent}55`,
        }}
      >
        {screenText}
      </div>
      {narration ? (
        <div
          style={{
            fontSize: width * 0.032,
            lineHeight: 1.4,
            fontWeight: 500,
            color: mutedText,
            maxWidth: "92%",
          }}
        >
          {narration}
        </div>
      ) : null}
    </div>
  );
};

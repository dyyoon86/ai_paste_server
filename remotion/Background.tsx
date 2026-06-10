import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { VisualDefaults, PlanTheme } from "./planTypes";

interface BackgroundProps {
  visual: VisualDefaults;
  theme: PlanTheme;
}

/**
 * Full-screen animated background (AbsoluteFill, section 9.1). Drifts a soft
 * accent glow; light themes get a gentle wash, dark themes a richer glow. No CSS
 * animation — the drift is frame-driven.
 */
export const Background: React.FC<BackgroundProps> = ({ visual, theme }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const { layout } = theme;

  const t = (frame / (fps * 6)) % 1;
  const glowY = interpolate(t, [0, 0.5, 1], [height * 0.32, height * 0.6, height * 0.32]);
  const glowStrength = layout.isLight ? layout.glow * 0.12 : layout.glow * 0.35;

  return (
    <AbsoluteFill style={{ backgroundColor: visual.background }}>
      {layout.glow > 0 ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(58% 38% at 50% ${glowY}px, ${visual.accent}${alpha(glowStrength)}, transparent 70%)`,
          }}
        />
      ) : null}
      <AbsoluteFill
        style={{
          background: layout.isLight
            ? `linear-gradient(160deg, ${visual.background} 0%, ${visual.surface} 100%)`
            : `linear-gradient(160deg, ${visual.background} 0%, ${visual.surface} 100%)`,
          opacity: layout.isLight ? 0.4 : 0.55,
        }}
      />
    </AbsoluteFill>
  );
};

function alpha(v: number): string {
  const a = Math.round(Math.min(1, Math.max(0, v)) * 255);
  return a.toString(16).padStart(2, "0");
}

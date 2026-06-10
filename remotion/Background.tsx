import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { VisualDefaults } from "./planTypes";

interface BackgroundProps {
  visual: VisualDefaults;
}

/**
 * Full-screen animated background. Uses AbsoluteFill (section 9.1) and a slow
 * frame-driven gradient drift + accent glow. No CSS animation.
 */
export const Background: React.FC<BackgroundProps> = ({ visual }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();

  // Slow vertical drift of the glow over ~6s, looping gently.
  const t = (frame / (fps * 6)) % 1;
  const glowY = interpolate(t, [0, 0.5, 1], [height * 0.3, height * 0.6, height * 0.3]);

  return (
    <AbsoluteFill style={{ backgroundColor: visual.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 40% at 50% ${glowY}px, ${visual.accent}33, transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `linear-gradient(160deg, ${visual.background} 0%, ${visual.surface} 100%)`,
          opacity: 0.55,
        }}
      />
    </AbsoluteFill>
  );
};

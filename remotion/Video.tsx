import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig, useCurrentFrame, interpolate } from "remotion";
import { Background } from "./Background";
import { Scene } from "./Scene";
import { koreanFontFamily } from "./fonts";
import type { RenderPlan } from "./planTypes";

export type VideoProps = {
  plan: RenderPlan;
};

/**
 * Top-level composition body. Lays out every scene with <Sequence> (section 9.1)
 * and overlays a CTA card at the end when enabled.
 */
export const PasteVideo: React.FC<VideoProps> = ({ plan }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const visual = plan.visualDefaults;

  return (
    <AbsoluteFill style={{ fontFamily: koreanFontFamily }}>
      <Background visual={visual} />

      {plan.scenes.map((scene, i) => (
        <Sequence
          key={scene.id}
          from={scene.startFrame}
          durationInFrames={scene.durationInFrames}
          name={`Scene ${scene.id}`}
        >
          <Scene
            scene={scene}
            index={i}
            total={plan.scenes.length}
            animation={plan.animationRules}
            visual={visual}
          />
        </Sequence>
      ))}

      {plan.ctaEnabled && plan.ctaText ? (
        <CtaOverlay
          text={plan.ctaText}
          accent={visual.accent}
          textColor={visual.text}
          fromFrame={Math.max(0, durationInFrames - fps * 3)}
          fps={fps}
          safeArea={visual.safeArea}
        />
      ) : null}
    </AbsoluteFill>
  );
};

const CtaOverlay: React.FC<{
  text: string;
  accent: string;
  textColor: string;
  fromFrame: number;
  fps: number;
  safeArea: number;
}> = ({ text, accent, textColor, fromFrame, safeArea }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [fromFrame, fromFrame + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ opacity }}>
      <div
        style={{
          position: "absolute",
          left: safeArea,
          right: safeArea,
          bottom: safeArea,
          background: accent,
          color: textColor,
          padding: "28px 36px",
          borderRadius: 24,
          fontSize: 44,
          fontWeight: 800,
          textAlign: "center",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

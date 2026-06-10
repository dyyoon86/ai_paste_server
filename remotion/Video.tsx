import React from "react";
import { AbsoluteFill, useVideoConfig, useCurrentFrame, interpolate } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import type { TransitionPresentation } from "@remotion/transitions";
import { Background } from "./Background";
import { Scene } from "./Scene";
import { fontFamily } from "./fonts";
import { TRANSITION_FRAMES, normalizeTransitionKind, type RenderPlan } from "./planTypes";

export type VideoProps = {
  plan: RenderPlan;
};

/** Map a transition kind to a Remotion presentation (zoom falls back to fade). */
function presentationFor(kind: string): TransitionPresentation<Record<string, unknown>> {
  switch (kind) {
    case "slide":
      return slide() as TransitionPresentation<Record<string, unknown>>;
    case "wipe":
      return wipe() as TransitionPresentation<Record<string, unknown>>;
    default:
      return fade() as TransitionPresentation<Record<string, unknown>>;
  }
}

/**
 * Top-level composition body. Scenes are laid out with <TransitionSeries> so
 * each cross-scene transition (fade/slide/wipe; cut = none) is a real A→B
 * transition. A CTA card overlays the end when enabled.
 */
export const PasteVideo: React.FC<VideoProps> = ({ plan }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const visual = plan.visualDefaults;

  return (
    <AbsoluteFill style={{ fontFamily: fontFamily(plan.theme.typography.fontId) }}>
      <Background visual={visual} theme={plan.theme} />

      <TransitionSeries>
        {plan.scenes.flatMap((scene, i) => {
          const kind = normalizeTransitionKind(scene.transition);
          const sequence = (
            <TransitionSeries.Sequence key={`s${scene.id}`} durationInFrames={scene.durationInFrames}>
              <Scene
                scene={scene}
                index={i}
                total={plan.scenes.length}
                animation={plan.animationRules}
                visual={visual}
                theme={plan.theme}
              />
            </TransitionSeries.Sequence>
          );
          // Insert a transition before this scene (between i-1 and i) unless it's a hard cut.
          if (i > 0 && kind !== "cut") {
            return [
              <TransitionSeries.Transition
                key={`t${scene.id}`}
                presentation={presentationFor(kind)}
                timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
              />,
              sequence,
            ];
          }
          return [sequence];
        })}
      </TransitionSeries>

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

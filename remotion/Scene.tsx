import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { TextBlock } from "./TextBlock";
import { enterStyle, exitStyle } from "./animations";
import type { ScenePlan, AnimationRules, VisualDefaults, SceneEnter, TransitionKind } from "./planTypes";

interface SceneProps {
  scene: ScenePlan;
  index: number;
  total: number;
  animation: AnimationRules;
  visual: VisualDefaults;
}

function normalizeTransition(raw: string, fallback: TransitionKind): TransitionKind {
  const v = raw.toLowerCase();
  if (v.includes("slide")) return "slide";
  if (v.includes("wipe")) return "wipe";
  if (v.includes("zoom")) return "zoom";
  if (v.includes("cut")) return "cut";
  if (v.includes("fade")) return "fade";
  return fallback;
}

/**
 * A single scene. Placed inside a <Sequence> by Video.tsx, so useCurrentFrame()
 * here is already scene-local. Combines an entrance animation with an exit
 * transition derived from the scene's `transition` field.
 */
export const Scene: React.FC<SceneProps> = ({ scene, index, animation, visual }) => {
  const localFrame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = enterStyle(localFrame, fps, animation.sceneEnter as SceneEnter);
  const transition = normalizeTransition(scene.transition, animation.transition);
  const exit = exitStyle(localFrame, scene.durationInFrames, fps, transition);

  // Scene index chip + progress markers add structure for short-form content.
  const sceneTag = `${index + 1}`;

  // Per-scene accent (threat=red, resolution=green, else base). Falls back to the
  // pack accent for plans generated before per-scene accents existed.
  const accent = scene.accent || visual.accent;

  return (
    <AbsoluteFill
      style={{
        opacity: enter.opacity * exit.opacity,
        transform: `${enter.transform} ${exit.transform}`.trim(),
        clipPath: enter.clipPath ?? exit.clipPath,
      }}
    >
      {/* Mood glow behind content, tinted by the scene accent. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(50% 32% at 50% 50%, ${accent}33, transparent 70%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: visual.safeArea,
          left: visual.safeArea,
          display: "flex",
          alignItems: "center",
          gap: 14,
          color: visual.mutedText,
          fontWeight: 700,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: visual.borderRadius / 2,
            background: accent,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
          }}
        >
          {sceneTag}
        </div>
      </div>

      <TextBlock
        screenText={scene.screenText}
        narration={scene.narration}
        accent={accent}
        text={visual.text}
        mutedText={visual.mutedText}
        emphasis={animation.textEmphasis}
        safeArea={visual.safeArea}
      />
    </AbsoluteFill>
  );
};

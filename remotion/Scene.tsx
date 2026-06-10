import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { TextBlock } from "./TextBlock";
import { enterStyle, exitStyle } from "./animations";
import type {
  ScenePlan,
  AnimationRules,
  VisualDefaults,
  PlanTheme,
  SceneEnter,
  TransitionKind,
} from "./planTypes";

interface SceneProps {
  scene: ScenePlan;
  index: number;
  total: number;
  animation: AnimationRules;
  visual: VisualDefaults;
  theme: PlanTheme;
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
 * A single scene placed inside a <Sequence>, so useCurrentFrame() is scene-local.
 * Combines an entrance animation, an exit transition, the per-scene accent
 * (threat/resolution), and the theme's layout (chip style, alignment).
 */
export const Scene: React.FC<SceneProps> = ({ scene, index, total, animation, visual, theme }) => {
  const localFrame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = enterStyle(localFrame, fps, animation.sceneEnter as SceneEnter);
  const transition = normalizeTransition(scene.transition, animation.transition);
  const exit = exitStyle(localFrame, scene.durationInFrames, fps, transition);

  const accent = scene.accent || visual.accent;
  const { layout } = theme;
  const sceneTag = `0${index + 1}`.slice(-2);
  const kickerText = `SCENE ${sceneTag} / ${`0${total}`.slice(-2)}`;

  return (
    <AbsoluteFill
      style={{
        opacity: enter.opacity * exit.opacity,
        transform: `${enter.transform} ${exit.transform}`.trim(),
        clipPath: enter.clipPath ?? exit.clipPath,
      }}
    >
      {layout.glow > 0 ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(50% 32% at 50% 50%, ${accent}${alpha(layout.glow * 0.3)}, transparent 70%)`,
          }}
        />
      ) : null}

      {layout.chip !== "none" ? (
        <div
          style={{
            position: "absolute",
            top: visual.safeArea,
            left: visual.safeArea,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          {layout.chip === "bar" ? (
            <div style={{ width: 56, height: 8, background: accent, borderRadius: 999 }} />
          ) : (
            <div
              style={{
                minWidth: 44,
                height: 44,
                padding: "0 12px",
                borderRadius: Math.max(8, visual.borderRadius / 2),
                background: accent,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 800,
              }}
            >
              {sceneTag}
            </div>
          )}
        </div>
      ) : null}

      <TextBlock
        screenText={scene.screenText}
        narration={scene.narration}
        accent={accent}
        text={visual.text}
        mutedText={visual.mutedText}
        emphasis={animation.textEmphasis}
        safeArea={visual.safeArea}
        theme={theme}
        kickerText={kickerText}
        effect={scene.effect}
      />
    </AbsoluteFill>
  );
};

function alpha(v: number): string {
  const a = Math.round(Math.min(1, Math.max(0, v)) * 255);
  return a.toString(16).padStart(2, "0");
}

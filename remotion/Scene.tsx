import React from "react";
import { AbsoluteFill, Audio, Img, useCurrentFrame, useVideoConfig } from "remotion";
import { TextBlock } from "./TextBlock";
import { Subtitle } from "./Subtitle";
import { enterStyle } from "./animations";
import type {
  ScenePlan,
  AnimationRules,
  VisualDefaults,
  PlanTheme,
  SceneEnter,
} from "./planTypes";

interface SceneProps {
  scene: ScenePlan;
  index: number;
  total: number;
  animation: AnimationRules;
  visual: VisualDefaults;
  theme: PlanTheme;
}

/**
 * A single scene. Cross-scene transitions are handled by <TransitionSeries> in
 * Video.tsx, so Scene only does its own entrance animation, optional background
 * image (with a readability scrim), the per-scene accent, and layout.
 */
export const Scene: React.FC<SceneProps> = ({ scene, index, total, animation, visual, theme }) => {
  const localFrame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = enterStyle(localFrame, fps, animation.sceneEnter as SceneEnter);

  const accent = scene.accent || visual.accent;
  const { layout } = theme;
  const sceneTag = `0${index + 1}`.slice(-2);
  const kickerText = `SCENE ${sceneTag} / ${`0${total}`.slice(-2)}`;
  const hasImage = typeof scene.image === "string" && /^(https?:|data:)/i.test(scene.image);
  const subtitleOn = layout.subtitle === true;

  return (
    <AbsoluteFill
      style={{
        opacity: enter.opacity,
        transform: enter.transform,
        clipPath: enter.clipPath,
      }}
    >
      {scene.audioUrl ? <Audio src={scene.audioUrl} /> : null}

      {hasImage ? (
        <>
          <AbsoluteFill>
            <Img src={scene.image} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </AbsoluteFill>
          {/* readability scrim so text stays legible over any image */}
          <AbsoluteFill
            style={{
              background: `linear-gradient(180deg, ${visual.background}99 0%, ${visual.background}55 45%, ${visual.background}E6 100%)`,
            }}
          />
        </>
      ) : null}

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
        narration={subtitleOn ? "" : scene.narration}
        accent={accent}
        text={visual.text}
        mutedText={visual.mutedText}
        emphasis={animation.textEmphasis}
        safeArea={visual.safeArea}
        theme={theme}
        kickerText={kickerText}
        effect={scene.effect}
        icon={scene.icon}
      />

      {subtitleOn && scene.narration ? (
        <Subtitle
          words={scene.subtitleWords}
          narration={scene.narration}
          accent={accent}
          sceneDurationInFrames={scene.durationInFrames}
        />
      ) : null}
    </AbsoluteFill>
  );
};

function alpha(v: number): string {
  const a = Math.round(Math.min(1, Math.max(0, v)) * 255);
  return a.toString(16).padStart(2, "0");
}

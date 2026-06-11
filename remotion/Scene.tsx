import React from "react";
import { AbsoluteFill, AnimatedImage, Audio, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { TextBlock } from "./TextBlock";
import { SceneGraphic } from "./Graphics";
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
  const { fps, width: vw, height: vh } = useVideoConfig();

  const enter = enterStyle(localFrame, fps, animation.sceneEnter as SceneEnter);

  // 콘텐츠는 등장 후 고정(흔들림 없음). 모션은 배경/전환/등장에서만.
  const combinedTransform = enter.transform;

  const accent = scene.accent || visual.accent;
  const { layout } = theme;
  const sceneTag = `0${index + 1}`.slice(-2);
  const hasImage = typeof scene.image === "string" && /^(https?:|data:)/i.test(scene.image);
  const isGif = hasImage && /\.gif(\?|$)|giphy\.com|media\d*\.giphy/i.test(scene.image);
  const subtitleOn = false; // 자막은 하단 레터박스 바(Video.tsx)가 담당

  return (
    <AbsoluteFill
      style={{
        opacity: enter.opacity,
        transform: combinedTransform,
        clipPath: enter.clipPath,
      }}
    >
      {scene.audioUrl ? <Audio src={scene.audioUrl} /> : null}

      {hasImage ? (
        <>
          <AbsoluteFill>
            {isGif ? (
              <AnimatedImage src={scene.image} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <Img src={scene.image} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
          </AbsoluteFill>
          {/* 가벼운 상/하 스크림만 (비주얼이 잘 보이게) */}
          <AbsoluteFill
            style={{
              background: `linear-gradient(180deg, #00000055 0%, transparent 22%, transparent 78%, #00000066 100%)`,
            }}
          />
        </>
      ) : null}

      {/* 상단 섹션 라벨 (• 라벨) — 레퍼런스의 미니 태그. visual_direction을 짧게 쓸 때만. */}
      {!hasImage && scene.visualDirection && scene.visualDirection.trim().length <= 14 && scene.visualDirection.trim().toLowerCase() !== "kinetic" ? (
        <div
          style={{
            position: "absolute",
            top: Math.round(vh * 0.038),
            left: 0,
            width: "100%",
            textAlign: "center",
            fontSize: Math.round(vw * 0.026),
            fontWeight: 800,
            color: accent,
            // 키커 등장: 레터스페이싱이 벌어지며 페이드인 (영문 키커 특유의 느낌)
            letterSpacing: interpolate(localFrame, [0, 14], [Math.round(vw * 0.02), Math.round(vw * 0.006)], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            textTransform: "uppercase",
            opacity: interpolate(localFrame, [0, 10], [0, 0.85], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          {scene.visualDirection.trim()}
        </div>
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

      {!hasImage && scene.graphic ? (
        <>
          {/* 그래픽 씬: 헤드라인은 위로, 인포그래픽이 중앙을 채움 */}
          <TextBlock
            screenText={scene.screenText}
            points={[]}
            accent={accent}
            text={visual.text}
            mutedText={visual.mutedText}
            emphasis={animation.textEmphasis}
            safeArea={visual.safeArea}
            theme={theme}
            effect={scene.effect}
            icon=""
            placement="top"
          />
          <div style={{ position: "absolute", top: "34%", left: 0, width: "100%", height: "60%", padding: `0 ${visual.safeArea * 0.6}px` }}>
            <SceneGraphic graphic={scene.graphic} accent={accent} text={visual.text} words={scene.subtitleWords} />
          </div>
        </>
      ) : !hasImage ? (
        <TextBlock
          screenText={scene.screenText}
          points={scene.points}
          accent={accent}
          text={visual.text}
          mutedText={visual.mutedText}
          emphasis={animation.textEmphasis}
          safeArea={visual.safeArea}
          theme={theme}
          effect={scene.effect}
          icon={scene.icon}
        />
      ) : null}

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

/** 순수 모션그래픽 데코: 회전하는 두 개의 링 + 위로 떠오르는 점들. 외부 미디어 0. */
const MotionDecor: React.FC<{ accent: string; seed: number }> = ({ accent, seed }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const sec = frame / fps;
  const rot = (sec * 16 + seed * 47) % 360;
  const ring = Math.min(width, height) * 0.74;
  const dots = [0, 1, 2, 3, 4, 5];
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "47%",
          width: ring,
          height: ring,
          marginLeft: -ring / 2,
          marginTop: -ring / 2,
          border: `${Math.max(3, width * 0.0045)}px solid ${accent}26`,
          borderRadius: "50%",
          transform: `rotate(${rot}deg) scale(${1 + 0.05 * Math.sin(sec * 1.6)})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "47%",
          width: ring * 0.62,
          height: ring * 0.62,
          marginLeft: -ring * 0.31,
          marginTop: -ring * 0.31,
          border: `${Math.max(2, width * 0.003)}px dashed ${accent}1c`,
          borderRadius: "50%",
          transform: `rotate(${-rot * 1.5}deg)`,
        }}
      />
      {dots.map((i) => {
        const ph = (sec * 0.13 + i / dots.length) % 1;
        const x = (i * 0.155 + 0.07) * width;
        const y = height * (1.08 - ph * 1.16);
        const sz = width * (0.011 + (i % 3) * 0.007);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: sz,
              height: sz,
              borderRadius: "50%",
              background: `${accent}${i % 2 ? "55" : "30"}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

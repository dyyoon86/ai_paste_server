import React from "react";
import { AbsoluteFill, useVideoConfig, useCurrentFrame, interpolate, spring } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import type { TransitionPresentation } from "@remotion/transitions";
import { Background } from "./Background";
import { Scene } from "./Scene";
import { fontFamily } from "./fonts";
import { TRANSITION_FRAMES, normalizeTransitionKind, type RenderPlan, type ScenePlan } from "./planTypes";

export type VideoProps = {
  plan: RenderPlan;
};

// 레터박스 비율: 상단 제목바 / 가운데 콘텐츠 / 하단 자막바 (레퍼런스 숏폼 폼)
const TOP_FRAC = 0.155;
const BOTTOM_FRAC = 0.2;

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
 * 레터박스 숏폼 레이아웃:
 *  - 상단 검정바: 2색 제목 (`*강조*` → accent 색)
 *  - 가운데 창: Background + Scene 들 (TransitionSeries), overflow 클립
 *  - 하단 검정바: 현재 씬 내레이션 자막
 *  - 경계의 진행바
 */
export const PasteVideo: React.FC<VideoProps> = ({ plan }) => {
  const { height } = useVideoConfig();
  const visual = plan.visualDefaults;

  const topH = Math.round(height * TOP_FRAC);
  const bottomH = Math.round(height * BOTTOM_FRAC);
  const midTop = topH;
  const midH = height - topH - bottomH;

  // 자막 타이밍: TransitionSeries 의 전환 겹침(TRANSITION_FRAMES)을 반영한
  // 실제 타임라인 상의 씬 시작/끝. (겹침을 무시하면 자막이 점점 어긋나 잘림)
  let cur = 0;
  const captionItems = plan.scenes.map((s, i) => {
    if (i > 0 && normalizeTransitionKind(s.transition) !== "cut") cur -= TRANSITION_FRAMES;
    const start = cur;
    const end = cur + s.durationInFrames;
    cur = end;
    return { scene: s, start, end };
  });

  return (
    <AbsoluteFill style={{ background: "#000", fontFamily: fontFamily(plan.theme.typography.fontId) }}>
      {/* 가운데 콘텐츠 창 (검정바 사이) */}
      <div style={{ position: "absolute", top: midTop, left: 0, width: "100%", height: midH, overflow: "hidden" }}>
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
      </div>

      {/* 상단 검정 제목바 */}
      <ShortsTitleBar title={plan.title} accent={visual.accent} barHeight={topH} />
      {/* 콘텐츠 상단 경계의 진행바 */}
      <ShortsProgressBar accent={visual.accent} topPx={midTop} />
      {/* 하단 검정 자막바 */}
      <ShortsBottomBar items={captionItems} barHeight={bottomH} accent={visual.accent} />
    </AbsoluteFill>
  );
};

/** 상단 검정 제목바. `*강조*` 세그먼트는 accent 색으로. */
const ShortsTitleBar: React.FC<{ title: string; accent: string; barHeight: number }> = ({ title, accent, barHeight }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  if (!title) return null;
  const pop = interpolate(frame, [0, Math.round(fps * 0.3)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const parts = title
    .split(/(\*[^*]+\*)/g)
    .filter(Boolean)
    .map((seg) => {
      const hot = seg.startsWith("*") && seg.endsWith("*");
      return { t: hot ? seg.slice(1, -1) : seg, hot };
    });
  // 제목 길이에 맞춰 폰트 자동 축소 → 칸에 딱 맞게(가운데 정렬은 flex center).
  const visibleLen = parts.reduce((n, p) => n + p.t.length, 0);
  const fontSize = Math.max(
    Math.round(width * 0.04),
    Math.min(Math.round(width * 0.07), Math.round((width * 1.5) / Math.max(8, visibleLen))),
  );
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: barHeight,
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: `0 ${width * 0.04}px`,
        opacity: pop,
      }}
    >
      <div
        style={{
          fontSize,
          fontWeight: 900,
          lineHeight: 1.08,
          letterSpacing: -1.5,
          color: "#fff",
          textAlign: "center",
          wordBreak: "keep-all",
          transform: `scale(${interpolate(pop, [0, 1], [0.92, 1])})`,
        }}
      >
        {parts.map((p, i) => (
          <span key={i} style={{ color: p.hot ? accent : "#fff" }}>
            {p.t}
          </span>
        ))}
      </div>
    </div>
  );
};

/** 콘텐츠 상단 경계의 진행바 (0→100%). */
const ShortsProgressBar: React.FC<{ accent: string; topPx: number }> = ({ accent, topPx }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, height } = useVideoConfig();
  const w = interpolate(frame, [0, durationInFrames], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        top: topPx,
        left: 0,
        height: Math.max(6, height * 0.006),
        width: `${w}%`,
        background: accent,
        boxShadow: `0 0 12px ${accent}`,
        zIndex: 5,
      }}
    />
  );
};

/**
 * 하단 검정 자막바. 현재(글로벌 프레임) 씬의 내레이션을 큰 글씨로 표시.
 * `*강조*` 가 있으면 accent 색. 씬이 바뀔 때 팝.
 */
const ShortsBottomBar: React.FC<{
  items: { scene: ScenePlan; start: number; end: number }[];
  barHeight: number;
  accent: string;
}> = ({ items, barHeight, accent }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  // 실제 타임라인 상의 현재 씬 (전환 겹침 반영된 start/end 사용)
  let item = items.find((it) => frame >= it.start && frame < it.end);
  if (!item) item = items[items.length - 1];
  const cur = item.scene;
  const caption = (cur?.narration || cur?.screenText || "").trim();
  if (!caption) return null;

  const local = frame - item.start;
  const localSec = local / fps;
  const enter = spring({ frame: local, fps, config: { damping: 18, mass: 0.5, stiffness: 160 } });

  // 카라오케: TTS 단어 타이밍(subtitleWords)을 쓰고, 없으면 씬 길이에 균등 분배.
  const sceneSec = (cur.durationInFrames ?? fps) / fps;
  const tokens =
    cur.subtitleWords && cur.subtitleWords.length > 0
      ? cur.subtitleWords.map((x) => ({ t: x.t, w: x.w }))
      : caption
          .split(/\s+/)
          .filter(Boolean)
          .map((w, i, arr) => ({ t: (i * sceneSec) / Math.max(1, arr.length), w }));

  // 현재 말하는 단어 = 시작시간이 지난 마지막 단어
  let current = -1;
  for (let i = 0; i < tokens.length; i++) {
    if (localSec >= tokens[i].t) current = i;
    else break;
  }

  const fontSize = Math.round(width * 0.052);
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "100%",
        height: barHeight,
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: `0 ${width * 0.06}px`,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: `${fontSize * 0.26}px`,
          fontSize,
          fontWeight: 800,
          lineHeight: 1.3,
          textAlign: "center",
          wordBreak: "keep-all",
          opacity: interpolate(enter, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(enter, [0, 1], [14, 0])}px)`,
        }}
      >
        {tokens.map((tok, i) => {
          const color = i < current ? "#FFFFFF" : i === current ? accent : "#6E6E6E";
          return (
            <span key={i} style={{ color }}>
              {tok.w.replace(/\*/g, "")}
            </span>
          );
        })}
      </div>
    </div>
  );
};

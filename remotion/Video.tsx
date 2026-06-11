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

      {/* 상단 제목바 (검정/흰색) */}
      <ShortsTitleBar title={plan.title} accent={visual.accent} barHeight={topH} barColor={plan.barColor} barText={plan.barText} />
      {/* 콘텐츠 상단 경계의 진행바 */}
      <ShortsProgressBar accent={visual.accent} topPx={midTop} />
      {/* 하단 자막바 (검정/흰색) */}
      <ShortsBottomBar items={captionItems} barHeight={bottomH} accent={visual.accent} barColor={plan.barColor} barText={plan.barText} />
    </AbsoluteFill>
  );
};

/** 제목을 두 줄로 균형 분할 (가운데 공백 기준). */
function splitTwoLines(s: string): [string, string] {
  const t = s.replace(/\*/g, "").trim();
  if (t.length <= 8 || !t.includes(" ")) return [t, ""];
  const mid = t.length / 2;
  const spaces = [...t.matchAll(/ /g)].map((m) => m.index ?? 0);
  let best = spaces[0];
  for (const idx of spaces) if (Math.abs(idx - mid) < Math.abs(best - mid)) best = idx;
  return [t.slice(0, best).trim(), t.slice(best + 1).trim()];
}

/**
 * 상단 검정 제목바 — 두 줄, 첫 줄은 밝은색(accent) 강조, 타이트.
 * 쇼츠 기본: 제목은 상단바에 꽉 차게 타이트하게.
 */
const ShortsTitleBar: React.FC<{ title: string; accent: string; barHeight: number; barColor: string; barText: string }> = ({ title, accent, barHeight, barColor, barText }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  if (!title) return null;
  const pop = interpolate(frame, [0, Math.round(fps * 0.3)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const [line1, line2] = splitTwoLines(title);
  const longest = Math.max(line1.length, line2.length, 1);
  // 가장 긴 줄이 폭에 꽉 차게 (타이트). 2줄이면 더 크게 가능.
  const fontSize = Math.max(
    Math.round(width * 0.05),
    Math.min(Math.round(width * 0.092), Math.round((width * 0.92) / longest)),
  );
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: barHeight,
        background: barColor,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: `0 ${width * 0.035}px`,
        opacity: pop,
      }}
    >
      <div
        style={{
          fontSize,
          fontWeight: 900,
          lineHeight: 1.02,
          letterSpacing: -2,
          textAlign: "center",
          wordBreak: "keep-all",
          transform: `scale(${interpolate(pop, [0, 1], [0.94, 1])})`,
        }}
      >
        <div style={{ color: accent }}>{line1}</div>
        {line2 ? <div style={{ color: barText }}>{line2}</div> : null}
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
  barColor: string;
  barText: string;
}> = ({ items, barHeight, accent, barColor, barText }) => {
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

  // 카라오케: TTS 단어 타이밍(subtitleWords)을 쓰고, 없으면 씬 길이에 균등 분배.
  const sceneSec = (cur.durationInFrames ?? fps) / fps;
  const tokens = (
    cur.subtitleWords && cur.subtitleWords.length > 0
      ? cur.subtitleWords.map((x) => ({ t: x.t, w: x.w }))
      : caption
          .split(/\s+/)
          .filter(Boolean)
          .map((w, i, arr) => ({ t: (i * sceneSec) / Math.max(1, arr.length), w }))
  ).map((x) => ({ t: x.t, w: x.w.replace(/\*/g, "") })).filter((x) => x.w.length > 0);
  if (tokens.length === 0) return null;

  const fontSize = Math.round(width * 0.052);
  // 한 줄에 들어갈 최대 글자수 (자막은 절대 두 줄 금지 — 넘치면 다음 덩어리로).
  const maxChars = Math.max(8, Math.floor((width * 0.8) / (fontSize * 1.05)));
  // 토큰을 한 줄 분량 덩어리(라인)로 그룹화.
  const lines: { toks: { t: number; w: string }[]; startIdx: number }[] = [];
  let buf: { t: number; w: string }[] = [];
  let bufLen = 0;
  let startIdx = 0;
  tokens.forEach((tok, i) => {
    const add = tok.w.length + (buf.length ? 1 : 0);
    if (buf.length && bufLen + add > maxChars) {
      lines.push({ toks: buf, startIdx });
      buf = [];
      bufLen = 0;
      startIdx = i;
    }
    buf.push(tok);
    bufLen += tok.w.length + (buf.length > 1 ? 1 : 0);
  });
  if (buf.length) lines.push({ toks: buf, startIdx });

  // 현재 말하는 단어(전역 인덱스)
  let current = -1;
  for (let i = 0; i < tokens.length; i++) {
    if (localSec >= tokens[i].t) current = i;
    else break;
  }
  // 현재 단어가 속한 라인(덩어리). 아직 시작 전이면 첫 라인.
  let activeLine = lines[0];
  for (const ln of lines) {
    const last = ln.startIdx + ln.toks.length - 1;
    if (current >= ln.startIdx && current <= last) { activeLine = ln; break; }
    if (current > last) activeLine = ln; // 마지막으로 지나간 라인 유지
  }

  // 라인 등장 팝 (그 라인 첫 단어 시작 시점 기준)
  const lineStartFrame = activeLine.toks[0].t * fps;
  const enter = spring({ frame: local - lineStartFrame, fps, config: { damping: 18, mass: 0.5, stiffness: 170 } });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "100%",
        height: barHeight,
        background: barColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: `0 ${width * 0.05}px`,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "nowrap",
          whiteSpace: "nowrap",
          justifyContent: "center",
          gap: `${fontSize * 0.26}px`,
          fontSize,
          fontWeight: 800,
          lineHeight: 1.25,
          textAlign: "center",
          opacity: interpolate(enter, [0, 1], [0, 1], { extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(enter, [0, 1], [12, 0], { extrapolateRight: "clamp" })}px)`,
        }}
      >
        {activeLine.toks.map((tok, j) => {
          const gi = activeLine.startIdx + j;
          const muted = barColor === "#FFFFFF" ? "#B8B8B8" : "#6E6E6E";
          const color = gi < current ? barText : gi === current ? accent : muted;
          return (
            <span key={j} style={{ color }}>
              {tok.w}
            </span>
          );
        })}
      </div>
    </div>
  );
};

import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import type { GraphicSpec } from "./planTypes";

type Words = Array<{ t: number; w: string }> | undefined;

interface GraphicProps {
  graphic: GraphicSpec;
  accent: string;
  text: string;
  /** TTS 단어 타이밍(초, 씬 시작 기준) — 항목 등장을 음성에 싱크. */
  words?: Words;
}

/**
 * 라벨이 내레이션에서 발화되는 시점(프레임)을 찾는다. 못 찾으면 fallback.
 * 라벨의 의미 토큰(2자+)이 자막 단어에 포함되면 매칭.
 */
function appearFrame(label: string, words: Words, fps: number, fallback: number): number {
  if (!words || words.length === 0) return fallback;
  const toks = (label || "")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  if (toks.length === 0) return fallback;
  let best = Infinity;
  for (const it of words) {
    const ww = (it.w || "").replace(/[^\p{L}\p{N}]/gu, "");
    if (ww.length < 2) continue;
    for (const tk of toks) {
      if (ww.includes(tk) || tk.includes(ww)) best = Math.min(best, it.t);
    }
  }
  return best === Infinity ? fallback : Math.round(best * fps);
}

/** 씬 중앙 인포그래픽 디스패처. 전부 코드(div/SVG)로 그려 외부 미디어 0. */
export const SceneGraphic: React.FC<GraphicProps> = ({ graphic, accent, text, words }) => {
  const type = (graphic.type || "").toLowerCase();
  const items = graphic.items || [];
  if (items.length === 0) return null;
  const p = { items, accent, text, words };
  if (type === "bars" || type === "chart") return <Bars {...p} />;
  if (type === "flow" || type === "steps") return <Flow {...p} />;
  if (type === "checklist" || type === "check") return <Checklist {...p} />;
  if (type === "stat" || type === "number") return <Stat {...p} />;
  if (type === "compare") return <Compare {...p} />;
  return <Checklist {...p} />;
};

type Items = GraphicSpec["items"];
interface SubProps {
  items: Items;
  accent: string;
  text: string;
  words: Words;
}

/** 막대그래프 — 아래서 자라며, 베이스에 체크. 음성 싱크. */
const Bars: React.FC<SubProps> = ({ items, accent, text, words }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const max = Math.max(...items.map((i) => i.value ?? 0), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: width * 0.028, height: "100%", width: "100%" }}>
      {items.map((it, i) => {
        const af = appearFrame(it.label, words, fps, 6 + i * 6);
        const g = spring({ frame: frame - af, fps, config: { damping: 15, mass: 0.7, stiffness: 110 } });
        const h = ((it.value ?? 0) / max) * 0.82 + 0.06;
        const barH = interpolate(g, [0, 1], [0.04, h]);
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end", gap: width * 0.014 }}>
            <div style={{ fontSize: width * 0.03, fontWeight: 800, color: accent, opacity: g }}>{it.value ?? ""}</div>
            <div
              style={{
                width: width * 0.078,
                height: `${barH * 100}%`,
                minHeight: 6,
                borderRadius: width * 0.012,
                background: `linear-gradient(180deg, ${accent} 0%, ${accent}55 100%)`,
                border: `1px solid ${accent}`,
                boxShadow: `0 0 22px ${accent}44`,
              }}
            />
            <div style={{ width: width * 0.05, height: width * 0.05, borderRadius: 999, border: `2px solid ${accent}`, color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: width * 0.03, opacity: g }}>✓</div>
            <div style={{ fontSize: width * 0.028, color: text, opacity: g, maxWidth: width * 0.1, textAlign: "center", wordBreak: "keep-all" }}>{it.label}</div>
          </div>
        );
      })}
    </div>
  );
};

/** 플로우 — 박스가 화살표로 연결되며 음성에 맞춰 순차 등장. */
const Flow: React.FC<SubProps> = ({ items, accent, text, words }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: width * 0.022, alignItems: "center", justifyContent: "center", height: "100%" }}>
      {items.map((it, i) => {
        const af = appearFrame(it.label, words, fps, i * 8);
        const g = spring({ frame: frame - af, fps, config: { damping: 14, stiffness: 140 } });
        return (
          <React.Fragment key={i}>
            {i > 0 ? <div style={{ fontSize: width * 0.05, color: accent, opacity: g, lineHeight: 0.6 }}>↓</div> : null}
            <div
              style={{
                opacity: g,
                transform: `translateY(${interpolate(g, [0, 1], [20, 0])}px) scale(${interpolate(g, [0, 1], [0.8, 1])})`,
                minWidth: width * 0.5,
                textAlign: "center",
                padding: `${width * 0.026}px ${width * 0.03}px`,
                borderRadius: width * 0.03,
                border: `2px solid ${accent}88`,
                background: `${accent}12`,
              }}
            >
              <div style={{ fontSize: width * 0.05, fontWeight: 900, color: text }}>{it.label}</div>
              {it.sub ? <div style={{ fontSize: width * 0.03, color: accent, marginTop: width * 0.008 }}>{it.sub}</div> : null}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

/** 체크리스트 — 음성에 맞춰 차례로 체크. */
const Checklist: React.FC<SubProps> = ({ items, accent, text, words }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: width * 0.026, justifyContent: "center", height: "100%", width: width * 0.74, margin: "0 auto" }}>
      {items.map((it, i) => {
        const af = appearFrame(it.label, words, fps, i * 7);
        const g = spring({ frame: frame - af, fps, config: { damping: 14, stiffness: 160 } });
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: width * 0.022, opacity: g, transform: `translateX(${interpolate(g, [0, 1], [-24, 0])}px)` }}>
            <div style={{ width: width * 0.06, height: width * 0.06, borderRadius: width * 0.014, border: `2px solid ${accent}`, background: `${accent}22`, color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: width * 0.038, flexShrink: 0 }}>✓</div>
            <div style={{ fontSize: width * 0.046, fontWeight: 700, color: text, wordBreak: "keep-all" }}>{it.label}</div>
          </div>
        );
      })}
    </div>
  );
};

/** 스탯 — 큰 숫자 카운트업 + 라벨. */
const Stat: React.FC<SubProps> = ({ items, accent, text, words }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  return (
    <div style={{ display: "flex", gap: width * 0.06, justifyContent: "center", alignItems: "center", height: "100%", flexWrap: "wrap" }}>
      {items.map((it, i) => {
        const af = appearFrame(it.label, words, fps, i * 8);
        const g = spring({ frame: frame - af, fps, config: { damping: 16, stiffness: 90 } });
        const val = Math.round(interpolate(g, [0, 1], [0, it.value ?? 0]));
        return (
          <div key={i} style={{ textAlign: "center", opacity: g }}>
            <div style={{ fontSize: width * 0.16, fontWeight: 900, color: accent, lineHeight: 1, textShadow: `0 0 30px ${accent}55` }}>
              {it.value != null ? val : it.label}
            </div>
            {it.value != null ? <div style={{ fontSize: width * 0.04, fontWeight: 700, color: text, marginTop: width * 0.01 }}>{it.label}</div> : null}
            {it.sub ? <div style={{ fontSize: width * 0.03, color: `${text}99` }}>{it.sub}</div> : null}
          </div>
        );
      })}
    </div>
  );
};

/** 비교 — 좌(흐림)·우(강조) 두 박스. */
const Compare: React.FC<SubProps> = ({ items, accent, text, words }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const pair = items.slice(0, 2);
  return (
    <div style={{ display: "flex", gap: width * 0.03, justifyContent: "center", alignItems: "center", height: "100%" }}>
      {pair.map((it, i) => {
        const af = appearFrame(it.label, words, fps, i * 10);
        const g = spring({ frame: frame - af, fps, config: { damping: 15, stiffness: 130 } });
        const hot = i === 1;
        return (
          <div
            key={i}
            style={{
              opacity: g,
              transform: `translateY(${interpolate(g, [0, 1], [24, 0])}px)`,
              width: width * 0.38,
              minHeight: width * 0.5,
              borderRadius: width * 0.03,
              border: `2px ${hot ? "solid" : "dashed"} ${hot ? accent : `${text}55`}`,
              background: hot ? `${accent}14` : "transparent",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: width * 0.02,
              padding: width * 0.03,
            }}
          >
            <div style={{ fontSize: width * 0.06, fontWeight: 900, color: hot ? accent : text }}>{it.label}</div>
            {it.sub ? <div style={{ fontSize: width * 0.032, color: text, textAlign: "center", wordBreak: "keep-all" }}>{it.sub}</div> : null}
          </div>
        );
      })}
    </div>
  );
};

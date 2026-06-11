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

/** 라벨이 내레이션에서 발화되는 프레임. 못 찾으면 -1. (의미 토큰 2자+ 포함 매칭) */
function matchFrame(label: string, words: Words, fps: number): number {
  if (!words || words.length === 0) return -1;
  const toks = (label || "")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  if (toks.length === 0) return -1;
  let best = Infinity;
  for (const it of words) {
    const ww = (it.w || "").replace(/[^\p{L}\p{N}]/gu, "");
    if (ww.length < 2) continue;
    for (const tk of toks) {
      if (ww.includes(tk) || tk.includes(ww)) best = Math.min(best, it.t);
    }
  }
  return best === Infinity ? -1 : Math.round(best * fps);
}

/**
 * i번째 항목의 등장 프레임 — 음성 싱크하되 **반드시 순서대로(단조 증가)**.
 * 라벨이 내레이션에 있으면 그 발화 시점, 없으면 직전+stagger. 항상 앞 항목보다 뒤에 뜬다.
 * (0~i까지 누적 계산; 항목 수 적어 비용 미미)
 */
function appearFrameOrdered(labels: string[], i: number, words: Words, fps: number, stagger: number): number {
  let prev = -1e9;
  for (let k = 0; k <= i; k++) {
    const m = matchFrame(labels[k] ?? "", words, fps);
    let f = m >= 0 ? m : k === 0 ? 0 : prev + stagger;
    const minGap = prev + Math.max(3, Math.round(stagger * 0.55));
    if (f < minGap) f = minGap;
    prev = f;
  }
  return prev;
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
  if (type === "cards" || type === "files") return <Cards {...p} />;
  if (type === "quote") return <Quote {...p} />;
  if (type === "badge" || type === "label") return <Badge {...p} />;
  if (type === "mismatch" || type === "conflict") return <Mismatch {...p} />;
  if (type === "gauge" || type === "percent" || type === "donut") return <Gauge {...p} />;
  if (type === "ranking" || type === "rank" || type === "top") return <Ranking {...p} />;
  if (type === "timeline") return <Timeline {...p} />;
  if (type === "progress" || type === "hbars") return <Progress {...p} />;
  if (type === "versus" || type === "vs") return <Versus {...p} />;
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
        const af = appearFrameOrdered(items.map((x) => x.label), i, words, fps, 6);
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
        const af = appearFrameOrdered(items.map((x) => x.label), i, words, fps, 8);
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
        const af = appearFrameOrdered(items.map((x) => x.label), i, words, fps, 7);
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
        const af = appearFrameOrdered(items.map((x) => x.label), i, words, fps, 8);
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
        const af = appearFrameOrdered(items.map((x) => x.label), i, words, fps, 10);
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

/** 문서/파일 카드 — 아이콘 + 제목 + 부제. 음성 싱크 순차 등장. */
const Cards: React.FC<SubProps> = ({ items, accent, text, words }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: width * 0.022, justifyContent: "center", height: "100%", width: width * 0.78, margin: "0 auto" }}>
      {items.map((it, i) => {
        const af = appearFrameOrdered(items.map((x) => x.label), i, words, fps, 7);
        const g = spring({ frame: frame - af, fps, config: { damping: 14, stiffness: 150 } });
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: width * 0.022,
              opacity: g,
              transform: `translateX(${interpolate(g, [0, 1], [-26, 0])}px)`,
              padding: `${width * 0.022}px ${width * 0.026}px`,
              borderRadius: width * 0.025,
              border: `1px solid ${accent}44`,
              background: `${accent}10`,
            }}
          >
            <div style={{ fontSize: width * 0.06, lineHeight: 1, flexShrink: 0 }}>📄</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: width * 0.044, fontWeight: 800, color: text, wordBreak: "keep-all" }}>{it.label}</div>
              {it.sub ? <div style={{ fontSize: width * 0.03, color: accent, marginTop: width * 0.004 }}>{it.sub}</div> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** 인용/콜아웃 — 큰 따옴표 박스. items[0].label = 인용문, sub = 출처. */
const Quote: React.FC<SubProps> = ({ items, accent, text }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const it = items[0];
  const g = spring({ frame, fps, config: { damping: 13, mass: 0.7, stiffness: 150 } });
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <div
        style={{
          opacity: g,
          transform: `scale(${interpolate(g, [0, 1], [0.8, 1])})`,
          maxWidth: width * 0.8,
          textAlign: "center",
          padding: `${width * 0.05}px ${width * 0.05}px`,
          borderRadius: width * 0.04,
          border: `2px solid ${accent}66`,
          background: `${accent}10`,
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", top: -width * 0.04, left: width * 0.03, fontSize: width * 0.16, color: accent, lineHeight: 1, fontWeight: 900 }}>“</div>
        <div style={{ fontSize: width * 0.066, fontWeight: 900, color: text, lineHeight: 1.25, wordBreak: "keep-all" }}>{it?.label}</div>
        {it?.sub ? <div style={{ fontSize: width * 0.034, color: accent, marginTop: width * 0.02 }}>— {it.sub}</div> : null}
      </div>
    </div>
  );
};

/** 단일 배지 — accent 외곽 알약 1개, 강한 팝. */
const Badge: React.FC<SubProps> = ({ items, accent, text }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const it = items[0];
  const s = spring({ frame, fps, config: { damping: 10, mass: 0.6, stiffness: 200, overshootClamping: false } });
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <div
        style={{
          opacity: interpolate(s, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }),
          transform: `scale(${interpolate(s, [0, 1], [0.4, 1])})`,
          padding: `${width * 0.03}px ${width * 0.06}px`,
          borderRadius: 999,
          border: `3px solid ${accent}`,
          background: `${accent}1a`,
          color: text,
          fontSize: width * 0.078,
          fontWeight: 900,
          boxShadow: `0 0 40px ${accent}55`,
          wordBreak: "keep-all",
          textAlign: "center",
        }}
      >
        {it?.label}
      </div>
    </div>
  );
};

/** 불일치 관계도 — 박스 ─ ✗ ─ 박스 (빨강 X). items를 2개씩 짝지음. */
const Mismatch: React.FC<SubProps> = ({ items, accent, text, words }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const pairs: [typeof items[0], typeof items[0]][] = [];
  for (let i = 0; i + 1 < items.length; i += 2) pairs.push([items[i], items[i + 1]]);
  const X = "#FF4D4D";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: width * 0.04, justifyContent: "center", height: "100%" }}>
      {pairs.map((pair, i) => {
        const af = appearFrameOrdered(pairs.map((p) => p[0].label + p[1].label), i, words, fps, 8);
        const g = spring({ frame: frame - af, fps, config: { damping: 14, stiffness: 150 } });
        const box = (label: string) => (
          <div style={{ padding: `${width * 0.02}px ${width * 0.03}px`, borderRadius: width * 0.02, border: `2px solid ${accent}88`, background: `${accent}12`, fontSize: width * 0.042, fontWeight: 800, color: text, wordBreak: "keep-all" }}>{label}</div>
        );
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: width * 0.025, opacity: g, transform: `translateY(${interpolate(g, [0, 1], [18, 0])}px)` }}>
            {box(pair[0].label)}
            <div style={{ fontSize: width * 0.06, color: X, fontWeight: 900, textShadow: `0 0 16px ${X}` }}>✕</div>
            {box(pair[1].label)}
          </div>
        );
      })}
    </div>
  );
};

/** 게이지/도넛 — 원형 링이 value%까지 채워지고 중앙에 큰 %. items[0]. */
const Gauge: React.FC<SubProps> = ({ items, accent, text }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const it = items[0];
  const g = spring({ frame, fps, config: { damping: 16, mass: 0.9, stiffness: 80 } });
  const target = Math.max(0, Math.min(100, it?.value ?? 0));
  const cur = target * g;
  const r = 42;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: width * 0.02 }}>
      <div style={{ position: "relative", width: width * 0.5, height: width * 0.5 }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke={`${accent}26`} strokeWidth="9" />
          <circle cx="50" cy="50" r={r} fill="none" stroke={accent} strokeWidth="9" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - cur / 100)} transform="rotate(-90 50 50)" />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: width * 0.13, fontWeight: 900, color: accent, lineHeight: 1 }}>{Math.round(cur)}%</div>
          {it?.label ? <div style={{ fontSize: width * 0.032, color: text, marginTop: width * 0.005 }}>{it.label}</div> : null}
        </div>
      </div>
      {it?.sub ? <div style={{ fontSize: width * 0.034, color: `${text}aa` }}>{it.sub}</div> : null}
    </div>
  );
};

/** 순위/랭킹 — 1·2·3위 번호 배지 + 라벨. 1위 강조. 음성 싱크. */
const Ranking: React.FC<SubProps> = ({ items, accent, text, words }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: width * 0.02, justifyContent: "center", height: "100%", width: width * 0.78, margin: "0 auto" }}>
      {items.map((it, i) => {
        const af = appearFrameOrdered(items.map((x) => x.label), i, words, fps, 7);
        const g = spring({ frame: frame - af, fps, config: { damping: 14, stiffness: 150 } });
        const top = i === 0;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: width * 0.02, opacity: g, transform: `translateX(${interpolate(g, [0, 1], [-26, 0])}px)`, padding: `${width * 0.018}px ${width * 0.024}px`, borderRadius: width * 0.02, border: `1px solid ${top ? accent : `${accent}33`}`, background: top ? `${accent}1e` : `${accent}0c` }}>
            <div style={{ width: width * 0.07, height: width * 0.07, borderRadius: 999, background: top ? accent : `${accent}33`, color: top ? "#0A0A0A" : text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: width * 0.04, fontWeight: 900, flexShrink: 0 }}>{i + 1}</div>
            <div style={{ fontSize: width * (top ? 0.05 : 0.044), fontWeight: top ? 900 : 700, color: text, wordBreak: "keep-all", flex: 1 }}>{it.label}</div>
            {it.sub ? <div style={{ fontSize: width * 0.032, color: accent, fontWeight: 700 }}>{it.sub}</div> : null}
          </div>
        );
      })}
    </div>
  );
};

/** 타임라인 — 세로 선 + 점, 각 단계 라벨/부제. 음성 싱크. */
const Timeline: React.FC<SubProps> = ({ items, accent, text, words }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", width: width * 0.74, margin: "0 auto" }}>
      {items.map((it, i) => {
        const af = appearFrameOrdered(items.map((x) => x.label), i, words, fps, 7);
        const g = spring({ frame: frame - af, fps, config: { damping: 14, stiffness: 150 } });
        const last = i === items.length - 1;
        return (
          <div key={i} style={{ display: "flex", gap: width * 0.025, opacity: g, transform: `translateY(${interpolate(g, [0, 1], [14, 0])}px)` }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: width * 0.035, height: width * 0.035, borderRadius: 999, background: accent, boxShadow: `0 0 14px ${accent}`, flexShrink: 0 }} />
              {!last ? <div style={{ width: 2, flex: 1, minHeight: width * 0.07, background: `${accent}55` }} /> : null}
            </div>
            <div style={{ paddingBottom: width * 0.035 }}>
              <div style={{ fontSize: width * 0.046, fontWeight: 800, color: text, wordBreak: "keep-all" }}>{it.label}</div>
              {it.sub ? <div style={{ fontSize: width * 0.032, color: accent, marginTop: width * 0.004 }}>{it.sub}</div> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** 가로 진행 막대 — label + value% 채움. 비율/퍼센트. 음성 싱크. */
const Progress: React.FC<SubProps> = ({ items, accent, text, words }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: width * 0.028, justifyContent: "center", height: "100%", width: width * 0.8, margin: "0 auto" }}>
      {items.map((it, i) => {
        const af = appearFrameOrdered(items.map((x) => x.label), i, words, fps, 6);
        const g = spring({ frame: frame - af, fps, config: { damping: 16, stiffness: 90 } });
        const pct = Math.max(0, Math.min(100, it.value ?? 0)) * g;
        return (
          <div key={i} style={{ opacity: g }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: width * 0.008 }}>
              <span style={{ fontSize: width * 0.038, fontWeight: 700, color: text }}>{it.label}</span>
              <span style={{ fontSize: width * 0.038, fontWeight: 900, color: accent }}>{Math.round(pct)}{it.sub ?? "%"}</span>
            </div>
            <div style={{ height: width * 0.045, borderRadius: 999, background: `${accent}22`, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${accent}aa, ${accent})`, boxShadow: `0 0 16px ${accent}66` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** 대결 — A VS B 정면 대결. items 2개. */
const Versus: React.FC<SubProps> = ({ items, accent, text }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const pair = items.slice(0, 2);
  const side = (it: Items[0], i: number) => {
    const g = spring({ frame: frame - i * 6, fps, config: { damping: 14, stiffness: 150 } });
    return (
      <div style={{ flex: 1, textAlign: "center", opacity: g, transform: `translateX(${interpolate(g, [0, 1], [i === 0 ? -30 : 30, 0])}px)` }}>
        <div style={{ fontSize: width * 0.07, fontWeight: 900, color: i === 1 ? accent : text, wordBreak: "keep-all" }}>{it?.label}</div>
        {it?.sub ? <div style={{ fontSize: width * 0.036, color: `${text}aa`, marginTop: width * 0.01 }}>{it.sub}</div> : null}
      </div>
    );
  };
  const vg = spring({ frame, fps, config: { damping: 9, mass: 0.5, stiffness: 200 } });
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: width * 0.02 }}>
      {side(pair[0], 0)}
      <div style={{ fontSize: width * 0.09, fontWeight: 900, color: accent, transform: `scale(${interpolate(vg, [0, 1], [0.4, 1])})`, textShadow: `0 0 24px ${accent}88`, flexShrink: 0 }}>VS</div>
      {side(pair[1], 1)}
    </div>
  );
};

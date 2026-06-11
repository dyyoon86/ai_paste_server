import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { VisualDefaults, PlanTheme } from "./planTypes";

interface BackgroundProps {
  visual: VisualDefaults;
  theme: PlanTheme;
}

// 필름 그레인 (SVG 노이즈) — 정적 타일을 프레임마다 살짝 이동시켜 셔머.
const GRAIN =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='180' height='180' filter='url(#n)'/></svg>`,
  );

/**
 * 시네마틱 앰비언트 배경 (코드 100%, 외부 미디어 0):
 *  - 딥 베이스 + 떠다니는 보케 광원(블러) → 아웃포커스 사진 느낌
 *  - 미세 도트 그리드(테크 무드)
 *  - 필름 그레인 + 강한 비네팅
 * 라이트 테마는 종전처럼 차분한 워시만.
 */
export const Background: React.FC<BackgroundProps> = ({ visual, theme }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { layout } = theme;
  const ac = visual.accent;
  const a2 = visual.accent2 || visual.accent;

  if (layout.isLight) {
    return (
      <AbsoluteFill style={{ backgroundColor: visual.background }}>
        <AbsoluteFill
          style={{
            background: `linear-gradient(160deg, ${visual.background} 0%, ${visual.surface} 100%)`,
            opacity: 0.5,
          }}
        />
      </AbsoluteFill>
    );
  }

  const t = (s: number) => frame / (fps * s);
  // 보케 광원 3개 — 서로 다른 속도/색으로 천천히 드리프트, 강하게 블러.
  const blobs = [
    { c: ac, x: 28 + 10 * Math.sin(t(7) * Math.PI * 2), y: 30 + 8 * Math.cos(t(9) * Math.PI * 2), s: 0.46, o: 0.5 },
    { c: a2, x: 74 + 9 * Math.cos(t(8) * Math.PI * 2), y: 64 + 9 * Math.sin(t(6) * Math.PI * 2), s: 0.4, o: 0.42 },
    { c: ac, x: 56 + 12 * Math.sin(t(11) * Math.PI * 2), y: 84 + 6 * Math.cos(t(10) * Math.PI * 2), s: 0.34, o: 0.3 },
  ];
  const grainShift = (frame * 7) % 180;

  return (
    <AbsoluteFill style={{ backgroundColor: visual.background }}>
      {/* 베이스 그라데이션 */}
      <AbsoluteFill
        style={{ background: `linear-gradient(155deg, ${visual.surface} 0%, ${visual.background} 70%)`, opacity: 0.9 }}
      />

      {/* 노드 네트워크 (은은한 테크 무드) */}
      <NodeNetwork accent={ac} frame={frame} fps={fps} />


      {/* 보케 광원 (블러) */}
      <AbsoluteFill style={{ filter: "blur(90px)", opacity: 0.9 }}>
        {blobs.map((b, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: Math.min(width, height) * b.s,
              height: Math.min(width, height) * b.s,
              marginLeft: -(Math.min(width, height) * b.s) / 2,
              marginTop: -(Math.min(width, height) * b.s) / 2,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${b.c}${alpha(b.o)} 0%, transparent 70%)`,
            }}
          />
        ))}
      </AbsoluteFill>

      {/* 미세 도트 그리드 */}
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${ac}22 1px, transparent 1px)`,
          backgroundSize: `${Math.round(width * 0.045)}px ${Math.round(width * 0.045)}px`,
          opacity: 0.35,
          maskImage: "radial-gradient(80% 60% at 50% 45%, #000 30%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(80% 60% at 50% 45%, #000 30%, transparent 100%)",
        }}
      />

      {/* 필름 그레인 */}
      <AbsoluteFill
        style={{
          backgroundImage: `url("${GRAIN}")`,
          backgroundRepeat: "repeat",
          backgroundPosition: `${grainShift}px ${(grainShift * 1.3) % 180}px`,
          opacity: 0.07,
          mixBlendMode: "overlay",
        }}
      />

      {/* 시네마틱 비네팅 */}
      <AbsoluteFill
        style={{ background: `radial-gradient(120% 78% at 50% 40%, transparent 34%, rgba(0,0,0,0.62) 100%)` }}
      />
    </AbsoluteFill>
  );
};

function alpha(v: number): string {
  const a = Math.round(Math.min(1, Math.max(0, v)) * 255);
  return a.toString(16).padStart(2, "0");
}

const NODES: [number, number][] = [
  [12, 14], [31, 26], [50, 11], [71, 21], [88, 32],
  [19, 48], [44, 44], [66, 52], [86, 58],
  [14, 76], [37, 70], [60, 80], [83, 86],
];

/** 연결된 노드망 — 위치 고정(흔들림 없음), 밝기만 천천히 펄스. */
const NodeNetwork: React.FC<{ accent: string; frame: number; fps: number }> = ({ accent, frame, fps }) => {
  const t = frame / fps;
  const edges: [number, number][] = [];
  for (let i = 0; i < NODES.length; i++) {
    for (let j = i + 1; j < NODES.length; j++) {
      const dx = NODES[i][0] - NODES[j][0];
      const dy = NODES[i][1] - NODES[j][1];
      if (Math.hypot(dx, dy) < 27) edges.push([i, j]);
    }
  }
  return (
    <AbsoluteFill style={{ opacity: 0.5 }}>
      <svg width="100%" height="100%" viewBox="0 0 100 178" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
        {edges.map(([a, b], k) => {
          const op = 0.05 + 0.05 * (0.5 + 0.5 * Math.sin(t * 0.5 + k));
          return (
            <line
              key={k}
              x1={NODES[a][0]} y1={(NODES[a][1] / 100) * 178}
              x2={NODES[b][0]} y2={(NODES[b][1] / 100) * 178}
              stroke={accent}
              strokeWidth={0.18}
              strokeOpacity={op}
            />
          );
        })}
        {NODES.map(([x, y], i) => {
          const pulse = 0.4 + 0.4 * (0.5 + 0.5 * Math.sin(t * 0.7 + i * 1.3));
          return <circle key={i} cx={x} cy={(y / 100) * 178} r={0.7} fill={accent} fillOpacity={pulse} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

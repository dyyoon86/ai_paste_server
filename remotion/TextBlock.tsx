import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from "remotion";
import { fontFamily } from "./fonts";
import { textEmphasisStyle, punchStyle } from "./animations";
import type { PlanTheme, SceneEffect } from "./planTypes";

interface TextBlockProps {
  screenText: string;
  /** Short summary phrases shown as staggered motion typography under the headline. */
  points: string[];
  accent: string;
  text: string;
  mutedText: string;
  emphasis: "highlight" | "scale" | "underline" | "none";
  safeArea: number;
  theme: PlanTheme;
  effect: SceneEffect;
  icon?: string;
  placement?: "center" | "top";
}

/**
 * Center stack: optional icon, the big headline (screen_text), and short summary
 * `points` that animate in one-by-one as motion typography. The full narration
 * is NOT shown here — it is voiceover (TTS) + the bottom karaoke subtitle.
 */
export const TextBlock: React.FC<TextBlockProps> = ({
  screenText,
  points,
  accent,
  text,
  mutedText,
  emphasis,
  safeArea,
  theme,
  effect,
  icon,
  placement = "center",
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const { typography: typo, layout } = theme;
  const emph =
    effect && effect !== "none"
      ? punchStyle(frame, fps, effect)
      : textEmphasisStyle(frame, fps, emphasis);

  const len = screenText.length;
  // 더 절제된 크기 (이전이 과하게 컸음).
  const base = width * 0.084 * typo.headlineScale;
  const headlineSize = Math.max(width * 0.044, base - Math.max(0, len - 8) * (width * 0.0028));

  const isLeft = layout.align === "left";
  const isBottom = layout.align === "bottom";
  const highlight = emphasis === "highlight";

  const glowShadow =
    layout.glow > 0 ? `0 8px ${40 * layout.glow}px ${accent}${hexAlpha(layout.glow)}` : "none";

  const outlineStyle: React.CSSProperties = layout.outline
    ? {
        color: "transparent",
        WebkitTextStroke: `${Math.max(2, width * 0.003)}px ${accent}`,
        textShadow: `0 0 ${18 * Math.max(0.4, layout.glow)}px ${accent}, 0 0 ${36 * Math.max(0.4, layout.glow)}px ${accent}aa`,
      }
    : { color: text, textShadow: glowShadow };

  const container: React.CSSProperties = {
    position: "absolute",
    left: safeArea,
    right: safeArea,
    display: "flex",
    flexDirection: "column",
    gap: width * 0.022,
    alignItems: isLeft || isBottom ? "flex-start" : "center",
    textAlign: isLeft || isBottom ? "left" : "center",
    fontFamily: fontFamily(typo.fontId),
    ...(placement === "top"
      ? { top: "13%" } // 상단 키커(visual_direction) 아래로 — 겹침 방지
      : isBottom
        ? { bottom: safeArea * 1.4 }
        : { top: "50%", transform: "translateY(-50%)" }),
  };

  const cleanPoints = (points ?? []).map((p) => p.trim()).filter(Boolean).slice(0, 4);

  return (
    <div style={container}>
      {icon ? (
        (() => {
          // 이모지 펀치 등장 — 작게서 튀어나오며 살짝 회전 오버슈트.
          const s = spring({ frame, fps, config: { damping: 9, mass: 0.8, stiffness: 170, overshootClamping: false } });
          const sc = interpolate(s, [0, 1], [0.2, 1]);
          const rot = interpolate(s, [0, 1], [-12, 0]);
          return (
            <div
              style={{
                fontSize: width * 0.24,
                lineHeight: 1,
                transform: `scale(${sc.toFixed(3)}) rotate(${rot.toFixed(1)}deg)`,
                filter: "drop-shadow(0 10px 24px rgba(0,0,0,0.45))",
              }}
            >
              {icon}
            </div>
          );
        })()
      ) : null}

      {layout.accentBar ? (
        <div
          style={{
            width: width * 0.16,
            height: Math.max(8, width * 0.012),
            background: accent,
            borderRadius: 999,
            marginBottom: width * 0.01,
          }}
        />
      ) : null}

      {layout.decoration === "rules" ? (
        <div style={{ width: "42%", height: 2, background: `${accent}99` }} />
      ) : null}

      <div
        style={{
          fontSize: headlineSize,
          lineHeight: 1.12,
          fontWeight: typo.weightHeadline,
          letterSpacing: typo.letterSpacing,
          fontStyle: typo.italic ? "italic" : "normal",
          textTransform: typo.upper ? "uppercase" : "none",
          transform: emph.transform,
          display: "flex",
          flexWrap: "wrap",
          gap: `${headlineSize * 0.06}px ${headlineSize * 0.22}px`,
          justifyContent: isLeft || isBottom ? "flex-start" : "center",
        }}
      >
        {headlineTokens(screenText, highlight).map((tok, i) => {
          // 단어별 펀치 등장 — 약한 오버슈트로 톡톡 튀어나오게 (좌→우 스태거)
          const s = spring({
            frame: frame - i * 4,
            fps,
            config: { damping: 11, mass: 0.6, stiffness: 200, overshootClamping: false },
          });
          const op = interpolate(s, [0, 0.6], [0, 1], { extrapolateRight: "clamp" });
          const ty = interpolate(s, [0, 1], [headlineSize * 0.85, 0]);
          const sc = interpolate(s, [0, 1], [0.35, 1]);
          const hot = tok.hot;
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity: op,
                transform: `translateY(${ty}px) scale(${sc})`,
                color: hot ? pickReadable(accent) : layout.outline ? "transparent" : text,
                background: hot ? accent : "transparent",
                padding: hot ? "0.02em 0.2em" : 0,
                borderRadius: hot ? 12 : 0,
                ...(hot ? {} : layout.outline ? outlineStyle : { textShadow: glowShadow }),
              }}
            >
              {tok.t}
            </span>
          );
        })}
      </div>

      {layout.decoration === "underline" ? (
        <div style={{ width: width * 0.22, height: 5, background: accent, borderRadius: 999 }} />
      ) : null}

      {/* 요약 포인트 — 알약형 칩 그리드 (레퍼런스2의 리스트 스타일) */}
      {cleanPoints.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: width * 0.016,
            marginTop: width * 0.03,
            maxWidth: width * 0.82,
            justifyContent: isLeft || isBottom ? "flex-start" : "center",
          }}
        >
          {cleanPoints.map((p, i) => {
            // 칩 펀치 등장 — 순차로 톡톡 팝 (스프링 오버슈트)
            const s = spring({
              frame: frame - (10 + i * 6),
              fps,
              config: { damping: 12, mass: 0.5, stiffness: 220, overshootClamping: false },
            });
            const t = interpolate(s, [0, 0.6], [0, 1], { extrapolateRight: "clamp" });
            const sc = interpolate(s, [0, 1], [0.6, 1]);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: width * 0.012,
                  opacity: t,
                  transform: `translateY(${(1 - t) * 18}px) scale(${sc.toFixed(3)})`,
                  fontSize: width * 0.038,
                  fontWeight: 700,
                  color: text,
                  padding: `${width * 0.012}px ${width * 0.026}px`,
                  border: `${Math.max(1, width * 0.0018)}px solid ${accent}66`,
                  background: `${accent}14`,
                  borderRadius: 999,
                }}
              >
                <span style={{ color: accent, fontWeight: 900 }}>{i + 1}</span>
                <span>{p}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

/** 헤드라인을 단어 토큰으로. `*강조*` 안의 단어는 hot=true (accent 칠). */
function headlineTokens(text: string, _emphasisHighlight: boolean): { t: string; hot: boolean }[] {
  const out: { t: string; hot: boolean }[] = [];
  text
    .split(/(\*[^*]+\*)/g)
    .filter(Boolean)
    .forEach((seg) => {
      const hot = seg.startsWith("*") && seg.endsWith("*");
      const txt = hot ? seg.slice(1, -1) : seg;
      txt
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .forEach((w) => out.push({ t: w, hot }));
    });
  return out;
}

/** 0..1 glow → 2-digit hex alpha for color suffix. */
function hexAlpha(glow: number): string {
  const a = Math.round(Math.min(1, Math.max(0, glow)) * 0x66);
  return a.toString(16).padStart(2, "0");
}

/** Choose black/white text for a highlight chip based on accent luminance. */
function pickReadable(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#fff";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0A0A0A" : "#FFFFFF";
}

import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "./fonts";

interface SubtitleProps {
  /** Word timings (sec from scene start) from TTS; empty → even-split fallback. */
  words?: Array<{ t: number; w: string }>;
  narration: string;
  accent: string;
  sceneDurationInFrames: number;
}

/**
 * Bottom karaoke subtitle. Each 어절 (whitespace word) is colored by reading
 * state: not-yet-read = #686868, currently-spoken = accent (point color),
 * already-read = white. Timing comes from the TTS word boundaries when present,
 * otherwise words are evenly distributed across the scene (preview fallback).
 * 58px font / 96px from bottom at 1080p (scaled proportionally).
 */
export const Subtitle: React.FC<SubtitleProps> = ({ words, narration, accent, sceneDurationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const sec = frame / fps;

  const items: Array<{ t: number; w: string }> =
    words && words.length > 0
      ? words
      : narration
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map((w, i, arr) => ({ t: (i * (sceneDurationInFrames / fps)) / Math.max(1, arr.length), w }));

  if (items.length === 0) return null;

  // Current word = last word whose start time has passed.
  let current = -1;
  for (let i = 0; i < items.length; i++) {
    if (sec >= items[i].t) current = i;
    else break;
  }

  const fontSize = Math.round(height * (58 / 1080));
  const bottom = Math.round(height * (96 / 1080));

  return (
    <div
      style={{
        position: "absolute",
        left: "8%",
        right: "8%",
        bottom,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: `${fontSize * 0.28}px`,
        fontFamily: fontFamily("sans"),
        fontSize,
        fontWeight: 700,
        lineHeight: 1.3,
        textAlign: "center",
      }}
    >
      {items.map((it, i) => {
        const color = i < current ? "#FFFFFF" : i === current ? accent : "#686868";
        return (
          <span key={i} style={{ color }}>
            {it.w}
          </span>
        );
      })}
    </div>
  );
};

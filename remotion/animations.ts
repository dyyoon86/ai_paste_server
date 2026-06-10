import { interpolate, spring, Easing } from "remotion";

/**
 * Deterministic, frame-based animation helpers (section 9.1).
 * NO CSS transition / animation is used anywhere — every value is derived from
 * the current frame via interpolate() / spring().
 */

export type SceneEnter = "fade" | "slide-up" | "zoom" | "wipe" | "pop";
export type TransitionKind = "cut" | "fade" | "slide" | "wipe" | "zoom";

const EASE_OUT_EXPO = Easing.bezier(0.16, 1, 0.3, 1);

export interface EnterStyle {
  opacity: number;
  transform: string;
  clipPath?: string;
}

/**
 * Entrance animation for a scene's content, relative to the scene's local frame.
 */
export function enterStyle(
  localFrame: number,
  fps: number,
  kind: SceneEnter,
): EnterStyle {
  const dur = Math.max(1, Math.round(fps * 0.6));
  const t = interpolate(localFrame, [0, dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT_EXPO,
  });

  switch (kind) {
    case "slide-up": {
      const y = interpolate(t, [0, 1], [60, 0]);
      return { opacity: t, transform: `translateY(${y}px)` };
    }
    case "zoom": {
      const scale = interpolate(t, [0, 1], [0.82, 1]);
      return { opacity: t, transform: `scale(${scale})` };
    }
    case "wipe": {
      const pct = interpolate(t, [0, 1], [0, 100]);
      return {
        opacity: 1,
        transform: "none",
        clipPath: `inset(0 ${100 - pct}% 0 0)`,
      };
    }
    case "pop": {
      const scale = spring({
        frame: localFrame,
        fps,
        config: { damping: 12, mass: 0.7, stiffness: 140 },
      });
      const s = interpolate(scale, [0, 1], [0.6, 1]);
      return { opacity: t, transform: `scale(${s})` };
    }
    case "fade":
    default:
      return { opacity: t, transform: "none" };
  }
}

/**
 * Cross-scene transition: returns opacity + transform for the *outgoing* scene
 * during its final `transitionFrames`. Used to overlap scene exits.
 */
export function exitStyle(
  localFrame: number,
  sceneDuration: number,
  fps: number,
  kind: TransitionKind,
): EnterStyle {
  const dur = Math.max(1, Math.round(fps * 0.4));
  const start = sceneDuration - dur;
  if (localFrame < start || kind === "cut") {
    return { opacity: 1, transform: "none" };
  }
  const t = interpolate(localFrame, [start, sceneDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  switch (kind) {
    case "slide": {
      const x = interpolate(t, [0, 1], [0, -80]);
      return { opacity: 1 - t, transform: `translateX(${x}px)` };
    }
    case "zoom": {
      const scale = interpolate(t, [0, 1], [1, 1.15]);
      return { opacity: 1 - t, transform: `scale(${scale})` };
    }
    case "wipe": {
      const pct = interpolate(t, [0, 1], [0, 100]);
      return { opacity: 1, transform: "none", clipPath: `inset(0 0 0 ${pct}%)` };
    }
    case "fade":
    default:
      return { opacity: 1 - t, transform: "none" };
  }
}

/** Emphasis applied to the main screen text. */
export function textEmphasisStyle(
  localFrame: number,
  fps: number,
  emphasis: "highlight" | "scale" | "underline" | "none",
): { transform: string; textShadow?: string } {
  if (emphasis === "scale") {
    const s = spring({
      frame: localFrame,
      fps,
      config: { damping: 14, mass: 0.8, stiffness: 120 },
    });
    const scale = interpolate(s, [0, 1], [0.94, 1]);
    return { transform: `scale(${scale})` };
  }
  return { transform: "none" };
}

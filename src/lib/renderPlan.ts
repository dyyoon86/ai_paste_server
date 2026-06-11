import type { VideoSpec, Scene } from "./videoSpecSchema";
import type { RemotionRulePack } from "./rulePacks";

/**
 * render-plan.json (section 8) — the deterministic, frame-accurate plan that the
 * Remotion composition consumes. Built purely from spec + rulePack so it is
 * unit-testable and reproducible.
 */

export type SceneMood = "neutral" | "threat" | "resolution";

export interface ScenePlan {
  id: number;
  index: number;
  startFrame: number;
  endFrame: number;
  durationInFrames: number;
  screenText: string;
  narration: string;
  visualDirection: string;
  transition: string;
  /** Per-scene accent color (threat=red, resolution=green, else pack accent). */
  accent: string;
  mood: SceneMood;
  /** Per-scene emphasis effect (director-set): none | punch-in | punch-out. */
  effect: SceneEffect;
  /** Optional per-scene background image (http(s) or data: URL); "" = none. */
  image: string;
  /** Optional per-scene icon (emoji) shown as a large center graphic; "" = none. */
  icon: string;
  /** Short summary phrases shown as staggered motion typography in the center. */
  points: string[];
  /** Optional infographic for the scene center. */
  graphic?: GraphicSpec;
  /** Optional per-scene narration audio (data: URL), injected server-side at render. */
  audioUrl?: string;
  /** Word timings for the karaoke subtitle (sec from scene start). Injected at render. */
  subtitleWords?: Array<{ t: number; w: string }>;
}

export type SceneEffect = "none" | "punch-in" | "punch-out";
export type TransitionKindPlan = "cut" | "fade" | "slide" | "zoom" | "wipe";

export interface GraphicItem {
  label: string;
  value?: number;
  sub?: string;
}
export interface GraphicSpec {
  type: string;
  items: GraphicItem[];
}

/** Frames a cross-scene transition overlaps (≈0.4s @30fps). */
export const TRANSITION_FRAMES = 12;

/** Normalize a free-form transition string to a known kind (default fade). */
export function normalizeTransitionKind(raw?: string): TransitionKindPlan {
  const v = (raw ?? "").toLowerCase();
  if (v.includes("slide")) return "slide";
  if (v.includes("wipe")) return "wipe";
  if (v.includes("zoom")) return "zoom";
  if (v.includes("cut")) return "cut";
  return "fade";
}

/** Normalize a free-form effect string to a known effect (lenient). */
export function normalizeEffect(raw?: string): SceneEffect {
  const v = (raw ?? "").toLowerCase();
  if (v === "punch-out" || v === "zoom-out" || v.includes("줌아웃") || v.includes("아웃")) return "punch-out";
  if (v === "punch-in" || v === "zoom-in" || v.includes("줌인") || v === "punch" || v.includes("확대")) return "punch-in";
  return "none";
}

export type TextAlign = "center" | "left" | "bottom";
export type ChipStyle = "number" | "bar" | "none";
export type Decoration = "none" | "rules" | "underline" | "corner";

/** Typography personality for a design theme. */
export interface ThemeTypography {
  fontId: string;
  weightHeadline: number;
  upper: boolean;
  letterSpacing: number;
  /** Multiplier on the base headline size. */
  headlineScale: number;
  italic: boolean;
}

/** Layout / decoration personality for a design theme. */
export interface ThemeLayout {
  align: TextAlign;
  kicker: boolean;
  accentBar: boolean;
  chip: ChipStyle;
  decoration: Decoration;
  outline: boolean;
  /** Background/text glow strength 0..1. */
  glow: number;
  isLight: boolean;
  /** Explainer mode: show narration as a karaoke subtitle at the bottom. */
  subtitle?: boolean;
}

/** Compact theme embedded into the render plan so the composition can read it. */
export interface PlanTheme {
  id: string;
  name: string;
  vibe: string;
  typography: ThemeTypography;
  layout: ThemeLayout;
}

/** What buildRenderPlan needs: a rule pack, optionally enriched into a theme. */
export type RenderStyle = RemotionRulePack & {
  vibe?: string;
  typography?: ThemeTypography;
  layout?: ThemeLayout;
};

export const DEFAULT_TYPOGRAPHY: ThemeTypography = {
  fontId: "sans",
  weightHeadline: 900,
  upper: false,
  letterSpacing: -1,
  headlineScale: 1,
  italic: false,
};

export const DEFAULT_LAYOUT: ThemeLayout = {
  align: "center",
  kicker: false,
  accentBar: false,
  chip: "number",
  decoration: "none",
  outline: false,
  glow: 0.6,
  isLight: false,
};

export interface RenderPlan {
  compositionId: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  background: string;
  rulePackId: string;
  rulePackName: string;
  usedSkillDocIds: string[];
  animationRules: RemotionRulePack["animationRules"];
  visualDefaults: RemotionRulePack["visualDefaults"];
  theme: PlanTheme;
  scenes: ScenePlan[];
  ctaEnabled: boolean;
  ctaText: string;
  language: string;
  title: string;
}

export const COMPOSITION_ID = "PasteVideo";

/** Default threat/resolution accents (overridable via style.accent_color). */
export const THREAT_RED = "#FF3B30";
export const RESOLUTION_GREEN = "#34C759";

function clampFrame(frame: number, max: number): number {
  return Math.max(0, Math.min(frame, max));
}

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Use a spec-provided color string only if it's a real hex value. */
export function asColor(value: string | undefined, fallback: string): string {
  return value && HEX_COLOR.test(value.trim()) ? value.trim() : fallback;
}

const THREAT_WORDS = ["빨강", "빨간", "붉", "red", "위협", "threat", "이상", "위험", "경고", "alert", "fraud"];
const RESOLUTION_WORDS = ["초록", "그린", "green", "완료", "성공", "안전", "resolution", "resolved", "✅", "✔"];

/** Decide a scene's mood from its on-screen + direction text. Resolution wins. */
export function detectSceneMood(screenText: string, visualDirection: string): SceneMood {
  const hay = `${screenText} ${visualDirection}`.toLowerCase();
  const hit = (words: string[]) => words.some((w) => hay.includes(w.toLowerCase()));
  if (hit(RESOLUTION_WORDS)) return "resolution";
  if (hit(THREAT_WORDS)) return "threat";
  return "neutral";
}

export function buildRenderPlan(
  spec: VideoSpec,
  rulePack: RenderStyle,
): RenderPlan {
  const fps = rulePack.compositionDefaults.fps;
  const width = rulePack.compositionDefaults.width || spec.resolution.width;
  const height = rulePack.compositionDefaults.height || spec.resolution.height;
  const durationInFrames = Math.max(
    1,
    Math.ceil(spec.duration_seconds * fps),
  );

  // 포인트색은 창작자(spec.style.accent_color)가 정한다 — 유효한 hex면 테마 accent을
  // 덮어쓴다. 배경/다크 여부 등 나머지 팔레트는 테마가 담당. (mood는 아래에서 빨강/초록 override)
  const baseAccent = asColor(spec.style?.accent_color, rulePack.visualDefaults.accent);
  const visualDefaults = { ...rulePack.visualDefaults, accent: baseAccent };

  const moodAccent: Record<SceneMood, string> = {
    neutral: baseAccent,
    threat: THREAT_RED,
    resolution: RESOLUTION_GREEN,
  };

  const scenes: ScenePlan[] = spec.scenes.map((scene: Scene, index: number) => {
    const startFrame = clampFrame(Math.round(scene.start * fps), durationInFrames);
    // The last scene extends to the composition end if its end matches duration.
    const rawEnd = Math.round(scene.end * fps);
    const endFrame = clampFrame(rawEnd, durationInFrames);
    const safeEnd = endFrame > startFrame ? endFrame : startFrame + fps;
    const mood = detectSceneMood(scene.screen_text, scene.visual_direction);
    return {
      id: scene.id,
      index,
      startFrame,
      endFrame: safeEnd,
      durationInFrames: Math.max(1, safeEnd - startFrame),
      screenText: scene.screen_text,
      narration: scene.narration,
      visualDirection: scene.visual_direction,
      transition: scene.transition || rulePack.animationRules.transition,
      mood,
      accent: moodAccent[mood],
      effect: normalizeEffect(scene.effect),
      image: scene.image ?? "",
      icon: scene.icon ?? "",
      points: (scene.points ?? []).filter((p) => p && p.trim()),
      graphic:
        scene.graphic && Array.isArray(scene.graphic.items) && scene.graphic.items.length > 0
          ? { type: scene.graphic.type, items: scene.graphic.items }
          : undefined,
    };
  });

  // TransitionSeries overlaps each cross-scene transition (except hard cuts), so
  // the real timeline is shorter than the nominal duration by the overlaps.
  // The composition duration must match the series total to avoid a frozen tail.
  const sceneFramesTotal = scenes.reduce((a, s) => a + s.durationInFrames, 0);
  let overlap = 0;
  scenes.forEach((s, i) => {
    if (i > 0 && normalizeTransitionKind(s.transition) !== "cut") overlap += TRANSITION_FRAMES;
  });
  const renderedDuration = Math.max(1, sceneFramesTotal - overlap);

  return {
    compositionId: COMPOSITION_ID,
    fps,
    width,
    height,
    durationInFrames: renderedDuration,
    background: visualDefaults.background,
    rulePackId: rulePack.id,
    rulePackName: rulePack.name,
    usedSkillDocIds: [
      ...rulePack.requiredSkillDocIds,
      ...rulePack.optionalSkillDocIds,
    ],
    animationRules: rulePack.animationRules,
    visualDefaults,
    theme: {
      id: rulePack.id,
      name: rulePack.name,
      vibe: rulePack.vibe ?? rulePack.description,
      typography: rulePack.typography ?? DEFAULT_TYPOGRAPHY,
      layout: rulePack.layout ?? DEFAULT_LAYOUT,
    },
    scenes,
    ctaEnabled: spec.cta.enabled,
    ctaText: spec.cta.text,
    language: spec.language,
    title: spec.title,
  };
}

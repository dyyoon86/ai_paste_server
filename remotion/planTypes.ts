/**
 * Self-contained structural copy of the RenderPlan shape (src/lib/renderPlan.ts).
 * Kept local so the Remotion bundle has zero dependency on the Next/src module
 * graph or path aliases at render time.
 */

export type SceneEnter = "fade" | "slide-up" | "zoom" | "wipe" | "pop";
export type SceneEffect = "none" | "punch-in" | "punch-out";
export type TextEmphasis = "highlight" | "scale" | "underline" | "none";
export type TransitionKind = "cut" | "fade" | "slide" | "wipe" | "zoom";

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
  accent: string;
  mood: SceneMood;
  effect: SceneEffect;
}

export interface VisualDefaults {
  background: string;
  surface: string;
  text: string;
  mutedText: string;
  accent: string;
  accent2: string;
  borderRadius: number;
  safeArea: number;
}

export interface AnimationRules {
  sceneEnter: SceneEnter;
  textEmphasis: TextEmphasis;
  transition: TransitionKind;
  easing: string;
}

export type TextAlign = "center" | "left" | "bottom";
export type ChipStyle = "number" | "bar" | "none";
export type Decoration = "none" | "rules" | "underline" | "corner";

export interface ThemeTypography {
  fontId: string;
  weightHeadline: number;
  upper: boolean;
  letterSpacing: number;
  headlineScale: number;
  italic: boolean;
}

export interface ThemeLayout {
  align: TextAlign;
  kicker: boolean;
  accentBar: boolean;
  chip: ChipStyle;
  decoration: Decoration;
  outline: boolean;
  glow: number;
  isLight: boolean;
}

export interface PlanTheme {
  id: string;
  name: string;
  vibe: string;
  typography: ThemeTypography;
  layout: ThemeLayout;
}

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
  animationRules: AnimationRules;
  visualDefaults: VisualDefaults;
  theme: PlanTheme;
  scenes: ScenePlan[];
  ctaEnabled: boolean;
  ctaText: string;
  language: string;
  title: string;
}

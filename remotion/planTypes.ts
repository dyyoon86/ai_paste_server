/**
 * Self-contained structural copy of the RenderPlan shape (src/lib/renderPlan.ts).
 * Kept local so the Remotion bundle has zero dependency on the Next/src module
 * graph or path aliases at render time.
 */

export type SceneEnter = "fade" | "slide-up" | "zoom" | "wipe" | "pop";
export type TextEmphasis = "highlight" | "scale" | "underline" | "none";
export type TransitionKind = "cut" | "fade" | "slide" | "wipe" | "zoom";

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
  scenes: ScenePlan[];
  ctaEnabled: boolean;
  ctaText: string;
  language: string;
  title: string;
}

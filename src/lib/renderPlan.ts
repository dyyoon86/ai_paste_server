import type { VideoSpec, Scene } from "./videoSpecSchema";
import type { RemotionRulePack } from "./rulePacks";

/**
 * render-plan.json (section 8) — the deterministic, frame-accurate plan that the
 * Remotion composition consumes. Built purely from spec + rulePack so it is
 * unit-testable and reproducible.
 */

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
  scenes: ScenePlan[];
  ctaEnabled: boolean;
  ctaText: string;
  language: string;
  title: string;
}

export const COMPOSITION_ID = "PasteVideo";

function clampFrame(frame: number, max: number): number {
  return Math.max(0, Math.min(frame, max));
}

export function buildRenderPlan(
  spec: VideoSpec,
  rulePack: RemotionRulePack,
): RenderPlan {
  const fps = rulePack.compositionDefaults.fps;
  const width = rulePack.compositionDefaults.width || spec.resolution.width;
  const height = rulePack.compositionDefaults.height || spec.resolution.height;
  const durationInFrames = Math.max(
    1,
    Math.ceil(spec.duration_seconds * fps),
  );

  const scenes: ScenePlan[] = spec.scenes.map((scene: Scene, index: number) => {
    const startFrame = clampFrame(Math.round(scene.start * fps), durationInFrames);
    // The last scene extends to the composition end if its end matches duration.
    const rawEnd = Math.round(scene.end * fps);
    const endFrame = clampFrame(rawEnd, durationInFrames);
    const safeEnd = endFrame > startFrame ? endFrame : startFrame + fps;
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
    };
  });

  return {
    compositionId: COMPOSITION_ID,
    fps,
    width,
    height,
    durationInFrames,
    background: rulePack.visualDefaults.background,
    rulePackId: rulePack.id,
    rulePackName: rulePack.name,
    usedSkillDocIds: [
      ...rulePack.requiredSkillDocIds,
      ...rulePack.optionalSkillDocIds,
    ],
    animationRules: rulePack.animationRules,
    visualDefaults: rulePack.visualDefaults,
    scenes,
    ctaEnabled: spec.cta.enabled,
    ctaText: spec.cta.text,
    language: spec.language,
    title: spec.title,
  };
}

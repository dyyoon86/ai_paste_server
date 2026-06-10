import { extractVideoSpecJson, ExtractError, type ExtractStrategy } from "./specParser";
import { validateVideoSpec, type ValidationIssue, type VideoSpec } from "./videoSpecSchema";
import { scoreHook, suggestHooks, type HookScoreResult } from "./hookScore";
import { recommendThemes, type DesignTheme } from "./themes";

/**
 * End-to-end analysis used by POST /api/analyze and reused on the client view.
 * Pure (no filesystem) so it is easy to test.
 */

export interface ThemePalettePreview {
  background: string;
  text: string;
  accent: string;
  accent2: string;
  isLight: boolean;
  fontId: string;
}

export interface RecommendationView {
  id: string;
  name: string;
  vibe: string;
  reason: string;
  description: string;
  bestFor: string[];
  usedSkillDocIds: string[];
  palette: ThemePalettePreview;
}

function toView(t: DesignTheme, reason: string): RecommendationView {
  return {
    id: t.id,
    name: t.name,
    vibe: t.vibe,
    reason,
    description: t.description,
    bestFor: t.bestFor,
    usedSkillDocIds: [...t.requiredSkillDocIds, ...t.optionalSkillDocIds],
    palette: {
      background: t.visualDefaults.background,
      text: t.visualDefaults.text,
      accent: t.visualDefaults.accent,
      accent2: t.visualDefaults.accent2,
      isLight: t.layout.isLight,
      fontId: t.typography.fontId,
    },
  };
}

export interface AnalyzeSuccess {
  ok: true;
  strategy: ExtractStrategy;
  spec: VideoSpec;
  resolvedResolution: { width: number; height: number };
  hook: HookScoreResult;
  hookSuggestions: string[];
  recommendations: RecommendationView[];
  /** All themes (for the full picker), spec-adjusted, in recommendation order. */
  allThemes: RecommendationView[];
}

export interface AnalyzeFailure {
  ok: false;
  stage: "extract" | "validate";
  errorCode?: string;
  message: string;
  detail?: string;
  issues?: ValidationIssue[];
  fixPrompt?: string;
}

export type AnalyzeResult = AnalyzeSuccess | AnalyzeFailure;

const ASPECT_TO_RES: Record<string, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
  "1:1": { width: 1080, height: 1080 },
};

export function analyzeInput(rawInput: string): AnalyzeResult {
  let extracted;
  try {
    extracted = extractVideoSpecJson(rawInput);
  } catch (err) {
    if (err instanceof ExtractError) {
      return {
        ok: false,
        stage: "extract",
        errorCode: err.code,
        message: err.message,
        detail: err.detail,
      };
    }
    return { ok: false, stage: "extract", message: String(err) };
  }

  const validation = validateVideoSpec(extracted.json);
  if (!validation.ok || !validation.spec) {
    return {
      ok: false,
      stage: "validate",
      message: "VIDEO_SPEC_JSON 검증에 실패했습니다.",
      issues: validation.issues,
      fixPrompt: validation.fixPrompt,
    };
  }

  const spec = validation.spec;
  const hook = scoreHook(spec);
  const hookSuggestions = suggestHooks(spec);
  const recs = recommendThemes(spec, hook.score);

  const allThemes: RecommendationView[] = recs.map((r) => toView(r.theme, r.reason));
  const recommendations = allThemes.slice(0, 3);

  return {
    ok: true,
    strategy: extracted.strategy,
    spec,
    resolvedResolution: ASPECT_TO_RES[spec.aspect_ratio] ?? spec.resolution,
    hook,
    hookSuggestions,
    recommendations,
    allThemes,
  };
}

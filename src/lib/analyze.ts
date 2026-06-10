import { extractVideoSpecJson, ExtractError, type ExtractStrategy } from "./specParser";
import { validateVideoSpec, type ValidationIssue, type VideoSpec } from "./videoSpecSchema";
import { scoreHook, suggestHooks, type HookScoreResult } from "./hookScore";
import { recommendRulePacks } from "./rulePacks";

/**
 * End-to-end analysis used by POST /api/analyze and reused on the client view.
 * Pure (no filesystem) so it is easy to test.
 */

export interface RecommendationView {
  id: string;
  name: string;
  reason: string;
  description: string;
  usedSkillDocIds: string[];
}

export interface AnalyzeSuccess {
  ok: true;
  strategy: ExtractStrategy;
  spec: VideoSpec;
  resolvedResolution: { width: number; height: number };
  hook: HookScoreResult;
  hookSuggestions: string[];
  recommendations: RecommendationView[];
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
  const recs = recommendRulePacks(spec, hook.score);

  const recommendations: RecommendationView[] = recs.slice(0, 3).map((r) => ({
    id: r.pack.id,
    name: r.pack.name,
    reason: r.reason,
    description: r.pack.description,
    usedSkillDocIds: [
      ...r.pack.requiredSkillDocIds,
      ...r.pack.optionalSkillDocIds,
    ],
  }));

  return {
    ok: true,
    strategy: extracted.strategy,
    spec,
    resolvedResolution: ASPECT_TO_RES[spec.aspect_ratio] ?? spec.resolution,
    hook,
    hookSuggestions,
    recommendations,
  };
}

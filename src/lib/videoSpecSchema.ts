import { z } from "zod";

/**
 * Zod schema for VIDEO_SPEC_JSON (section 4 of make.md).
 *
 * Limits enforced here double as security constraints (section 15):
 *   - max 30 scenes
 *   - duration_seconds <= 180
 *   - resolution within sane bounds
 */

export const MAX_SCENES = 30;
export const MAX_DURATION_SECONDS = 180;
export const MAX_RESOLUTION = 4096;

export const sceneSchema = z.object({
  id: z.number().int(),
  start: z.number().min(0),
  end: z.number().min(0),
  screen_text: z.string(),
  narration: z.string().default(""),
  visual_direction: z.string().default(""),
  transition: z.string().default("fade"),
  /** Per-scene emphasis effect set by the "director" (none | punch-in | punch-out). */
  effect: z.string().default("none"),
  /** Optional per-scene image (http(s) URL or data: URL) rendered as background. */
  image: z.string().optional(),
});

export const assetSchema = z.object({
  type: z.enum(["image", "video", "audio"]),
  url: z.string().url().optional(),
  local_path: z.string().optional(),
  description: z.string().optional(),
});

export const videoSpecSchema = z
  .object({
    schema: z.enum([
      "hyperframes.one_click_video.v1",
      "remotion.one_click_video.v1",
    ]),
    title: z.string().min(1, "title은 비어 있을 수 없습니다."),
    format: z.enum([
      "vertical_short_video",
      "horizontal_video",
      "square_video",
    ]),
    aspect_ratio: z.enum(["9:16", "16:9", "1:1"]),
    resolution: z.object({
      width: z.number().int().min(16).max(MAX_RESOLUTION),
      height: z.number().int().min(16).max(MAX_RESOLUTION),
    }),
    duration_seconds: z
      .number()
      .positive()
      .max(MAX_DURATION_SECONDS, `duration_seconds는 최대 ${MAX_DURATION_SECONDS}초입니다.`),
    language: z.string().min(1),
    style: z.object({
      name: z.string(),
      background: z.string(),
      accent_color: z.string(),
      text_style: z.string(),
      motion: z.string(),
    }),
    summary: z.string(),
    core_message: z.string(),
    cta: z.object({
      enabled: z.boolean(),
      text: z.string(),
      action: z.string(),
    }),
    scenes: z
      .array(sceneSchema)
      .min(1, "scenes 배열이 비어 있습니다.")
      .max(MAX_SCENES, `scene은 최대 ${MAX_SCENES}개까지 허용됩니다.`),
    assets: z.array(assetSchema).default([]),
    render_notes: z.array(z.string()).default([]),
  })
  .superRefine((spec, ctx) => {
    // Scenes must be ordered & non-overlapping and the last scene should not
    // exceed duration_seconds by more than a small tolerance.
    const tolerance = 0.5;
    let prevEnd = -Infinity;
    spec.scenes.forEach((scene, i) => {
      if (scene.end <= scene.start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `scene ${scene.id}: end(${scene.end})는 start(${scene.start})보다 커야 합니다.`,
          path: ["scenes", i, "end"],
        });
      }
      if (scene.start + tolerance < prevEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `scene ${scene.id}: start(${scene.start})가 이전 scene과 겹칩니다.`,
          path: ["scenes", i, "start"],
        });
      }
      prevEnd = Math.max(prevEnd, scene.end);
    });

    const lastEnd = spec.scenes.length
      ? spec.scenes[spec.scenes.length - 1].end
      : 0;
    if (lastEnd > spec.duration_seconds + tolerance) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `마지막 scene end(${lastEnd})가 duration_seconds(${spec.duration_seconds})를 초과합니다.`,
        path: ["duration_seconds"],
      });
    }
  });

export type VideoSpec = z.infer<typeof videoSpecSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type VideoAsset = z.infer<typeof assetSchema>;

export interface ValidationIssue {
  path: string;
  message: string;
  expected?: string;
}

export interface ValidationResult {
  ok: boolean;
  spec?: VideoSpec;
  issues: ValidationIssue[];
  /** A ready-to-paste fix prompt for Claude when validation fails. */
  fixPrompt?: string;
}

export function validateVideoSpec(input: unknown): ValidationResult {
  const parsed = videoSpecSchema.safeParse(input);
  if (parsed.success) {
    return { ok: true, spec: parsed.data, issues: [] };
  }

  const issues: ValidationIssue[] = parsed.error.issues.map((issue) => ({
    path: issue.path.length ? issue.path.join(".") : "(root)",
    message: issue.message,
    expected:
      "expected" in issue && typeof issue.expected === "string"
        ? issue.expected
        : undefined,
  }));

  return {
    ok: false,
    issues,
    fixPrompt: buildFixPrompt(issues),
  };
}

function buildFixPrompt(issues: ValidationIssue[]): string {
  const lines = issues.map(
    (i) => `- 경로 \`${i.path}\`: ${i.message}`,
  );
  return [
    "직전에 만든 VIDEO_SPEC_JSON에 아래 문제가 있습니다. 같은 스키마를 유지하면서 이 문제들만 고쳐서",
    "---BEGIN_VIDEO_SPEC_JSON--- 와 ---END_VIDEO_SPEC_JSON--- 사이에 JSON만 다시 출력해 주세요.",
    "",
    ...lines,
  ].join("\n");
}

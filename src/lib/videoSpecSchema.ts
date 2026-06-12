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
  /** Optional per-scene icon (emoji) shown as a large center graphic. */
  icon: z.string().optional(),
  /** Short summary phrases shown as motion typography in the center (2~4, brief). */
  points: z.array(z.string()).optional(),
  /** Optional infographic for the scene center (bars / flow / compare / checklist / stat). */
  graphic: z
    .object({
      type: z.string(),
      items: z
        .array(
          z.object({
            label: z.string().default(""),
            value: z.number().optional(),
            sub: z.string().optional(),
          }),
        )
        .default([]),
    })
    .optional(),
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
      /** 레터박스 상/하단 바 색: "black"(기본) | "white". */
      bar: z.string().optional(),
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

export interface SalvageResult {
  ok: boolean;
  spec?: VideoSpec;
  /** What we had to drop/fix, so the UI can tell the user it was recovered. */
  warnings: string[];
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Lenient recovery: instead of rejecting a partially-broken spec outright, keep
 * only the scenes that individually validate, drop the broken ones, re-sequence
 * the timeline (so dropped scenes leave no gaps/overlaps), and strict-validate
 * the result. Lets a spec that lost its last scene to truncation still render.
 * Returns ok:false only when nothing renderable remains.
 */
export function salvageVideoSpec(input: unknown): SalvageResult {
  const warnings: string[] = [];
  if (!input || typeof input !== "object") return { ok: false, warnings };
  const obj = { ...(input as Record<string, unknown>) };
  if (!Array.isArray(obj.scenes)) return { ok: false, warnings };

  const goodScenes: Scene[] = [];
  (obj.scenes as unknown[]).forEach((sc, i) => {
    const r = sceneSchema.safeParse(sc);
    if (r.success) {
      goodScenes.push(r.data);
    } else {
      const id =
        sc && typeof sc === "object" && "id" in sc
          ? (sc as { id?: unknown }).id
          : undefined;
      warnings.push(`${id ?? i + 1}번 장면이 불완전해서 제외했어요.`);
    }
  });
  if (goodScenes.length === 0) return { ok: false, warnings };

  // Re-sequence: keep each surviving scene's own length, remove gaps/overlaps.
  let t = 0;
  goodScenes.forEach((sc, i) => {
    const dur = sc.end > sc.start ? sc.end - sc.start : 3;
    sc.id = i + 1;
    sc.start = round3(t);
    sc.end = round3(t + dur);
    t = sc.end;
  });
  obj.scenes = goodScenes;
  obj.duration_seconds = Math.max(1, round3(t));
  // Fields that a mid-paste cut may have lost get safe defaults.
  if (!Array.isArray(obj.assets)) obj.assets = [];
  if (!Array.isArray(obj.render_notes)) obj.render_notes = [];

  const v = validateVideoSpec(obj);
  if (v.ok && v.spec) return { ok: true, spec: v.spec, warnings };
  return { ok: false, warnings };
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

import { describe, it, expect } from "vitest";
import { buildRenderPlan, COMPOSITION_ID } from "@/lib/renderPlan";
import { recommendRulePacks } from "@/lib/rulePacks";
import { extractVideoSpecJson } from "@/lib/specParser";
import { validateVideoSpec } from "@/lib/videoSpecSchema";
import { SAMPLE_INPUT } from "@/lib/sampleInput";
import { buildRenderArgs } from "@/lib/renderer";

function planFromSample() {
  const json = extractVideoSpecJson(SAMPLE_INPUT).json;
  const spec = validateVideoSpec(json).spec!;
  const pack = recommendRulePacks(spec, 80)[0].pack;
  return { plan: buildRenderPlan(spec, pack), spec, pack };
}

describe("buildRenderPlan", () => {
  it("builds a frame-accurate plan from the sample", () => {
    const { plan, spec } = planFromSample();
    expect(plan.compositionId).toBe(COMPOSITION_ID);
    expect(plan.fps).toBe(30);
    expect(plan.durationInFrames).toBe(Math.ceil(spec.duration_seconds * 30));
    expect(plan.scenes).toHaveLength(spec.scenes.length);
    expect(plan.scenes[0].startFrame).toBe(0);
    expect(plan.scenes[0].endFrame).toBe(90); // 3s * 30fps
    expect(plan.usedSkillDocIds.length).toBeGreaterThan(0);
  });

  it("never produces a non-positive scene duration", () => {
    const { plan } = planFromSample();
    for (const s of plan.scenes) {
      expect(s.durationInFrames).toBeGreaterThan(0);
    }
  });
});

describe("buildRenderArgs", () => {
  it("produces a safe argv array for the remotion CLI", () => {
    const args = buildRenderArgs({
      entry: "remotion/index.ts",
      compositionId: "PasteVideo",
      outputPath: "/data/jobs/abc/output.mp4",
      propsPath: "/data/jobs/abc/render-input.json",
    });
    expect(args[0]).toBe("render");
    expect(args).toContain("remotion/index.ts");
    expect(args).toContain("PasteVideo");
    expect(args).toContain("/data/jobs/abc/output.mp4");
    expect(args.some((a) => a.startsWith("--props="))).toBe(true);
    // No raw shell concatenation: each arg is discrete.
    expect(args.every((a) => typeof a === "string")).toBe(true);
  });
});

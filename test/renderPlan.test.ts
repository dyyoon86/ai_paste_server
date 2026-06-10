import { describe, it, expect } from "vitest";
import {
  buildRenderPlan,
  COMPOSITION_ID,
  detectSceneMood,
  asColor,
  THREAT_RED,
  RESOLUTION_GREEN,
} from "@/lib/renderPlan";
import { getRulePack } from "@/lib/rulePacks";
import type { VideoSpec } from "@/lib/videoSpecSchema";
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

describe("style color theming", () => {
  it("asColor accepts hex and rejects descriptions", () => {
    expect(asColor("#FF3B30", "#000")).toBe("#FF3B30");
    expect(asColor("#0D0D0D", "#000")).toBe("#0D0D0D");
    expect(asColor("dark gradient", "#111")).toBe("#111");
    expect(asColor(undefined, "#111")).toBe("#111");
  });

  it("detects scene mood from screen + direction text", () => {
    expect(detectSceneMood("0.3초", "빨간 글로우 펄스")).toBe("threat");
    expect(detectSceneMood("이상 거래 포착", "빨간색으로 강조")).toBe("threat");
    expect(detectSceneMood("차단 완료 ✅", "초록 배지 등장")).toBe("resolution");
    expect(detectSceneMood("수백만 건", "카운터 증가")).toBe("neutral");
  });

  it("uses the template palette (not spec.style) and per-scene threat/resolution accents", () => {
    const spec: VideoSpec = {
      schema: "remotion.one_click_video.v1",
      title: "FDS",
      format: "vertical_short_video",
      aspect_ratio: "9:16",
      resolution: { width: 1080, height: 1920 },
      duration_seconds: 6,
      language: "ko",
      style: { name: "Clean Dark", background: "#0D0D0D", accent_color: "#FF3B30", text_style: "", motion: "" },
      summary: "",
      core_message: "",
      cta: { enabled: false, text: "", action: "none" },
      scenes: [
        { id: 1, start: 0, end: 3, screen_text: "0.3초", narration: "", visual_direction: "빨간 글로우", transition: "fade" },
        { id: 2, start: 3, end: 6, screen_text: "차단 완료 ✅", narration: "", visual_direction: "초록 배지", transition: "fade" },
      ],
      assets: [],
      render_notes: [],
    } as VideoSpec;
    const pack = getRulePack("hook-first-short")!;
    const plan = buildRenderPlan(spec, pack);
    // Template palette wins over spec.style (#0D0D0D/#FF3B30 are ignored).
    expect(plan.background).toBe(pack.visualDefaults.background);
    expect(plan.visualDefaults.accent).toBe(pack.visualDefaults.accent);
    // Per-scene mood still overrides the accent for threat/resolution scenes.
    expect(plan.scenes[0].mood).toBe("threat");
    expect(plan.scenes[0].accent).toBe(THREAT_RED);
    expect(plan.scenes[1].mood).toBe("resolution");
    expect(plan.scenes[1].accent).toBe(RESOLUTION_GREEN);
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

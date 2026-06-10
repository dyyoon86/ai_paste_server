import { describe, it, expect } from "vitest";
import { recommendRulePacks, rulePacks, getRulePack } from "@/lib/rulePacks";
import { remotionSkillDocsById } from "@/generated/remotionSkillsManifest";
import type { VideoSpec } from "@/lib/videoSpecSchema";

function baseSpec(over: Partial<VideoSpec> = {}): VideoSpec {
  return {
    schema: "remotion.one_click_video.v1",
    title: "t",
    format: "vertical_short_video",
    aspect_ratio: "9:16",
    resolution: { width: 1080, height: 1920 },
    duration_seconds: 30,
    language: "ko",
    style: { name: "", background: "", accent_color: "", text_style: "", motion: "" },
    summary: "",
    core_message: "",
    cta: { enabled: false, text: "", action: "none" },
    scenes: [
      { id: 1, start: 0, end: 3, screen_text: "훅", narration: "", visual_direction: "", transition: "fade", effect: "none" },
    ],
    assets: [],
    render_notes: [],
    ...over,
  } as VideoSpec;
}

describe("rulePacks", () => {
  it("has 6 packs each linked to real skill doc ids", () => {
    expect(rulePacks).toHaveLength(6);
    for (const pack of rulePacks) {
      expect(pack.requiredSkillDocIds.length).toBeGreaterThan(0);
      for (const id of pack.requiredSkillDocIds) {
        expect(remotionSkillDocsById[id], `${pack.id} -> ${id} must exist in manifest`).toBeTruthy();
      }
    }
  });

  it("recommends Data Story when stats dominate", () => {
    const spec = baseSpec({ summary: "통계 데이터 리포트 인사이트 숫자 증가" });
    const recs = recommendRulePacks(spec, 50);
    expect(recs[0].pack.id).toBe("data-story");
  });

  it("applies aspect-ratio resolution to composition defaults", () => {
    const spec = baseSpec({ aspect_ratio: "16:9" });
    const recs = recommendRulePacks(spec, 50);
    expect(recs[0].pack.compositionDefaults.width).toBe(1920);
    expect(recs[0].pack.compositionDefaults.height).toBe(1080);
  });

  it("computes durationInFrames from duration_seconds", () => {
    const spec = baseSpec({ duration_seconds: 10 });
    const recs = recommendRulePacks(spec, 50);
    expect(recs[0].pack.compositionDefaults.durationInFrames).toBe(300);
  });

  it("getRulePack resolves by id", () => {
    expect(getRulePack("hook-first-short")?.name).toBe("Hook First Short");
    expect(getRulePack("nope")).toBeUndefined();
  });
});

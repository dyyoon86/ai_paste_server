import { describe, it, expect } from "vitest";
import { themes, getTheme, recommendThemes, themeForSpec } from "@/lib/themes";
import { buildRenderPlan } from "@/lib/renderPlan";
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
      { id: 1, start: 0, end: 3, screen_text: "훅", narration: "", visual_direction: "", transition: "fade" },
    ],
    assets: [],
    render_notes: [],
    ...over,
  } as VideoSpec;
}

describe("design themes", () => {
  it("has 12 distinct themes, each linked to real skill docs", () => {
    expect(themes.length).toBe(12);
    const ids = new Set(themes.map((t) => t.id));
    expect(ids.size).toBe(12);
    for (const t of themes) {
      expect(t.requiredSkillDocIds.length).toBeGreaterThan(0);
      for (const id of t.requiredSkillDocIds) {
        expect(remotionSkillDocsById[id], `${t.id} -> ${id}`).toBeTruthy();
      }
      // each theme carries a full visual identity
      expect(t.typography.fontId).toBeTruthy();
      expect(t.visualDefaults.background).toMatch(/^#/);
    }
  });

  it("covers both light and dark themes and multiple fonts", () => {
    const lights = themes.filter((t) => t.layout.isLight);
    expect(lights.length).toBeGreaterThanOrEqual(2);
    const fonts = new Set(themes.map((t) => t.typography.fontId));
    expect(fonts.size).toBeGreaterThanOrEqual(4);
  });

  it("recommends data-ink for stats and warm-story for emotion", () => {
    const stat = recommendThemes(baseSpec({ summary: "통계 데이터 리포트 숫자 증가" }), 50);
    expect(stat[0].theme.id).toBe("data-ink");
    const emo = recommendThemes(baseSpec({ summary: "사람의 이야기와 감성 여정" }), 50);
    expect(emo[0].theme.id).toBe("warm-story");
  });

  it("themeForSpec applies aspect-ratio resolution", () => {
    const t = themeForSpec(getTheme("bold-sport")!, baseSpec({ aspect_ratio: "16:9" }));
    expect(t.compositionDefaults.width).toBe(1920);
    expect(t.compositionDefaults.height).toBe(1080);
  });

  it("buildRenderPlan embeds the theme (font, layout) into the plan", () => {
    const theme = themeForSpec(getTheme("editorial")!, baseSpec());
    const plan = buildRenderPlan(baseSpec(), theme);
    expect(plan.theme.id).toBe("editorial");
    expect(plan.theme.typography.fontId).toBe("serif");
    expect(plan.theme.layout.decoration).toBe("rules");
    // theme palette flows into visualDefaults (no hex style override here)
    expect(plan.visualDefaults.background).toBe(theme.visualDefaults.background);
  });
});

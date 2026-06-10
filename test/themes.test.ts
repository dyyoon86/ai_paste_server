import { describe, it, expect } from "vitest";
import {
  themes,
  getTheme,
  recommendThemes,
  themeForSpec,
  themesByCategory,
  CATEGORY_LABELS,
} from "@/lib/themes";
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
      { id: 1, start: 0, end: 3, screen_text: "훅", narration: "", visual_direction: "", transition: "fade", effect: "none" },
    ],
    assets: [],
    render_notes: [],
    ...over,
  } as VideoSpec;
}

const ALL_HEX = /^#[0-9a-fA-F]{6}$/;
const VALID_FONTS = new Set(["sans", "serif", "plex", "impact", "geo", "round", "condensed", "brush", "myeongjo"]);

describe("design themes", () => {
  it("has 72+ distinct templates, each a valid full visual identity", () => {
    expect(themes.length).toBeGreaterThanOrEqual(72);
    const ids = new Set(themes.map((t) => t.id));
    expect(ids.size).toBe(themes.length);
    for (const t of themes) {
      expect(t.requiredSkillDocIds.length).toBeGreaterThan(0);
      for (const id of t.requiredSkillDocIds) {
        expect(remotionSkillDocsById[id], `${t.id} -> ${id}`).toBeTruthy();
      }
      expect(VALID_FONTS.has(t.typography.fontId), `${t.id} font ${t.typography.fontId}`).toBe(true);
      for (const c of [t.visualDefaults.background, t.visualDefaults.accent, t.visualDefaults.accent2, t.visualDefaults.text]) {
        expect(c, `${t.id} color ${c}`).toMatch(ALL_HEX);
      }
      expect(CATEGORY_LABELS[t.category], `${t.id} category`).toBeTruthy();
    }
  });

  it("groups by category with the 12 base categories at 6 each", () => {
    const groups = themesByCategory();
    expect(groups.length).toBeGreaterThanOrEqual(12);
    const base = ["sport", "tech", "editorial", "luxury", "neon", "pastel", "corporate", "data", "story", "bold", "retro", "nature"];
    for (const g of groups) {
      if (base.includes(g.category)) expect(g.themes.length, g.category).toBe(6);
      else expect(g.themes.length, g.category).toBeGreaterThanOrEqual(1);
    }
  });

  it("has an explainer template with subtitle enabled", () => {
    const ex = getTheme("explainer-dark");
    expect(ex).toBeTruthy();
    expect(ex!.layout.subtitle).toBe(true);
    expect(recommendThemes(baseSpec({ summary: "오늘은 정리 방법을 설명하는 가이드 영상" }))[0].theme.category).toBe("explainer");
  });

  it("covers light + dark themes and many fonts", () => {
    expect(themes.filter((t) => t.layout.isLight).length).toBeGreaterThanOrEqual(8);
    expect(new Set(themes.map((t) => t.typography.fontId)).size).toBeGreaterThanOrEqual(7);
  });

  it("recommends the data category for stats and story for emotion", () => {
    const stat = recommendThemes(baseSpec({ summary: "통계 데이터 리포트 숫자 증가 지표" }));
    expect(stat[0].theme.category).toBe("data");
    const emo = recommendThemes(baseSpec({ summary: "사람의 이야기와 감성 여정, 다큐 인터뷰" }));
    expect(emo[0].theme.category).toBe("story");
    const sport = recommendThemes(baseSpec({ summary: "도전과 한계를 넘는 운동 훈련" }));
    expect(sport[0].theme.category).toBe("sport");
  });

  it("themeForSpec applies aspect-ratio resolution", () => {
    const t = themeForSpec(getTheme("athletic-volt")!, baseSpec({ aspect_ratio: "16:9" }));
    expect(t.compositionDefaults.width).toBe(1920);
    expect(t.compositionDefaults.height).toBe(1080);
  });

  it("buildRenderPlan embeds the theme (font, layout) into the plan", () => {
    const theme = themeForSpec(getTheme("serif-ivory")!, baseSpec());
    const plan = buildRenderPlan(baseSpec(), theme);
    expect(plan.theme.id).toBe("serif-ivory");
    expect(plan.theme.typography.fontId).toBe("serif");
    expect(plan.theme.layout.decoration).toBe("rules");
    // theme palette flows into visualDefaults (no hex style override here)
    expect(plan.visualDefaults.background).toBe(theme.visualDefaults.background);
  });
});

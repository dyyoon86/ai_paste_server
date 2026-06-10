import { describe, it, expect } from "vitest";
import { scoreHook, suggestHooks } from "@/lib/hookScore";
import type { VideoSpec } from "@/lib/videoSpecSchema";

function specWith(screenText: string, narration = ""): VideoSpec {
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
    core_message: "내용만 넣으면 영상이 됩니다",
    cta: { enabled: false, text: "", action: "none" },
    scenes: [
      { id: 1, start: 0, end: 3, screen_text: screenText, narration, visual_direction: "", transition: "fade", effect: "none" },
    ],
    assets: [],
    render_notes: [],
  } as VideoSpec;
}

describe("scoreHook", () => {
  it("scores a strong question + problem + result hook high", () => {
    // 질문형(+20) + 문제형(+20) + 결과형(+20) + 짧은 문장(+10) = 70
    const r = scoreHook(specWith("아직도 손으로?", "막막한 빈 화면, 바로 자동 완성 MP4"));
    expect(r.score).toBeGreaterThanOrEqual(60);
    expect(r.weak).toBe(false);
  });

  it("penalizes a generic explainer intro", () => {
    const r = scoreHook(specWith("오늘은 영상 만드는 법을 알아보겠습니다", "오늘은 영상 만드는 법을 알아보겠습니다"));
    expect(r.score).toBeLessThan(60);
    expect(r.warning).toBeDefined();
  });

  it("gives a short concrete hook a length bonus", () => {
    const r = scoreHook(specWith("내용만 넣기"));
    const hasShort = r.signals.some((s) => s.label.includes("짧은 문장"));
    expect(hasShort).toBe(true);
  });

  it("clamps score between 0 and 100", () => {
    const r = scoreHook(specWith("왜 아직도 막막 반복 시간 낭비 사실 바로 자동 완성 MP4 만들어집니다 Before After 손작업 자동화"));
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});

describe("suggestHooks", () => {
  it("returns exactly 3 unique suggestions", () => {
    const s = suggestHooks(specWith("오늘은 알아보겠습니다"));
    expect(s).toHaveLength(3);
    expect(new Set(s).size).toBe(3);
  });
});

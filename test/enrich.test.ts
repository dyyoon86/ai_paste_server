import { describe, it, expect } from "vitest";
import { pickIcon, derivePoints, enrichSpec } from "@/lib/enrich";
import type { VideoSpec } from "@/lib/videoSpecSchema";

describe("enrich harness", () => {
  it("picks an emoji by keyword", () => {
    expect(pickIcon({ screen_text: "즉시 차단", narration: "거래를 막습니다" })).toBe("🛑");
    expect(pickIcon({ narration: "은행에 직접 연결합니다" })).toBe("🏦");
    expect(pickIcon({ screen_text: "승인 완료" })).toBe("✅");
    expect(pickIcon({ screen_text: "그냥 문구", narration: "특징 없음" })).toBe("");
  });

  it("derives short points from narration", () => {
    const pts = derivePoints({ narration: "정산 배치 실행, 펌뱅킹 이체 요청, 은행 처리" });
    expect(pts.length).toBeGreaterThan(0);
    expect(pts.length).toBeLessThanOrEqual(3);
    for (const p of pts) expect(p.length).toBeLessThanOrEqual(12);
  });

  it("fills missing icon, keeps brain values, and does NOT auto-fill points", () => {
    const spec = {
      scenes: [
        { id: 1, start: 0, end: 3, screen_text: "차단", narration: "막습니다", visual_direction: "", transition: "fade", effect: "none", icon: "🔥", points: ["내 포인트"] },
        { id: 2, start: 3, end: 6, screen_text: "은행 연결", narration: "은행에 직접 연결해 자동 이체합니다", visual_direction: "", transition: "fade", effect: "none" },
      ],
    } as unknown as VideoSpec;
    const out = enrichSpec(spec);
    expect(out.scenes[0].icon).toBe("🔥"); // kept
    expect(out.scenes[0].points).toEqual(["내 포인트"]); // kept
    expect(out.scenes[1].icon).toBe("🏦"); // filled
    expect((out.scenes[1].points ?? []).length).toBe(0); // points는 자동 생성 안 함
  });
});

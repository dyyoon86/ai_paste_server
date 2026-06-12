import { describe, it, expect } from "vitest";
import { validateVideoSpec, salvageVideoSpec } from "@/lib/videoSpecSchema";
import { extractVideoSpecJson } from "@/lib/specParser";
import { SAMPLE_INPUT } from "@/lib/sampleInput";

function sampleSpec() {
  return extractVideoSpecJson(SAMPLE_INPUT).json;
}

describe("salvageVideoSpec", () => {
  it("drops broken scenes and re-sequences the rest", () => {
    const spec = sampleSpec() as { scenes: Array<Record<string, unknown>> };
    // Corrupt scene index 2: remove the required screen_text.
    delete spec.scenes[2].screen_text;
    const r = salvageVideoSpec(spec);
    expect(r.ok).toBe(true);
    expect(r.spec!.scenes.length).toBe(5); // one dropped from 6
    expect(r.warnings.length).toBe(1);
    // Timeline is contiguous (no gaps/overlaps) after re-sequencing.
    let prev = 0;
    for (const s of r.spec!.scenes) {
      expect(s.start).toBeCloseTo(prev, 3);
      expect(s.end).toBeGreaterThan(s.start);
      prev = s.end;
    }
    expect(r.spec!.duration_seconds).toBeCloseTo(prev, 3);
  });

  it("recovers a spec truncated mid-scene via parser + salvage", () => {
    const sample = sampleSpec() as Record<string, unknown>;
    const full = JSON.stringify(sample);
    const cut = full.slice(0, full.length - 40); // chop the tail
    const repaired = extractVideoSpecJson(cut);
    expect(repaired.repaired).toBe(true);
    const r = salvageVideoSpec(repaired.json);
    expect(r.ok).toBe(true);
    expect(r.spec!.scenes.length).toBeGreaterThanOrEqual(1);
  });

  it("returns ok:false when no scene survives", () => {
    const r = salvageVideoSpec({ title: "x", scenes: [{ id: 1 }] });
    expect(r.ok).toBe(false);
  });
});

describe("validateVideoSpec", () => {
  it("accepts the bundled sample spec", () => {
    const r = validateVideoSpec(sampleSpec());
    expect(r.ok).toBe(true);
    expect(r.spec?.scenes.length).toBe(6);
  });

  it("reports missing required fields with paths", () => {
    const r = validateVideoSpec({ title: "no schema" });
    expect(r.ok).toBe(false);
    expect(r.issues.length).toBeGreaterThan(0);
    expect(r.fixPrompt).toContain("VIDEO_SPEC_JSON");
  });

  it("rejects empty scenes array", () => {
    const spec = sampleSpec() as Record<string, unknown>;
    spec.scenes = [];
    const r = validateVideoSpec(spec);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.message.includes("비어"))).toBe(true);
  });

  it("rejects duration over the max", () => {
    const spec = sampleSpec() as Record<string, unknown>;
    spec.duration_seconds = 999;
    const r = validateVideoSpec(spec);
    expect(r.ok).toBe(false);
  });

  it("rejects scenes that exceed duration_seconds", () => {
    const spec = sampleSpec() as { duration_seconds: number; scenes: Array<{ end: number }> };
    spec.duration_seconds = 5; // scenes go to 30s
    const r = validateVideoSpec(spec);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.path.includes("duration"))).toBe(true);
  });

  it("rejects too many scenes", () => {
    const spec = sampleSpec() as { scenes: unknown[]; duration_seconds: number };
    spec.duration_seconds = 180;
    spec.scenes = Array.from({ length: 31 }, (_, i) => ({
      id: i,
      start: i,
      end: i + 0.5,
      screen_text: "t",
      narration: "",
      visual_direction: "",
      transition: "fade",
    }));
    const r = validateVideoSpec(spec);
    expect(r.ok).toBe(false);
  });
});

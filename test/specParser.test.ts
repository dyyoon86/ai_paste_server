import { describe, it, expect } from "vitest";
import { extractVideoSpecJson, ExtractError } from "@/lib/specParser";

const obj = { schema: "remotion.one_click_video.v1", title: "x" };
const json = JSON.stringify(obj);

describe("extractVideoSpecJson", () => {
  it("extracts from the legacy HYPERFRAMES delimiter", () => {
    const text = `blah\n---BEGIN_HYPERFRAMES_VIDEO_SPEC_JSON---\n${json}\n---END_HYPERFRAMES_VIDEO_SPEC_JSON---\ntrailing`;
    const r = extractVideoSpecJson(text);
    expect(r.strategy).toBe("hyperframes_delimiter");
    expect(r.json).toEqual(obj);
  });

  it("extracts from the new VIDEO_SPEC delimiter", () => {
    const text = `intro\n---BEGIN_VIDEO_SPEC_JSON---\n${json}\n---END_VIDEO_SPEC_JSON---`;
    const r = extractVideoSpecJson(text);
    expect(r.strategy).toBe("video_spec_delimiter");
    expect(r.json).toEqual(obj);
  });

  it("prefers HYPERFRAMES over the new delimiter when both present", () => {
    const text = `---BEGIN_HYPERFRAMES_VIDEO_SPEC_JSON---\n${json}\n---END_HYPERFRAMES_VIDEO_SPEC_JSON---\n---BEGIN_VIDEO_SPEC_JSON---\n{"other":true}\n---END_VIDEO_SPEC_JSON---`;
    const r = extractVideoSpecJson(text);
    expect(r.strategy).toBe("hyperframes_delimiter");
    expect(r.json).toEqual(obj);
  });

  it("falls back to a ```json fenced block", () => {
    const text = "여기 결과입니다:\n```json\n" + json + "\n```\n끝";
    const r = extractVideoSpecJson(text);
    expect(r.strategy).toBe("code_fence");
    expect(r.json).toEqual(obj);
  });

  it("parses whole text as raw JSON when no delimiter exists", () => {
    const r = extractVideoSpecJson(json);
    expect(r.strategy).toBe("raw_json");
    expect(r.json).toEqual(obj);
  });

  it("extracts a JSON object embedded in surrounding prose", () => {
    const r = extractVideoSpecJson(`설명 ${json} 끝`);
    expect(r.strategy).toBe("raw_json");
    expect(r.json).toEqual(obj);
  });

  it("throws NO_JSON_FOUND on empty input", () => {
    expect(() => extractVideoSpecJson("   ")).toThrowError(ExtractError);
  });

  it("throws JSON_PARSE_FAILED on broken JSON inside delimiters", () => {
    const text = `---BEGIN_VIDEO_SPEC_JSON---\n{ not json }\n---END_VIDEO_SPEC_JSON---`;
    try {
      extractVideoSpecJson(text);
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ExtractError);
      expect((e as ExtractError).code).toBe("JSON_PARSE_FAILED");
    }
  });
});

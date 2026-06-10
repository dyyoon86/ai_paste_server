/**
 * Extracts the VIDEO_SPEC JSON out of an arbitrary Claude web answer.
 *
 * Supported, in priority order:
 *   1. ---BEGIN_HYPERFRAMES_VIDEO_SPEC_JSON--- ... ---END_HYPERFRAMES_VIDEO_SPEC_JSON---
 *      (legacy delimiter kept for skill compatibility)
 *   2. ---BEGIN_VIDEO_SPEC_JSON--- ... ---END_VIDEO_SPEC_JSON---
 *   3. A fenced ```json code block.
 *   4. The whole text parsed as JSON.
 *
 * Returns the parsed value plus which strategy matched. Throws a typed
 * ExtractError when no JSON can be located or parsed.
 */

export type ExtractStrategy =
  | "hyperframes_delimiter"
  | "video_spec_delimiter"
  | "code_fence"
  | "raw_json";

export interface ExtractResult {
  json: unknown;
  rawJson: string;
  strategy: ExtractStrategy;
}

export class ExtractError extends Error {
  code: "NO_JSON_FOUND" | "JSON_PARSE_FAILED";
  detail?: string;
  constructor(
    code: ExtractError["code"],
    message: string,
    detail?: string,
  ) {
    super(message);
    this.name = "ExtractError";
    this.code = code;
    this.detail = detail;
  }
}

const DELIMITERS: Array<{ strategy: ExtractStrategy; begin: string; end: string }> = [
  {
    strategy: "hyperframes_delimiter",
    begin: "---BEGIN_HYPERFRAMES_VIDEO_SPEC_JSON---",
    end: "---END_HYPERFRAMES_VIDEO_SPEC_JSON---",
  },
  {
    strategy: "video_spec_delimiter",
    begin: "---BEGIN_VIDEO_SPEC_JSON---",
    end: "---END_VIDEO_SPEC_JSON---",
  },
];

function between(text: string, begin: string, end: string): string | null {
  const startIdx = text.indexOf(begin);
  if (startIdx === -1) return null;
  const afterBegin = startIdx + begin.length;
  const endIdx = text.indexOf(end, afterBegin);
  if (endIdx === -1) return null;
  return text.slice(afterBegin, endIdx).trim();
}

function fromCodeFence(text: string): string | null {
  // Prefer a ```json fence, fall back to the first generic fence that looks
  // like an object.
  const jsonFence = /```(?:json)?\s*([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;
  while ((match = jsonFence.exec(text)) !== null) {
    const body = match[1].trim();
    if (body.startsWith("{") && body.endsWith("}")) {
      return body;
    }
  }
  return null;
}

function tryParse(rawJson: string, strategy: ExtractStrategy): ExtractResult {
  try {
    return { json: JSON.parse(rawJson), rawJson, strategy };
  } catch (err) {
    throw new ExtractError(
      "JSON_PARSE_FAILED",
      "추출한 텍스트를 JSON으로 파싱하지 못했습니다.",
      err instanceof Error ? err.message : String(err),
    );
  }
}

export function extractVideoSpecJson(input: string): ExtractResult {
  const text = (input ?? "").trim();
  if (text.length === 0) {
    throw new ExtractError("NO_JSON_FOUND", "입력이 비어 있습니다.");
  }

  for (const d of DELIMITERS) {
    const body = between(text, d.begin, d.end);
    if (body !== null) {
      if (body.length === 0) {
        throw new ExtractError(
          "NO_JSON_FOUND",
          `${d.begin} 구분자는 있으나 내용이 비어 있습니다.`,
        );
      }
      return tryParse(body, d.strategy);
    }
  }

  const fenced = fromCodeFence(text);
  if (fenced !== null) {
    return tryParse(fenced, "code_fence");
  }

  // Last resort: the whole textarea is JSON. Trim any stray prose by locating
  // the first { and the matching last }.
  if (text.startsWith("{")) {
    return tryParse(text, "raw_json");
  }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return tryParse(text.slice(firstBrace, lastBrace + 1), "raw_json");
  }

  throw new ExtractError(
    "NO_JSON_FOUND",
    "VIDEO_SPEC_JSON 구분자나 JSON 블록을 찾지 못했습니다.",
  );
}

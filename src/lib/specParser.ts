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
  /** True when the JSON was cut off and we best-effort repaired it. */
  repaired?: boolean;
  /** Human note describing what was repaired (for the UI banner). */
  repairNote?: string;
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
    // Best-effort recovery: the answer was probably cut off mid-paste.
    const repaired = repairTruncatedJson(rawJson);
    if (repaired) {
      return { json: repaired.value, rawJson, strategy, repaired: true, repairNote: repaired.note };
    }
    throw new ExtractError(
      "JSON_PARSE_FAILED",
      "추출한 텍스트를 JSON으로 파싱하지 못했습니다.",
      err instanceof Error ? err.message : String(err),
    );
  }
}

/**
 * Returns the closing brackets needed to balance `s`, or null if the scan ends
 * inside an open string literal (unsafe to close at this cut point).
 */
function neededClosers(s: string): string | null {
  let inStr = false;
  let esc = false;
  const stack: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") stack.push("}");
    else if (c === "[") stack.push("]");
    else if (c === "}" || c === "]") stack.pop();
  }
  if (inStr) return null;
  return stack.reverse().join("");
}

/**
 * Best-effort repair for truncated/cut-off JSON (a frequent failure when a long
 * chat answer is copied and the tail is lost). Walks back from the end to the
 * last point where, after closing still-open brackets, the prefix parses — so a
 * spec cut mid-scene still yields all the complete scenes. null if unrecoverable.
 */
export function repairTruncatedJson(raw: string): { value: unknown; note: string } | null {
  const s = raw.trim();
  if (!s.startsWith("{") && !s.startsWith("[")) return null;
  // Bound the search: an unparseable tail longer than this is implausible.
  const minEnd = Math.max(1, s.length - 20000);
  for (let end = s.length; end >= minEnd; end--) {
    const ch = s[end - 1];
    // Only attempt at plausible value-endings to keep this cheap.
    if (ch !== "}" && ch !== "]" && ch !== '"' && !(ch >= "0" && ch <= "9")) continue;
    const cand = s.slice(0, end).replace(/,\s*$/, "");
    const closers = neededClosers(cand);
    if (closers === null) continue; // cut inside a string — keep trimming
    try {
      const value = JSON.parse(cand + closers);
      return {
        value,
        note:
          end < s.length
            ? "JSON이 중간에 잘려 있어, 완전한 부분까지만 살려서 복구했어요(불완전한 마지막 항목은 제외)."
            : "JSON 끝의 괄호를 보정해 복구했어요.",
      };
    } catch {
      /* keep trimming back to an earlier complete boundary */
    }
  }
  return null;
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

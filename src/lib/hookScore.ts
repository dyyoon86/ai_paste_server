import type { VideoSpec } from "./videoSpecSchema";

/**
 * Heuristic 0-100 hook quality score for the first scene (section 5 of make.md).
 * No LLM is called; this is fully deterministic & testable.
 */

export type HookGrade = "매우 좋음" | "좋음" | "보통" | "약함";

export interface HookSignal {
  label: string;
  delta: number;
  matched: string[];
}

export interface HookScoreResult {
  score: number;
  grade: HookGrade;
  weak: boolean;
  signals: HookSignal[];
  warning?: string;
  firstSceneText: string;
}

const QUESTION_WORDS = ["아직도", "왜", "혹시", "모르면", "해봤나요", "해봤어", "있나요"];
const PROBLEM_WORDS = ["막막", "귀찮", "반복", "시간 낭비", "시간낭비", "안 된다", "안된다", "어렵"];
const TWIST_WORDS = ["사실", "그런데", "하지만", "진짜 문제는", "알고 보면", "반전"];
const RESULT_WORDS = ["바로", "3초", "자동", "완성", "MP4", "만들어집니다", "끝", "즉시"];
const EXPLAINER_PATTERN = /오늘은[\s\S]*알아보겠습니다/;
const ABSTRACT_WORDS = ["효율", "최적화", "시너지", "패러다임", "인사이트", "가치", "혁신"];

function countMatches(text: string, words: string[]): string[] {
  const lower = text.toLowerCase();
  return words.filter((w) => lower.includes(w.toLowerCase()));
}

function hasVisualContrast(text: string): boolean {
  const contrastMarkers = [
    "before",
    "after",
    "전",
    "후",
    "손작업",
    "자동화",
    "빈 화면",
    "빈화면",
    "완성본",
    "→",
    "vs",
  ];
  const lower = text.toLowerCase();
  let hits = 0;
  for (const m of contrastMarkers) {
    if (lower.includes(m.toLowerCase())) hits += 1;
  }
  return hits >= 2;
}

function gradeFor(score: number): HookGrade {
  if (score >= 90) return "매우 좋음";
  if (score >= 75) return "좋음";
  if (score >= 60) return "보통";
  return "약함";
}

export function scoreHook(spec: VideoSpec): HookScoreResult {
  const first = spec.scenes[0];
  const screenText = first?.screen_text ?? "";
  const narration = first?.narration ?? "";
  const combined = `${screenText} ${narration}`;

  const signals: HookSignal[] = [];
  let score = 0;

  const add = (label: string, delta: number, matched: string[]) => {
    if (matched.length > 0 || delta < 0) {
      score += delta;
      signals.push({ label, delta, matched });
    }
  };

  // --- bonuses ---
  add("질문형", +20, countMatches(combined, QUESTION_WORDS));
  add("문제형", +20, countMatches(combined, PROBLEM_WORDS));
  add("반전형", +20, countMatches(combined, TWIST_WORDS));
  add("결과형", +20, countMatches(combined, RESULT_WORDS));

  const len = screenText.trim().length;
  if (len >= 4 && len <= 16) {
    score += 10;
    signals.push({ label: "짧은 문장(4~16자)", delta: +10, matched: [`${len}자`] });
  }

  if (hasVisualContrast(combined)) {
    score += 10;
    signals.push({ label: "시각적 대비", delta: +10, matched: ["대비 표현"] });
  }

  // --- penalties ---
  if (EXPLAINER_PATTERN.test(combined)) {
    score -= 30;
    signals.push({ label: "설명형 도입(\"오늘은 ~ 알아보겠습니다\")", delta: -30, matched: ["설명형"] });
  }
  if (len > 24) {
    score -= 20;
    signals.push({ label: "너무 긴 screen_text", delta: -20, matched: [`${len}자`] });
  }
  const abstractHits = countMatches(combined, ABSTRACT_WORDS);
  const concreteHits =
    countMatches(combined, RESULT_WORDS).length +
    countMatches(combined, PROBLEM_WORDS).length;
  if (abstractHits.length > 0 && concreteHits === 0) {
    score -= 20;
    signals.push({ label: "추상적 표현만 있음", delta: -20, matched: abstractHits });
  }
  // First scene reads as explanatory rather than a hook (long narration, no hook signals on screen text).
  const hasHookSignal = signals.some((s) => s.delta > 0 && s.matched.length > 0);
  if (!hasHookSignal && narration.length > 30) {
    score -= 20;
    signals.push({ label: "첫 장면이 설명형", delta: -20, matched: ["훅 신호 없음"] });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const grade = gradeFor(score);
  const weak = score < 60;

  return {
    score,
    grade,
    weak,
    signals,
    warning: weak
      ? "첫 3초 훅이 약합니다. 그래도 렌더링할 수 있지만, 조회 유지율이 낮을 수 있습니다."
      : undefined,
    firstSceneText: screenText,
  };
}

/**
 * Rule-based hook improvement suggestions (section 5.2). No LLM.
 * Returns exactly 3 suggestions tailored to the detected weakness.
 */
export function suggestHooks(spec: VideoSpec): string[] {
  const topic = (spec.core_message || spec.title || "").trim();
  const base = [
    "아직도 이걸 손으로 하나요?",
    "내용만 넣었는데 영상이 나왔습니다",
    "빈 화면에서 시작하지 마세요",
  ];

  const result = scoreHook(spec);
  const dynamic: string[] = [];

  // Tailor by missing signal type.
  const hasQuestion = result.signals.some((s) => s.label === "질문형" && s.matched.length);
  const hasProblem = result.signals.some((s) => s.label === "문제형" && s.matched.length);
  const hasResult = result.signals.some((s) => s.label === "결과형" && s.matched.length);

  if (!hasQuestion) dynamic.push("아직도 이걸 직접 만드나요?");
  if (!hasProblem) dynamic.push("매번 처음부터가 제일 막막하죠");
  if (!hasResult) dynamic.push("내용만 넣으면 3초 만에 완성됩니다");
  if (topic) dynamic.push(`${topic.slice(0, 14)}, 이렇게 끝납니다`);

  const merged = [...dynamic, ...base];
  // Dedupe while preserving order, return first 3.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of merged) {
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
    if (out.length === 3) break;
  }
  return out;
}

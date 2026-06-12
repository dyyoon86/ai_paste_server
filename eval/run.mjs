// 측정 루프 러너: 골든셋의 각 주제로 스킬이 스펙을 생성하고(생성 AI),
// 채점기(구조 자동검사 + 별도 critic AI)가 점수를 매겨 평균을 낸다.
// "측정 없는 진화 금지" — 스킬을 바꿀 때마다 이 평균이 오르는지로 채택을 결정한다.
//
// 사용: node eval/run.mjs [--n N] [--no-critic]
//   --n N        : 골든셋 앞에서 N개만 (기본 전체)
//   --no-critic  : LLM 품질채점 생략(구조점수만, claude CLI 불필요)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { structuralScore, criticPrompt } from "./evaluate.mjs";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, "..");
const args = process.argv.slice(2);
const N = args.includes("--n") ? parseInt(args[args.indexOf("--n") + 1], 10) : 0;
const NO_CRITIC = args.includes("--no-critic");

const golden = JSON.parse(readFileSync(path.join(DIR, "golden_set.json"), "utf8"));
const SKILL = readFileSync(path.join(ROOT, "skill", "SKILL.md"), "utf8");
const RUBRIC = readFileSync(path.join(DIR, "rubric.md"), "utf8");
const topics = N > 0 ? golden.topics.slice(0, N) : golden.topics;

const CLAUDE = process.env.CLAUDE_BIN || "claude";

/** claude CLI를 1회 호출해 텍스트 결과를 받는다. */
function callClaude(prompt) {
  const out = execFileSync(CLAUDE, ["-p", prompt, "--output-format", "json"], {
    encoding: "utf8", maxBuffer: 16 * 1024 * 1024, timeout: 180000,
  });
  try { return JSON.parse(out).result ?? out; } catch { return out; }
}

function extractSpec(text) {
  const m = [...text.matchAll(/---BEGIN_VIDEO_SPEC_JSON---\s*([\s\S]*?)---END_VIDEO_SPEC_JSON---/g)];
  for (const b of m) { try { return JSON.parse(b[1]); } catch {} }
  // 구분자 없이 JSON만 준 경우
  const j = text.match(/\{[\s\S]*\}/);
  if (j) { try { return JSON.parse(j[0]); } catch {} }
  return null;
}

const GEN_PROMPT = (topic) =>
  `아래는 영상 스펙 생성 규칙(스킬 문서)다. 읽고 그 규칙대로 동작해라.\n\n<SKILL>\n${SKILL}\n</SKILL>\n\n` +
  `이제 주제 "${topic}" 로 **완전히 새로운** VIDEO_SPEC_JSON을 만들어라.\n` +
  `- 스킬 안의 예시(AI 코딩/THE OLD WAY 등)를 절대 그대로 베끼지 마라. 주제에 맞게 새로 작성.\n` +
  `- 설명·서론 없이 ---BEGIN_VIDEO_SPEC_JSON--- 와 ---END_VIDEO_SPEC_JSON--- 사이에 유효한 JSON만.`;

const results = [];
console.log(`골든셋 ${topics.length}개 측정 시작${NO_CRITIC ? " (구조점수만)" : ""}\n`);

for (const topic of topics) {
  process.stdout.write(`▶ ${topic}\n`);
  let spec = null, gerr = null;
  try { spec = extractSpec(callClaude(GEN_PROMPT(topic))); } catch (e) { gerr = String(e.message || e); }
  if (!spec) { console.log(`  ✗ 생성 실패 ${gerr ?? ""}`); results.push({ topic, struct: 0, quality: 0, total: 0, fail: true }); continue; }

  const st = structuralScore(spec);
  let quality = 0, axes = null, qissues = [];
  if (!NO_CRITIC) {
    try {
      const c = JSON.parse((callClaude(criticPrompt(spec, RUBRIC)).match(/\{[\s\S]*\}/) || ["{}"])[0]);
      quality = Math.max(0, Math.min(50, c.quality ?? 0)); axes = c.axes ?? null; qissues = c.issues ?? [];
    } catch (e) { qissues = ["critic 파싱 실패"]; }
  }
  const total = st.score + quality;
  results.push({ topic, struct: st.score, quality, total, graphicRatio: st.graphicRatio, structIssues: st.issues, axes, qissues });
  console.log(`  구조 ${st.score}/50  품질 ${quality}/50  → 합 ${total}/100  (graphic ${st.graphicRatio}%)`);
  if (st.issues.length) console.log("    구조이슈: " + st.issues.slice(0, 4).join(" / "));
}

const avgStruct = avg(results.map((r) => r.struct));
const avgQual = avg(results.map((r) => r.quality));
const avgTotal = avg(results.map((r) => r.total));
console.log(`\n=== 평균 ===\n구조 ${avgStruct.toFixed(1)}/50  품질 ${avgQual.toFixed(1)}/50  → 총 ${avgTotal.toFixed(1)}/100`);

// 결과 저장(버전 비교용 — "측정" 기록)
let sha = "nogit";
try { sha = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim(); } catch {}
const resDir = path.join(DIR, "results");
if (!existsSync(resDir)) mkdirSync(resDir, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const file = path.join(resDir, `${ts}_${sha}.json`);
writeFileSync(file, JSON.stringify({ sha, ts, goldenVersion: golden.version, avgStruct, avgQual, avgTotal, results }, null, 2));
console.log(`\n기록 저장: eval/results/${path.basename(file)}`);

function avg(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }

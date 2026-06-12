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
// --skill <path> 로 다른 두뇌(예: skill/SKILL_PRO.md)를 측정. 기본은 skill/SKILL.md.
const SKILL_REL = args.includes("--skill") ? args[args.indexOf("--skill") + 1] : "skill/SKILL.md";
const SKILL_PATH = path.isAbsolute(SKILL_REL) ? SKILL_REL : path.join(ROOT, SKILL_REL);
const SKILL = readFileSync(SKILL_PATH, "utf8");
const SKILL_TAG = path.basename(SKILL_PATH).replace(/\.md$/, "");
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

const RUNS = args.includes("--runs") ? Math.max(1, parseInt(args[args.indexOf("--runs") + 1], 10)) : 1;
const resDir = path.join(DIR, "results");
if (!existsSync(resDir)) mkdirSync(resDir, { recursive: true });
let sha = "nogit";
try { sha = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim(); } catch {}

// ★ 재개 가능(resumable): 진행 중 캐시에 (run,topic)별 결과를 즉시 저장.
//   세션이 죽어도 다시 실행하면 끝난 것은 건너뛰고 이어서 완료한다.
const cacheFile = path.join(resDir, `.cache_${SKILL_TAG}_${sha}_r${RUNS}_n${topics.length}.json`);
let cache = {};
if (existsSync(cacheFile)) { try { cache = JSON.parse(readFileSync(cacheFile, "utf8")); } catch {} }
const key = (run, topic) => `${run}::${topic}`;

console.log(`[${SKILL_TAG}] 골든셋 ${topics.length}개 × ${RUNS}회 측정${NO_CRITIC ? " (구조점수만)" : ""}  (resumable)\n`);

function scoreTopic(topic) {
  let spec = null;
  try { spec = extractSpec(callClaude(GEN_PROMPT(topic))); } catch {}
  if (!spec) return { topic, struct: 0, quality: 0, total: 0, fail: true };
  const st = structuralScore(spec);
  let quality = 0;
  if (!NO_CRITIC) {
    try {
      const c = JSON.parse((callClaude(criticPrompt(spec, RUBRIC)).match(/\{[\s\S]*\}/) || ["{}"])[0]);
      quality = Math.max(0, Math.min(50, c.quality ?? 0));
    } catch {}
  }
  return { topic, struct: st.score, quality, total: st.score + quality, graphicRatio: st.graphicRatio, structIssues: st.issues };
}

const runAverages = [];
for (let run = 0; run < RUNS; run++) {
  console.log(`--- RUN ${run + 1}/${RUNS} ---`);
  const results = [];
  for (const topic of topics) {
    const k = key(run, topic);
    let r = cache[k];
    if (r) { console.log(`  ⟳ ${topic} (캐시 ${r.total})`); }
    else {
      r = scoreTopic(topic);
      cache[k] = r; writeFileSync(cacheFile, JSON.stringify(cache)); // 즉시 저장(재개용)
      console.log(`  ${r.fail ? "✗ 생성실패" : `구조 ${r.struct} 품질 ${r.quality} → ${r.total}`}  | ${topic}`);
    }
    results.push(r);
  }
  const a = { struct: avg(results.map((x) => x.struct)), qual: avg(results.map((x) => x.quality)), total: avg(results.map((x) => x.total)), results };
  runAverages.push(a);
  console.log(`  run${run + 1} 평균: ${a.total.toFixed(1)}/100\n`);
}

const totals = runAverages.map((r) => r.total);
const mean = avg(totals), sd = std(totals);
console.log(`=== ${RUNS}회 종합 ===`);
runAverages.forEach((r, i) => console.log(`  run${i + 1}: 총 ${r.total.toFixed(1)} (구조 ${r.struct.toFixed(1)} 품질 ${r.qual.toFixed(1)})`));
console.log(`평균 ${mean.toFixed(1)} ± ${sd.toFixed(1)}  (구조 ${avg(runAverages.map((r) => r.struct)).toFixed(1)}  품질 ${avg(runAverages.map((r) => r.qual)).toFixed(1)})`);
console.log(`→ 개선이 "진짜"이려면 평균 차이가 ±${(sd * 2).toFixed(1)}(2σ)를 넘어야 함.`);

const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const file = path.join(resDir, `${ts}_${SKILL_TAG}_${sha}_r${RUNS}.json`);
writeFileSync(file, JSON.stringify({ sha, ts, goldenVersion: golden.version, runs: RUNS, mean, sd, runAverages }, null, 2));
try { if (existsSync(cacheFile)) execFileSync("rm", ["-f", cacheFile]); } catch {}
console.log(`\n기록 저장: eval/results/${path.basename(file)}`);

function avg(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }
function std(a) { if (a.length < 2) return 0; const m = avg(a); return Math.sqrt(avg(a.map((x) => (x - m) ** 2))); }

// 채점기(검증 AI의 결정론적 파트) — VIDEO_SPEC을 받아 구조 점수 + 이슈를 낸다.
// "측정 없는 진화 금지": 스킬을 바꿀 때마다 골든셋 위에서 이 점수를 비교한다.
// 생성기와 분리된 별도 모듈(자기 시험 자기 채점 금지 원칙).

const GRAPHIC_TYPES = "bars flow checklist stat compare cards quote badge mismatch gauge ranking timeline progress versus".split(" ");
const ITEM_RANGE = {
  bars: [3, 5], progress: [2, 4], ranking: [3, 5], checklist: [2, 5], cards: [2, 4],
  flow: [2, 4], timeline: [3, 5], stat: [1, 3], compare: [2, 2], versus: [2, 2],
  gauge: [1, 1], quote: [1, 1], badge: [1, 1], mismatch: [2, 6],
};
const norm = (x) => (x || "").replace(/[^\p{L}\p{N}]/gu, "");

/** graphic label이 narration에서 발화되는지 (실제 매칭 로직과 동일). */
function labelInNarration(label, narration) {
  const toks = (label || "").replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter((w) => w.length >= 2);
  const nw = narration.split(/\s+/).map(norm);
  return toks.some((t) => nw.some((w) => w.includes(t) || t.includes(w)));
}

/** 결정론적 구조 점수 (0~50). 각 항목 위반 시 감점 + 이슈. */
export function structuralScore(spec) {
  const issues = [];
  let score = 50;
  const cut = (pts, msg) => { score -= pts; issues.push(`-${pts} ${msg}`); };

  // 기본 필드
  if (!spec || spec.schema !== "remotion.one_click_video.v1") cut(6, "schema 불일치");
  if (!spec.title) cut(4, "title 없음");
  else {
    if (/\*/.test(spec.title)) cut(3, "title에 별표");
    if (spec.title.length < 10 || spec.title.length > 22) cut(2, `title 길이 ${spec.title?.length}`);
  }
  const scenes = Array.isArray(spec.scenes) ? spec.scenes : [];
  if (scenes.length < 1 || scenes.length > 30) cut(6, `scenes 수 ${scenes.length}`);

  // 타이밍
  if (scenes[0] && scenes[0].start !== 0) cut(3, "첫 scene start≠0");
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    if (s.end <= s.start) cut(2, `s${s.id} end≤start`);
    if (i > 0 && Math.abs(s.start - scenes[i - 1].end) > 0.001) cut(1, `s${s.id} 타이밍 겹침/공백`);
  }
  if (scenes.length && Math.abs(scenes[scenes.length - 1].end - spec.duration_seconds) > 0.01) cut(2, "마지막 end≠duration");

  // 씬별 스타일/하드제약
  let graphicCount = 0;
  for (const s of scenes) {
    const hasIcon = !!(s.icon && s.icon.trim());
    const hasG = !!(s.graphic && s.graphic.items && s.graphic.items.length);
    if (hasIcon === hasG) cut(3, `s${s.id} icon/graphic XOR 위반`);
    if (!/^[A-Z0-9 ]+$/.test(s.visual_direction || "")) cut(2, `s${s.id} 키커 영문대문자 아님`);
    const stars = (s.screen_text?.match(/\*/g) || []).length;
    if (stars % 2 !== 0) cut(2, `s${s.id} 별표 짝 안맞음`);
    if (stars / 2 > 2) cut(1, `s${s.id} 별표 3쌍+`);
    if (!["cut", "fade"].includes(s.transition)) cut(2, `s${s.id} 전환 ${s.transition}`);
    if (hasG) {
      graphicCount++;
      const t = s.graphic.type;
      if (!GRAPHIC_TYPES.includes(t)) cut(2, `s${s.id} graphic type ${t}`);
      const rng = ITEM_RANGE[t];
      if (rng && (s.graphic.items.length < rng[0] || s.graphic.items.length > rng[1])) cut(1, `s${s.id} ${t} item수 ${s.graphic.items.length}`);
      if (t === "mismatch" && s.graphic.items.length % 2 !== 0) cut(2, `s${s.id} mismatch 홀수`);
      for (const it of s.graphic.items) {
        if (it.value != null && typeof it.value !== "number") cut(1, `s${s.id} value 숫자아님`);
        if (!labelInNarration(it.label, s.narration || "")) cut(2, `s${s.id} 라벨 "${it.label}" 음성싱크 안됨`);
      }
    }
  }
  // graphic 비율 30~60%
  const ratio = scenes.length ? graphicCount / scenes.length : 0;
  if (ratio < 0.25 || ratio > 0.65) cut(2, `graphic 비율 ${Math.round(ratio * 100)}%`);

  return { score: Math.max(0, score), max: 50, issues, graphicRatio: Math.round(ratio * 100) };
}

/** 채점기(LLM critic)에게 줄 프롬프트 — 품질 50점. 생성기와 분리된 별도 호출. */
export function criticPrompt(spec, rubric) {
  return `${rubric}

아래 VIDEO_SPEC_JSON을 위 루브릭으로 채점해라. **JSON 한 줄만** 출력:
{"quality":<0-50 정수>,"axes":{"hook":<0-10>,"story":<0-10>,"graphic":<0-10>,"pacing":<0-10>,"polish":<0-10>},"issues":["..."]}

SPEC:
${JSON.stringify(spec)}`;
}

// CLI: node evaluate.mjs <spec.json>  → 구조 점수만 (빠른 점검, claude 불필요)
if (process.argv[1] && process.argv[1].endsWith("evaluate.mjs")) {
  const fs = await import("node:fs");
  const path = process.argv[2];
  if (!path) { console.error("usage: node evaluate.mjs <spec.json>"); process.exit(1); }
  const spec = JSON.parse(fs.readFileSync(path, "utf8"));
  const r = structuralScore(spec);
  console.log(`구조점수: ${r.score}/${r.max} | graphic ${r.graphicRatio}%`);
  if (r.issues.length) console.log("이슈:\n  " + r.issues.join("\n  "));
  else console.log("이슈 없음 ✅");
}

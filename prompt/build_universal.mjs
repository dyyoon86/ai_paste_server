// skill/SKILL.md → prompt/UNIVERSAL_PROMPT.md (그리고 SKILL_PRO.md → UNIVERSAL_PROMPT_PRO.md) 생성.
// claude.ai Skills 전용 frontmatter를 떼고, 아무 챗봇(ChatGPT/Gemini/Claude)에
// 붙여넣어 쓸 수 있는 범용 프롬프트로 변환한다. (규칙 본문은 스킬과 100% 동일)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, "..");

const header = `# PasteMotion 영상 스펙 생성 프롬프트 (범용)

> **사용법:** 이 문서 전체를 ChatGPT·Gemini·Claude 등 **아무 챗봇**에 붙여넣고,
> 맨 아래 \`주제:\` 한 줄에 만들고 싶은 영상 주제를 적어 보내세요.
> 그러면 PasteMotion 앱에 붙여넣을 \`VIDEO_SPEC_JSON\` 한 덩어리가 나옵니다.
> (어떤 모델이든 출력 **형식(JSON 스키마)**은 동일하게 나오도록 설계됨. 내용·품질은 모델마다 다를 수 있음.)

---

`;

const footer = `

---

주제: `;

/** SKILL 마크다운을 모델 중립 범용 프롬프트로 변환한다. */
function toUniversal(md) {
  // 1) frontmatter(--- ... ---) 제거
  md = md.replace(/^---\n[\s\S]*?\n---\n/, "");
  // 2) Claude 전용 문구 → 모델 중립
  md = md
    .replace(/# Remotion Shorts Spec[^\n]*\n/, "")
    .replace(/무료 Claude 환경에서는 영상을 직접 만들 수 없으므로, ?/g, "")
    .replace(
      /너는 숏폼 영상 \*\*기획 두뇌\*\*다\.[\s\S]*?MP4로 렌더한다\./,
      "너는 숏폼 영상 **기획 두뇌**다. 너의 유일한 산출물은 **PasteMotion 앱에 붙여넣을 `VIDEO_SPEC_JSON`** 하나다. 사용자는 이 JSON을 복사해 PasteMotion 앱에 붙여넣어 MP4로 렌더한다.",
    )
    .replace(/Remotion Paste Server\(PasteMotion\)/g, "PasteMotion");
  return header + md.trim() + footer;
}

const targets = [
  { src: path.join(ROOT, "skill", "SKILL.md"), out: path.join(DIR, "UNIVERSAL_PROMPT.md") },
  { src: path.join(ROOT, "skill", "SKILL_PRO.md"), out: path.join(DIR, "UNIVERSAL_PROMPT_PRO.md") },
];

for (const t of targets) {
  if (!existsSync(t.src)) continue;
  writeFileSync(t.out, toUniversal(readFileSync(t.src, "utf8")));
  console.log("생성됨:", path.relative(ROOT, t.out));
}

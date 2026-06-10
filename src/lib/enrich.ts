import type { VideoSpec } from "./videoSpecSchema";

/**
 * Output harness: the "brain" (a claude.ai skill) sometimes omits per-scene
 * `icon`/`points`. Rather than depend on perfect brain output, we normalize the
 * validated spec so every scene renders a rich center even when those fields are
 * missing. Brain-provided values always win — we only FILL gaps.
 */

const ICON_RULES: Array<[RegExp, string]> = [
  [/완료|성공|안전|지켜|통과|끝났|마무리/, "✅"],
  [/차단|막아|중단|정지|멈/, "🛑"],
  [/위험|경고|주의|오류|실패|불능|이상거래|이상 거래/, "⚠️"],
  [/사기|탐지|수상|fraud/i, "🚨"],
  [/은행|뱅킹/, "🏦"],
  [/정산|결제|이체|자금|입금|금액|수익|매출|돈/, "💰"],
  [/카드|신용/, "💳"],
  [/분석|데이터|통계|지표|점수|패턴|그래프/, "📊"],
  [/\bai\b|머신러닝|모델|자동|알고리즘/i, "🤖"],
  [/실시간|즉시|0\.\d|초\b|시간|속도/, "⏱️"],
  [/위치|지역|해외|국가/, "📍"],
  [/규칙|룰|단계|절차|흐름|프로세스/, "📋"],
  [/알림|통지/, "🔔"],
  [/방어|보호|방패/, "🛡️"],
  [/증가|수백만|폭증|성장|급증/, "📈"],
  [/질문|왜|무엇|어떻게|\?/, "❓"],
  [/아이디어|꿀팁|노하우|비결/, "💡"],
];

/** Pick an emoji for a scene from its text (returns "" if nothing fits). */
export function pickIcon(scene: { screen_text?: string; narration?: string; visual_direction?: string }): string {
  const hay = `${scene.screen_text ?? ""} ${scene.narration ?? ""} ${scene.visual_direction ?? ""}`;
  for (const [re, emoji] of ICON_RULES) if (re.test(hay)) return emoji;
  return "";
}

/** Derive up to 3 short summary points from a scene's narration/screen_text. */
export function derivePoints(scene: { screen_text?: string; narration?: string }): string[] {
  const text = (scene.narration ?? "").replace(/\s+/g, " ").trim();
  const out: string[] = [];
  if (text) {
    const segs = text
      .split(/[.!?。…\n]+/)
      .flatMap((s) => s.split(/[,·、:→]/))
      .map((s) => s.trim())
      .filter(Boolean);
    for (const seg of segs) {
      if (out.length >= 3) break;
      let p = seg;
      if (p.length > 12) {
        const cut = p.slice(0, 12);
        const sp = cut.lastIndexOf(" ");
        p = (sp > 4 ? cut.slice(0, sp) : cut).trim();
      }
      // strip trailing josa-ish noise lightly; keep it simple
      if (p.length >= 2 && !out.includes(p)) out.push(p);
    }
  }
  if (out.length === 0 && scene.screen_text) out.push(scene.screen_text.trim());
  return out.slice(0, 3);
}

/** Fill missing icon/points per scene (brain values take priority). */
export function enrichSpec(spec: VideoSpec): VideoSpec {
  return {
    ...spec,
    scenes: spec.scenes.map((s) => ({
      ...s,
      icon: s.icon && s.icon.trim() ? s.icon : pickIcon(s),
      points: s.points && s.points.filter((p) => p && p.trim()).length > 0 ? s.points : derivePoints(s),
    })),
  };
}

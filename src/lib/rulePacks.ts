import type { VideoSpec } from "./videoSpecSchema";

/**
 * Remotion RulePacks (section 6 of make.md).
 *
 * A RulePack is NOT a hand-rolled design template. It is a *combination of
 * Remotion skill docs* plus deterministic composition / visual / animation
 * defaults. Each pack links to real markdown doc ids that live in
 * src/content/remotion-skills/rules (verified at runtime against the manifest).
 */

export type SceneEnter = "fade" | "slide-up" | "zoom" | "wipe" | "pop";
export type TextEmphasis = "highlight" | "scale" | "underline" | "none";
export type TransitionKind = "cut" | "fade" | "slide" | "wipe" | "zoom";

export interface RemotionRulePack {
  id: string;
  name: string;
  description: string;
  bestFor: string[];
  requiredSkillDocIds: string[];
  optionalSkillDocIds: string[];
  compositionDefaults: {
    fps: number;
    width: number;
    height: number;
    durationInFrames: number;
  };
  visualDefaults: {
    background: string;
    surface: string;
    text: string;
    mutedText: string;
    accent: string;
    accent2: string;
    borderRadius: number;
    safeArea: number;
  };
  animationRules: {
    sceneEnter: SceneEnter;
    textEmphasis: TextEmphasis;
    transition: TransitionKind;
    easing: string;
  };
  remotionNotes: string[];
}

const BASE_COMPOSITION = { fps: 30, width: 1080, height: 1920, durationInFrames: 900 };

export const rulePacks: RemotionRulePack[] = [
  {
    id: "hook-first-short",
    name: "Hook First Short",
    description: "짧은 숏폼, 강한 첫 장면에 집중하는 기본 룰팩.",
    bestFor: ["짧은 숏폼", "강한 훅", "리텐션 중심"],
    requiredSkillDocIds: ["text-animations", "timing", "transitions", "sequencing"],
    optionalSkillDocIds: ["google-fonts", "measuring-text"],
    compositionDefaults: { ...BASE_COMPOSITION },
    visualDefaults: {
      background: "#0B0712",
      surface: "#171026",
      text: "#FFFFFF",
      mutedText: "#B6A6D6",
      accent: "#7C3AED",
      accent2: "#22D3EE",
      borderRadius: 28,
      safeArea: 96,
    },
    animationRules: {
      sceneEnter: "pop",
      textEmphasis: "scale",
      transition: "fade",
      easing: "Easing.bezier(0.16, 1, 0.3, 1)",
    },
    remotionNotes: [
      "첫 장면은 spring()으로 강하게 등장시킨다.",
      "screen_text는 useCurrentFrame 기반 scale-in으로 강조한다.",
    ],
  },
  {
    id: "clean-explainer",
    name: "Clean Explainer",
    description: "설명/교육형 콘텐츠를 또렷하게 전달하는 룰팩.",
    bestFor: ["설명", "교육", "튜토리얼", "강의"],
    requiredSkillDocIds: ["sequencing", "text-animations", "google-fonts", "measuring-text"],
    optionalSkillDocIds: ["timing", "captions"],
    compositionDefaults: { ...BASE_COMPOSITION },
    visualDefaults: {
      background: "#0E1117",
      surface: "#161B22",
      text: "#F0F6FC",
      mutedText: "#9DA7B3",
      accent: "#3B82F6",
      accent2: "#22C55E",
      borderRadius: 20,
      safeArea: 110,
    },
    animationRules: {
      sceneEnter: "slide-up",
      textEmphasis: "highlight",
      transition: "slide",
      easing: "Easing.out(Easing.cubic)",
    },
    remotionNotes: [
      "Sequence로 장면을 순차 배치하고 텍스트는 슬라이드 업으로 도입한다.",
      "measuring-text 권장 방식으로 줄바꿈/폰트 크기를 안정화한다.",
    ],
  },
  {
    id: "product-demo",
    name: "Product Demo",
    description: "제품/서비스 기능을 보여주는 룰팩.",
    bestFor: ["제품", "서비스", "기능 소개", "데모"],
    requiredSkillDocIds: ["images", "videos", "sequencing", "transitions"],
    optionalSkillDocIds: ["text-animations", "timing"],
    compositionDefaults: { ...BASE_COMPOSITION },
    visualDefaults: {
      background: "#070A12",
      surface: "#101727",
      text: "#FFFFFF",
      mutedText: "#9FB0C9",
      accent: "#06B6D4",
      accent2: "#7C3AED",
      borderRadius: 24,
      safeArea: 96,
    },
    animationRules: {
      sceneEnter: "zoom",
      textEmphasis: "scale",
      transition: "wipe",
      easing: "Easing.bezier(0.22, 1, 0.36, 1)",
    },
    remotionNotes: [
      "에셋이 있으면 Img/Video 컴포넌트로 배치한다.",
      "장면 전환은 wipe로 제품 화면 사이를 매끄럽게 잇는다.",
    ],
  },
  {
    id: "data-story",
    name: "Data Story",
    description: "숫자/리포트/인사이트를 강조하는 룰팩.",
    bestFor: ["데이터", "통계", "리포트", "인사이트", "숫자"],
    requiredSkillDocIds: ["timing", "measuring-text", "transitions", "images"],
    optionalSkillDocIds: ["text-animations", "sequencing"],
    compositionDefaults: { ...BASE_COMPOSITION },
    visualDefaults: {
      background: "#0A0F0D",
      surface: "#10211B",
      text: "#ECFDF5",
      mutedText: "#9CCBB8",
      accent: "#10B981",
      accent2: "#F59E0B",
      borderRadius: 18,
      safeArea: 110,
    },
    animationRules: {
      sceneEnter: "fade",
      textEmphasis: "scale",
      transition: "fade",
      easing: "Easing.out(Easing.ease)",
    },
    remotionNotes: [
      "숫자는 interpolate로 카운트업 느낌을 줄 수 있다.",
      "timing 규칙에 따라 핵심 수치에 머무는 시간을 길게 둔다.",
    ],
  },
  {
    id: "social-bold",
    name: "Social Bold",
    description: "SNS용 큰 타이포로 임팩트를 주는 룰팩.",
    bestFor: ["SNS", "바이럴", "큰 타이포", "릴스/쇼츠"],
    requiredSkillDocIds: ["text-animations", "timing", "transitions"],
    optionalSkillDocIds: ["google-fonts"],
    compositionDefaults: { ...BASE_COMPOSITION },
    visualDefaults: {
      background: "#120414",
      surface: "#22082A",
      text: "#FFFFFF",
      mutedText: "#E9B8F0",
      accent: "#EC4899",
      accent2: "#F59E0B",
      borderRadius: 32,
      safeArea: 84,
    },
    animationRules: {
      sceneEnter: "pop",
      textEmphasis: "highlight",
      transition: "zoom",
      easing: "Easing.bezier(0.34, 1.56, 0.64, 1)",
    },
    remotionNotes: [
      "타이포를 화면 가득 채우고 spring 오버슈트로 통통 튀게 한다.",
      "highlight 강조로 핵심 단어를 강하게 띄운다.",
    ],
  },
  {
    id: "premium-pitch",
    name: "Premium Pitch",
    description: "브랜드/피치덱 느낌의 고급스러운 룰팩.",
    bestFor: ["브랜드", "피치", "투자", "고급", "프리미엄"],
    requiredSkillDocIds: ["google-fonts", "timing", "transitions", "images"],
    optionalSkillDocIds: ["text-animations", "measuring-text"],
    compositionDefaults: { ...BASE_COMPOSITION },
    visualDefaults: {
      background: "#0A0A0B",
      surface: "#16161A",
      text: "#FAFAFA",
      mutedText: "#A1A1AA",
      accent: "#D4AF37",
      accent2: "#E5E7EB",
      borderRadius: 14,
      safeArea: 120,
    },
    animationRules: {
      sceneEnter: "fade",
      textEmphasis: "none",
      transition: "fade",
      easing: "Easing.inOut(Easing.cubic)",
    },
    remotionNotes: [
      "느린 페이드와 여백으로 고급스러움을 만든다.",
      "google-fonts 권장 방식으로 세리프/얇은 산세리프를 사용한다.",
    ],
  },
];

export function getRulePack(id: string): RemotionRulePack | undefined {
  return rulePacks.find((p) => p.id === id);
}

const ASPECT_TO_RES: Record<VideoSpec["aspect_ratio"], { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
  "1:1": { width: 1080, height: 1080 },
};

export interface RulePackRecommendation {
  pack: RemotionRulePack;
  reason: string;
  score: number;
}

const STAT_WORDS = ["통계", "데이터", "숫자", "리포트", "보고서", "인사이트", "%", "퍼센트", "증가", "감소"];
const PRODUCT_WORDS = ["제품", "서비스", "기능", "출시", "데모", "앱", "솔루션"];
const EDU_WORDS = ["강의", "튜토리얼", "교육", "방법", "배우", "설명", "가이드", "단계"];
const PITCH_WORDS = ["피치", "브랜드", "투자", "고급", "프리미엄", "비전", "런칭"];

function textCorpus(spec: VideoSpec): string {
  return [
    spec.title,
    spec.summary,
    spec.core_message,
    spec.style?.name,
    ...spec.scenes.map((s) => `${s.screen_text} ${s.narration} ${s.visual_direction}`),
  ]
    .join(" ")
    .toLowerCase();
}

function countAny(corpus: string, words: string[]): number {
  return words.reduce((n, w) => (corpus.includes(w.toLowerCase()) ? n + 1 : n), 0);
}

/**
 * Recommend rule packs given a spec. Returns all packs scored & sorted,
 * with the resolution applied from aspect_ratio. The top 3 are shown in the UI.
 */
export function recommendRulePacks(
  spec: VideoSpec,
  hookScore: number,
): RulePackRecommendation[] {
  const corpus = textCorpus(spec);
  const res = ASPECT_TO_RES[spec.aspect_ratio] ?? {
    width: spec.resolution.width,
    height: spec.resolution.height,
  };

  const statHits = countAny(corpus, STAT_WORDS);
  const productHits = countAny(corpus, PRODUCT_WORDS);
  const eduHits = countAny(corpus, EDU_WORDS);
  const pitchHits = countAny(corpus, PITCH_WORDS);
  const strongHook = hookScore >= 75;
  const isShort = spec.duration_seconds <= 35;

  const recs: RulePackRecommendation[] = rulePacks.map((pack) => {
    let score = 0;
    const reasons: string[] = [];

    switch (pack.id) {
      case "data-story":
        score += statHits * 12;
        if (statHits) reasons.push("숫자/통계/리포트 표현이 많음");
        break;
      case "product-demo":
        score += productHits * 12;
        if (spec.assets.length > 0) {
          score += 10;
          reasons.push("이미지/영상 에셋 포함");
        }
        if (productHits) reasons.push("제품/서비스/기능 설명");
        break;
      case "clean-explainer":
        score += eduHits * 12;
        if (eduHits) reasons.push("강의/튜토리얼/설명형");
        break;
      case "premium-pitch":
        score += pitchHits * 12;
        if (pitchHits) reasons.push("피치/브랜드/고급 톤");
        break;
      case "social-bold":
        if (strongHook && isShort) {
          score += 16;
          reasons.push("강한 훅 + 짧은 숏폼");
        }
        break;
      case "hook-first-short":
        score += 8; // default baseline
        if (strongHook) {
          score += 12;
          reasons.push("강한 첫 장면 훅");
        }
        if (isShort) reasons.push("짧은 숏폼에 적합");
        break;
    }

    if (reasons.length === 0) {
      reasons.push(pack.bestFor.slice(0, 2).join(", "));
    }

    return {
      pack: {
        ...pack,
        compositionDefaults: {
          ...pack.compositionDefaults,
          width: res.width,
          height: res.height,
          durationInFrames: Math.ceil(
            spec.duration_seconds * pack.compositionDefaults.fps,
          ),
        },
      },
      reason: reasons.join(" · "),
      score,
    };
  });

  recs.sort((a, b) => b.score - a.score);

  // Guarantee Hook First Short is at least present as a safe default if all
  // scores tie at baseline.
  return recs;
}

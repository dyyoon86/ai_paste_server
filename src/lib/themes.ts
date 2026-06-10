import type { VideoSpec } from "./videoSpecSchema";
import type { RemotionRulePack } from "./rulePacks";
import type {
  RenderStyle,
  ThemeTypography,
  ThemeLayout,
} from "./renderPlan";

/**
 * Design Theme library.
 *
 * Unlike the 6 skills-based rule packs (rulePacks.ts), a DesignTheme is a full
 * *visual identity*: it sets not just colors but typography (font/weight/case),
 * layout (alignment, kicker, decoration), and motion personality. Each theme is
 * still backed by real Remotion skill docs via requiredSkillDocIds.
 *
 * A DesignTheme is structurally a RenderStyle (RemotionRulePack + typography +
 * layout), so buildRenderPlan(spec, theme) works directly.
 */
export type DesignTheme = RenderStyle &
  Required<Pick<RenderStyle, "vibe" | "typography" | "layout">>;

const BASE_COMPOSITION = { fps: 30, width: 1080, height: 1920, durationInFrames: 900 };
const CORE_SKILLS = ["text-animations", "timing", "transitions", "sequencing"];

interface ThemeInput {
  id: string;
  name: string;
  vibe: string;
  description: string;
  bestFor: string[];
  skills?: string[];
  optionalSkills?: string[];
  colors: RemotionRulePack["visualDefaults"];
  animation: RemotionRulePack["animationRules"];
  typography: ThemeTypography;
  layout: ThemeLayout;
  notes?: string[];
}

function theme(t: ThemeInput): DesignTheme {
  return {
    id: t.id,
    name: t.name,
    vibe: t.vibe,
    description: t.description,
    bestFor: t.bestFor,
    requiredSkillDocIds: t.skills ?? CORE_SKILLS,
    optionalSkillDocIds: t.optionalSkills ?? ["google-fonts", "measuring-text"],
    compositionDefaults: { ...BASE_COMPOSITION },
    visualDefaults: t.colors,
    animationRules: t.animation,
    typography: t.typography,
    layout: t.layout,
    remotionNotes: t.notes ?? [],
  };
}

export const themes: DesignTheme[] = [
  theme({
    id: "midnight-pop",
    name: "Midnight Pop",
    vibe: "어두운 배경에 보라빛, 통통 튀는 기본 숏폼",
    description: "다크 + 보라 글로우, spring 등장으로 강한 첫 장면.",
    bestFor: ["숏폼", "강한 훅", "범용"],
    colors: { background: "#0B0712", surface: "#171026", text: "#FFFFFF", mutedText: "#B6A6D6", accent: "#7C3AED", accent2: "#22D3EE", borderRadius: 28, safeArea: 96 },
    animation: { sceneEnter: "pop", textEmphasis: "scale", transition: "fade", easing: "Easing.bezier(0.16,1,0.3,1)" },
    typography: { fontId: "sans", weightHeadline: 900, upper: false, letterSpacing: -1, headlineScale: 1, italic: false },
    layout: { align: "center", kicker: false, accentBar: false, chip: "number", decoration: "none", outline: false, glow: 0.7, isLight: false },
  }),
  theme({
    id: "bold-sport",
    name: "Bold Sport",
    vibe: "나이키풍 임팩트 — 초대형 헤비 타이포, 좌하단, 볼트 컬러",
    description: "Black Han Sans 초대형 타이포 + 볼트 액센트 바, 좌하단 배치.",
    bestFor: ["스포츠", "동기부여", "강렬한 메시지", "브랜드 임팩트"],
    skills: ["text-animations", "timing", "transitions"],
    colors: { background: "#08090A", surface: "#121316", text: "#FFFFFF", mutedText: "#9AA0A6", accent: "#D7FF3B", accent2: "#FF3B30", borderRadius: 0, safeArea: 84 },
    animation: { sceneEnter: "slide-up", textEmphasis: "scale", transition: "zoom", easing: "Easing.bezier(0.22,1,0.36,1)" },
    typography: { fontId: "impact", weightHeadline: 400, upper: true, letterSpacing: -2, headlineScale: 1.28, italic: false },
    layout: { align: "bottom", kicker: true, accentBar: true, chip: "none", decoration: "none", outline: false, glow: 0.35, isLight: false },
  }),
  theme({
    id: "clean-tech",
    name: "Clean Tech",
    vibe: "Anthropic/Claude풍 — 크림 배경, 차분한 코랄, 정갈한 산세리프",
    description: "밝은 크림 배경 + IBM Plex + 코랄 액센트, 여백 중심.",
    bestFor: ["테크", "제품 소개", "B2B", "신뢰감"],
    skills: ["text-animations", "timing", "google-fonts", "measuring-text"],
    colors: { background: "#F4F1EA", surface: "#FBFAF6", text: "#1A1A1A", mutedText: "#6B675E", accent: "#D97757", accent2: "#1A1A1A", borderRadius: 16, safeArea: 110 },
    animation: { sceneEnter: "fade", textEmphasis: "none", transition: "fade", easing: "Easing.inOut(Easing.cubic)" },
    typography: { fontId: "plex", weightHeadline: 700, upper: false, letterSpacing: -0.5, headlineScale: 0.95, italic: false },
    layout: { align: "center", kicker: true, accentBar: false, chip: "none", decoration: "underline", outline: false, glow: 0.0, isLight: true },
  }),
  theme({
    id: "editorial",
    name: "Editorial",
    vibe: "매거진 느낌 — 세리프, 얇은 괘선, 차분한 골드",
    description: "Noto Serif + 위아래 얇은 룰 + 키커 라벨, 잡지 레이아웃.",
    bestFor: ["에세이", "브랜드 스토리", "인터뷰", "고급 콘텐츠"],
    skills: ["text-animations", "timing", "transitions", "measuring-text"],
    colors: { background: "#0E0E10", surface: "#17171A", text: "#F5F2EA", mutedText: "#A7A39A", accent: "#C9A227", accent2: "#E5E0D5", borderRadius: 4, safeArea: 120 },
    animation: { sceneEnter: "fade", textEmphasis: "none", transition: "fade", easing: "Easing.inOut(Easing.cubic)" },
    typography: { fontId: "serif", weightHeadline: 700, upper: false, letterSpacing: -0.5, headlineScale: 0.98, italic: false },
    layout: { align: "center", kicker: true, accentBar: false, chip: "none", decoration: "rules", outline: false, glow: 0.25, isLight: false },
  }),
  theme({
    id: "neon-hype",
    name: "Neon Hype",
    vibe: "네온 사이니지 — 형광 컬러, 아웃라인 글자, 강한 글로우",
    description: "칠흑 배경 + 형광 그린/마젠타 + 아웃라인 텍스트.",
    bestFor: ["SNS 바이럴", "이벤트", "게임", "Z세대"],
    skills: ["text-animations", "timing", "transitions"],
    colors: { background: "#050505", surface: "#0E0E0E", text: "#FFFFFF", mutedText: "#9A9A9A", accent: "#39FF14", accent2: "#FF2BD6", borderRadius: 18, safeArea: 90 },
    animation: { sceneEnter: "pop", textEmphasis: "scale", transition: "zoom", easing: "Easing.bezier(0.34,1.56,0.64,1)" },
    typography: { fontId: "condensed", weightHeadline: 400, upper: false, letterSpacing: 0, headlineScale: 1.15, italic: false },
    layout: { align: "center", kicker: false, accentBar: false, chip: "number", decoration: "none", outline: true, glow: 1.0, isLight: false },
  }),
  theme({
    id: "minimal-corp",
    name: "Minimal Corp",
    vibe: "미니멀 기업형 — 밝은 배경, 얇은 산세리프, 좌측 정렬, 블루",
    description: "라이트 배경 + Gothic A1 라이트 웨이트 + 블루 언더라인, 좌측 정렬.",
    bestFor: ["기업", "IR", "공지", "깔끔한 정보 전달"],
    skills: ["sequencing", "text-animations", "google-fonts", "measuring-text"],
    colors: { background: "#FAFAFA", surface: "#FFFFFF", text: "#111418", mutedText: "#6A7280", accent: "#2563EB", accent2: "#111418", borderRadius: 10, safeArea: 120 },
    animation: { sceneEnter: "slide-up", textEmphasis: "none", transition: "slide", easing: "Easing.out(Easing.cubic)" },
    typography: { fontId: "geo", weightHeadline: 800, upper: false, letterSpacing: -0.5, headlineScale: 0.92, italic: false },
    layout: { align: "left", kicker: true, accentBar: false, chip: "none", decoration: "underline", outline: false, glow: 0.0, isLight: true },
  }),
  theme({
    id: "data-ink",
    name: "Data Ink",
    vibe: "데이터 리포트 — 차분한 다크, 에메랄드/앰버, 좌측 정렬 + 바",
    description: "다크 + 에메랄드/앰버 + 좌측 정렬, 수치 강조형.",
    bestFor: ["데이터", "통계", "리포트", "인사이트"],
    skills: ["timing", "measuring-text", "transitions", "sequencing"],
    colors: { background: "#0A0F0D", surface: "#10211B", text: "#ECFDF5", mutedText: "#9CCBB8", accent: "#10B981", accent2: "#F59E0B", borderRadius: 14, safeArea: 110 },
    animation: { sceneEnter: "fade", textEmphasis: "scale", transition: "fade", easing: "Easing.out(Easing.ease)" },
    typography: { fontId: "geo", weightHeadline: 800, upper: false, letterSpacing: -0.5, headlineScale: 1.0, italic: false },
    layout: { align: "left", kicker: true, accentBar: true, chip: "bar", decoration: "none", outline: false, glow: 0.4, isLight: false },
  }),
  theme({
    id: "warm-story",
    name: "Warm Story",
    vibe: "따뜻한 내러티브 — 브라운 톤, 명조, 골드 액센트",
    description: "웜 다크 + Nanum Myeongjo + 골드, 감성 스토리텔링.",
    bestFor: ["브랜드 스토리", "감성", "다큐", "인터뷰"],
    skills: ["text-animations", "timing", "transitions", "google-fonts"],
    colors: { background: "#14100C", surface: "#221A12", text: "#F3E9D8", mutedText: "#BBA88C", accent: "#E0A458", accent2: "#C97B4A", borderRadius: 8, safeArea: 116 },
    animation: { sceneEnter: "fade", textEmphasis: "none", transition: "fade", easing: "Easing.inOut(Easing.cubic)" },
    typography: { fontId: "myeongjo", weightHeadline: 800, upper: false, letterSpacing: -0.5, headlineScale: 0.98, italic: false },
    layout: { align: "center", kicker: true, accentBar: false, chip: "none", decoration: "rules", outline: false, glow: 0.3, isLight: false },
  }),
  theme({
    id: "mono-brutal",
    name: "Mono Brutal",
    vibe: "흑백 브루탈리즘 — 흰 배경, 초대형 검정 타이포, 좌측",
    description: "흰 배경 + Black Han Sans 초대형 검정 + 레드 포인트, 좌측 정렬.",
    bestFor: ["선언형", "강한 한마디", "포스터형", "타이포 중심"],
    skills: ["text-animations", "timing", "transitions"],
    colors: { background: "#FFFFFF", surface: "#F2F2F2", text: "#0A0A0A", mutedText: "#5A5A5A", accent: "#FF3B30", accent2: "#0A0A0A", borderRadius: 0, safeArea: 96 },
    animation: { sceneEnter: "slide-up", textEmphasis: "none", transition: "cut", easing: "Easing.out(Easing.cubic)" },
    typography: { fontId: "impact", weightHeadline: 400, upper: false, letterSpacing: -2, headlineScale: 1.2, italic: false },
    layout: { align: "left", kicker: false, accentBar: true, chip: "none", decoration: "none", outline: false, glow: 0.0, isLight: true },
  }),
  theme({
    id: "pastel-soft",
    name: "Pastel Soft",
    vibe: "말랑한 파스텔 — 핑크/라벤더, 둥근 폰트, 통통",
    description: "라이트 핑크 배경 + Jua 둥근 폰트 + 파스텔 액센트.",
    bestFor: ["라이프스타일", "뷰티", "감성 브이로그", "친근한 톤"],
    skills: ["text-animations", "timing", "transitions"],
    colors: { background: "#FFF3F8", surface: "#FFFFFF", text: "#3A2E3F", mutedText: "#8A7C90", accent: "#FF7BAC", accent2: "#A78BFA", borderRadius: 28, safeArea: 104 },
    animation: { sceneEnter: "pop", textEmphasis: "scale", transition: "fade", easing: "Easing.bezier(0.34,1.56,0.64,1)" },
    typography: { fontId: "round", weightHeadline: 400, upper: false, letterSpacing: 0, headlineScale: 1.05, italic: false },
    layout: { align: "center", kicker: false, accentBar: false, chip: "number", decoration: "none", outline: false, glow: 0.5, isLight: true },
  }),
  theme({
    id: "cyber-grid",
    name: "Cyber Grid",
    vibe: "사이버 — 네이비 배경, 시안 아웃라인, 테크 느낌",
    description: "딥 네이비 + 시안/퍼플 아웃라인 텍스트, 미래적 톤.",
    bestFor: ["테크", "보안", "AI", "미래/혁신"],
    skills: ["text-animations", "timing", "transitions", "sequencing"],
    colors: { background: "#060B1A", surface: "#0E1733", text: "#EAF2FF", mutedText: "#8FA3C8", accent: "#22D3EE", accent2: "#7C3AED", borderRadius: 12, safeArea: 96 },
    animation: { sceneEnter: "slide-up", textEmphasis: "scale", transition: "slide", easing: "Easing.bezier(0.22,1,0.36,1)" },
    typography: { fontId: "plex", weightHeadline: 700, upper: true, letterSpacing: 0, headlineScale: 1.0, italic: false },
    layout: { align: "center", kicker: true, accentBar: false, chip: "bar", decoration: "none", outline: true, glow: 0.85, isLight: false },
  }),
  theme({
    id: "premium-gold",
    name: "Premium Gold",
    vibe: "프리미엄 피치 — 칠흑 배경, 골드, 세리프, 여백",
    description: "블랙 + 골드 + Noto Serif, 느린 페이드의 고급 톤.",
    bestFor: ["럭셔리", "브랜드", "피치덱", "프리미엄 제품"],
    skills: ["google-fonts", "timing", "transitions", "measuring-text"],
    colors: { background: "#0A0A0B", surface: "#16161A", text: "#FAFAFA", mutedText: "#A1A1AA", accent: "#D4AF37", accent2: "#E5E7EB", borderRadius: 6, safeArea: 124 },
    animation: { sceneEnter: "fade", textEmphasis: "none", transition: "fade", easing: "Easing.inOut(Easing.cubic)" },
    typography: { fontId: "serif", weightHeadline: 700, upper: false, letterSpacing: 0.5, headlineScale: 0.98, italic: false },
    layout: { align: "center", kicker: true, accentBar: false, chip: "none", decoration: "rules", outline: false, glow: 0.3, isLight: false },
  }),
];

export function getTheme(id: string): DesignTheme | undefined {
  return themes.find((t) => t.id === id);
}

const ASPECT_TO_RES: Record<VideoSpec["aspect_ratio"], { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
  "1:1": { width: 1080, height: 1080 },
};

/** Apply aspect-ratio resolution + duration to a theme's composition defaults. */
export function themeForSpec(t: DesignTheme, spec: VideoSpec): DesignTheme {
  const res = ASPECT_TO_RES[spec.aspect_ratio] ?? {
    width: spec.resolution.width,
    height: spec.resolution.height,
  };
  return {
    ...t,
    compositionDefaults: {
      ...t.compositionDefaults,
      width: res.width,
      height: res.height,
      durationInFrames: Math.ceil(spec.duration_seconds * t.compositionDefaults.fps),
    },
  };
}

export interface ThemeRecommendation {
  theme: DesignTheme;
  reason: string;
  score: number;
}

const STAT_WORDS = ["통계", "데이터", "숫자", "리포트", "보고서", "인사이트", "%", "퍼센트", "증가", "감소"];
const TECH_WORDS = ["ai", "보안", "기술", "테크", "개발", "시스템", "클라우드", "데이터", "api", "플랫폼"];
const PRODUCT_WORDS = ["제품", "서비스", "기능", "출시", "데모", "앱", "솔루션", "런칭"];
const EDU_WORDS = ["강의", "튜토리얼", "교육", "방법", "배우", "설명", "가이드", "단계"];
const LUXURY_WORDS = ["럭셔리", "프리미엄", "브랜드", "피치", "투자", "고급", "비전"];
const EMOTION_WORDS = ["이야기", "스토리", "감성", "사람", "여정", "마음", "추억"];
const HYPE_WORDS = ["이벤트", "할인", "게임", "챌린지", "바이럴", "지금", "단독", "한정"];

function corpus(spec: VideoSpec): string {
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

function countAny(hay: string, words: string[]): number {
  return words.reduce((n, w) => (hay.includes(w.toLowerCase()) ? n + 1 : n), 0);
}

/** Score & rank all themes for a spec. Top 3 shown in the UI. */
export function recommendThemes(spec: VideoSpec, hookScore: number): ThemeRecommendation[] {
  const hay = corpus(spec);
  const stat = countAny(hay, STAT_WORDS);
  const tech = countAny(hay, TECH_WORDS);
  const product = countAny(hay, PRODUCT_WORDS);
  const edu = countAny(hay, EDU_WORDS);
  const luxury = countAny(hay, LUXURY_WORDS);
  const emotion = countAny(hay, EMOTION_WORDS);
  const hype = countAny(hay, HYPE_WORDS);
  const strongHook = hookScore >= 75;

  const recs = themes.map((t) => {
    let score = 1; // baseline so everything is selectable
    const reasons: string[] = [];
    const bump = (n: number, why: string) => {
      if (n > 0) {
        score += n;
        reasons.push(why);
      }
    };
    switch (t.id) {
      case "data-ink":
        bump(stat * 12, "숫자/통계/리포트 표현");
        break;
      case "clean-tech":
      case "cyber-grid":
        bump(tech * 10, "테크/보안/AI 주제");
        break;
      case "midnight-pop":
        score += 6;
        if (strongHook) bump(8, "강한 첫 장면 훅");
        break;
      case "bold-sport":
      case "neon-hype":
        bump(hype * 10, "이벤트/바이럴/임팩트");
        if (strongHook) bump(6, "강한 훅과 임팩트 매치");
        break;
      case "minimal-corp":
        bump(product * 8, "제품/공지/기업형");
        break;
      case "editorial":
      case "premium-gold":
        bump(luxury * 12, "브랜드/프리미엄/피치");
        break;
      case "warm-story":
        bump(emotion * 12, "감성/스토리");
        break;
      case "pastel-soft":
        bump(emotion * 6, "친근/라이프스타일");
        break;
    }
    if (edu > 0 && (t.id === "clean-tech" || t.id === "minimal-corp")) {
      bump(edu * 6, "설명/교육형");
    }
    if (reasons.length === 0) reasons.push(t.bestFor.slice(0, 2).join(", "));
    return { theme: themeForSpec(t, spec), reason: reasons.join(" · "), score };
  });

  recs.sort((a, b) => b.score - a.score);
  return recs;
}

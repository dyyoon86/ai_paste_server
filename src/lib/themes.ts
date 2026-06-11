import type { VideoSpec } from "./videoSpecSchema";
import type { RemotionRulePack } from "./rulePacks";
import type { RenderStyle, ThemeTypography, ThemeLayout } from "./renderPlan";

/**
 * Design Template library — 72 templates (the original HyperFrames "72 design
 * templates" idea, brought back). Each template is a full visual identity:
 * palette + typography (font/weight/case/spacing) + layout (alignment, kicker,
 * accent bar, chip, decoration, outline) + motion personality, grouped into 12
 * style categories. Each is still backed by real Remotion skill docs.
 *
 * A DesignTheme is structurally a RenderStyle, so buildRenderPlan(spec, theme)
 * works directly.
 */

export type ThemeCategory =
  | "sport"
  | "tech"
  | "editorial"
  | "luxury"
  | "neon"
  | "pastel"
  | "corporate"
  | "data"
  | "story"
  | "bold"
  | "retro"
  | "nature"
  | "explainer";

export const CATEGORY_LABELS: Record<ThemeCategory, string> = {
  sport: "스포츠 · 임팩트",
  tech: "테크 · 제품",
  editorial: "에디토리얼 · 매거진",
  luxury: "럭셔리 · 프리미엄",
  neon: "네온 · 하이프",
  pastel: "파스텔 · 플레이풀",
  corporate: "기업 · 공지",
  data: "데이터 · 리포트",
  story: "스토리 · 감성",
  bold: "볼드 · 타이포",
  retro: "레트로 · 빈티지",
  nature: "내추럴 · 웰니스",
  explainer: "설명형 · Explainer",
};

const CATEGORY_BESTFOR: Record<ThemeCategory, string[]> = {
  sport: ["스포츠", "동기부여", "임팩트"],
  tech: ["테크", "제품", "B2B"],
  editorial: ["매거진", "에세이", "브랜드"],
  luxury: ["럭셔리", "프리미엄", "피치"],
  neon: ["바이럴", "이벤트", "게임"],
  pastel: ["라이프스타일", "뷰티", "감성"],
  corporate: ["기업", "공지", "IR"],
  data: ["데이터", "통계", "리포트"],
  story: ["스토리", "감성", "다큐"],
  bold: ["선언", "포스터", "타이포"],
  retro: ["레트로", "복고", "감성"],
  nature: ["자연", "웰니스", "친환경"],
  explainer: ["설명", "교육", "정보", "해설"],
};

export type DesignTheme = RenderStyle &
  Required<Pick<RenderStyle, "vibe" | "typography" | "layout">> & {
    category: ThemeCategory;
  };

const BASE_COMPOSITION = { fps: 30, width: 1080, height: 1920, durationInFrames: 900 };
const CORE_SKILLS = ["text-animations", "timing", "transitions", "sequencing"];
const EASE = "Easing.bezier(0.16,1,0.3,1)";

type Anim = RemotionRulePack["animationRules"];

interface ThemeInput {
  id: string;
  name: string;
  category: ThemeCategory;
  vibe: string;
  description?: string;
  bestFor?: string[];
  font: string;
  // palette
  bg: string;
  sf: string;
  tx: string;
  mt: string;
  ac: string;
  a2: string;
  radius?: number;
  safe?: number;
  // typography overrides
  weight?: number;
  upper?: boolean;
  ls?: number;
  scale?: number;
  italic?: boolean;
  // layout overrides
  align?: ThemeLayout["align"];
  kicker?: boolean;
  bar?: boolean;
  chip?: ThemeLayout["chip"];
  deco?: ThemeLayout["decoration"];
  outline?: boolean;
  glow?: number;
  light?: boolean;
  subtitle?: boolean;
  // motion overrides
  enter?: Anim["sceneEnter"];
  emph?: Anim["textEmphasis"];
  trans?: Anim["transition"];
  easing?: string;
  skills?: string[];
  optionalSkills?: string[];
}

function T(i: ThemeInput): DesignTheme {
  const typography: ThemeTypography = {
    fontId: i.font,
    weightHeadline: i.weight ?? 800,
    upper: i.upper ?? false,
    letterSpacing: i.ls ?? -0.5,
    headlineScale: i.scale ?? 1,
    italic: i.italic ?? false,
  };
  const layout: ThemeLayout = {
    align: i.align ?? "center",
    kicker: i.kicker ?? false,
    accentBar: i.bar ?? false,
    chip: i.chip ?? "number",
    decoration: i.deco ?? "none",
    outline: i.outline ?? false,
    glow: i.glow ?? 0.5,
    isLight: i.light ?? false,
    subtitle: i.subtitle ?? false,
  };
  return {
    id: i.id,
    name: i.name,
    category: i.category,
    vibe: i.vibe,
    description: i.description ?? i.vibe,
    bestFor: i.bestFor ?? CATEGORY_BESTFOR[i.category],
    requiredSkillDocIds: i.skills ?? CORE_SKILLS,
    optionalSkillDocIds: i.optionalSkills ?? ["google-fonts", "measuring-text"],
    compositionDefaults: { ...BASE_COMPOSITION },
    visualDefaults: {
      background: i.bg,
      surface: i.sf,
      text: i.tx,
      mutedText: i.mt,
      accent: i.ac,
      accent2: i.a2,
      borderRadius: i.radius ?? 16,
      safeArea: i.safe ?? 100,
    },
    animationRules: {
      sceneEnter: i.enter ?? "fade",
      textEmphasis: i.emph ?? "none",
      transition: i.trans ?? "fade",
      easing: i.easing ?? EASE,
    },
    typography,
    layout,
    remotionNotes: [],
  };
}

export const themes: DesignTheme[] = [
  // ── SPORT · IMPACT (나이키/아디다스/언더아머 무드) ──────────────────────────
  T({ id: "athletic-volt", name: "Athletic Volt", category: "sport", vibe: "나이키풍 — 칠흑 배경, 초대형 헤비 타이포, 볼트 옐로우, 좌하단", font: "impact", bg: "#08090A", sf: "#121316", tx: "#FFFFFF", mt: "#9AA0A6", ac: "#D7FF3B", a2: "#FF3B30", radius: 0, safe: 84, weight: 400, upper: true, ls: -2, scale: 1.3, align: "bottom", kicker: true, bar: true, chip: "none", glow: 0.35, enter: "slide-up", emph: "scale", trans: "zoom" }),
  T({ id: "court-red", name: "Court Red", category: "sport", vibe: "코트 레드 — 강렬한 빨강 액센트, 중앙 임팩트", font: "impact", bg: "#0B0B0C", sf: "#17171A", tx: "#FFFFFF", mt: "#A0A0A5", ac: "#FF2D2D", a2: "#FFFFFF", radius: 0, safe: 90, weight: 400, ls: -2, scale: 1.25, bar: true, chip: "none", glow: 0.5, enter: "pop", emph: "scale", trans: "zoom" }),
  T({ id: "track-mono", name: "Track Mono", category: "sport", vibe: "트랙 모노 — 흑백 + 한 가지 포인트, 좌측 정렬", font: "condensed", bg: "#0A0A0A", sf: "#161616", tx: "#FFFFFF", mt: "#8A8A8A", ac: "#E6FF00", a2: "#FFFFFF", radius: 0, safe: 96, scale: 1.15, align: "left", kicker: true, bar: true, chip: "none", glow: 0.25, enter: "slide-up", emph: "scale", trans: "slide" }),
  T({ id: "gym-steel", name: "Gym Steel", category: "sport", vibe: "짐 스틸 — 차가운 스틸 그레이 + 오렌지", font: "geo", bg: "#0E1114", sf: "#191D22", tx: "#F2F4F6", mt: "#90979F", ac: "#FF6A00", a2: "#3AA0FF", radius: 8, safe: 92, weight: 900, scale: 1.1, align: "left", bar: true, chip: "bar", glow: 0.4, enter: "slide-up", emph: "scale", trans: "slide" }),
  T({ id: "street-black", name: "Street Black", category: "sport", vibe: "스트리트 블랙 — 거친 흑백, 초대형 좌하단", font: "impact", bg: "#000000", sf: "#101010", tx: "#FFFFFF", mt: "#7E7E7E", ac: "#FFFFFF", a2: "#FF2D2D", radius: 0, safe: 84, weight: 400, upper: true, ls: -2, scale: 1.32, align: "bottom", chip: "none", bar: true, glow: 0.15, enter: "slide-up", emph: "scale", trans: "cut" }),
  T({ id: "pitch-green", name: "Pitch Green", category: "sport", vibe: "피치 그린 — 잔디 그린 에너지, 중앙 임팩트", font: "impact", bg: "#06120B", sf: "#0E2417", tx: "#FFFFFF", mt: "#9FC9AE", ac: "#39FF88", a2: "#D7FF3B", radius: 0, safe: 90, weight: 400, ls: -1.5, scale: 1.22, bar: true, chip: "none", glow: 0.55, enter: "pop", emph: "scale", trans: "zoom" }),

  // ── TECH · PRODUCT (클로드/애플/토스/노션/리니어 무드) ──────────────────────
  T({ id: "calm-cream", name: "Calm Cream", category: "tech", vibe: "클로드풍 — 크림 배경, 차분한 코랄, 정갈한 산세리프", font: "plex", bg: "#F4F1EA", sf: "#FBFAF6", tx: "#1A1A1A", mt: "#6B675E", ac: "#D97757", a2: "#1A1A1A", radius: 16, safe: 110, weight: 700, ls: -0.5, scale: 0.95, kicker: true, chip: "none", deco: "underline", glow: 0, light: true, enter: "fade", emph: "none", trans: "fade", easing: "Easing.inOut(Easing.cubic)" }),
  T({ id: "pure-white", name: "Pure White", category: "tech", vibe: "애플풍 — 순백 배경, 미니멀, 중앙 큰 산세리프", font: "geo", bg: "#FFFFFF", sf: "#F5F5F7", tx: "#111111", mt: "#6E6E73", ac: "#0A84FF", a2: "#111111", radius: 18, safe: 116, weight: 800, ls: -1, scale: 1, kicker: false, chip: "none", deco: "none", glow: 0, light: true, enter: "fade", emph: "none", trans: "fade", easing: "Easing.inOut(Easing.cubic)" }),
  T({ id: "toss-blue", name: "Toss Blue", category: "tech", vibe: "토스풍 — 깔끔한 화이트 + 비비드 블루, 좌측", font: "geo", bg: "#FFFFFF", sf: "#F2F6FF", tx: "#191F28", mt: "#6B7684", ac: "#3182F6", a2: "#191F28", radius: 14, safe: 112, weight: 800, ls: -0.8, scale: 0.96, align: "left", kicker: true, chip: "none", deco: "underline", glow: 0, light: true, enter: "slide-up", emph: "none", trans: "slide" }),
  T({ id: "notion-mono", name: "Notion Mono", category: "tech", vibe: "노션풍 — 종이 화이트, 검정 텍스트, 절제된 좌측", font: "plex", bg: "#FFFFFF", sf: "#F7F6F3", tx: "#1F1F1F", mt: "#787774", ac: "#1F1F1F", a2: "#E03E3E", radius: 8, safe: 116, weight: 700, ls: -0.5, scale: 0.9, align: "left", kicker: true, chip: "none", deco: "underline", glow: 0, light: true, enter: "fade", emph: "none", trans: "fade" }),
  T({ id: "plex-slate", name: "Plex Slate", category: "tech", vibe: "슬레이트 다크 — 차분한 다크 + 청록, 중앙", font: "plex", bg: "#0E1116", sf: "#161B22", tx: "#F0F6FC", mt: "#9DA7B3", ac: "#2DD4BF", a2: "#3B82F6", radius: 14, safe: 108, weight: 700, ls: -0.5, scale: 0.98, kicker: true, chip: "bar", deco: "none", glow: 0.45, enter: "slide-up", emph: "none", trans: "slide" }),
  T({ id: "linear-dark", name: "Linear Dark", category: "tech", vibe: "리니어풍 — 딥 다크 + 퍼플 그라데, 중앙", font: "plex", bg: "#0B0C10", sf: "#15161C", tx: "#F4F4F6", mt: "#9A9CA6", ac: "#7C7CFF", a2: "#22D3EE", radius: 12, safe: 108, weight: 700, ls: -0.5, scale: 0.98, kicker: true, chip: "bar", outline: false, glow: 0.6, enter: "fade", emph: "scale", trans: "fade" }),

  // ── EDITORIAL · MAGAZINE ───────────────────────────────────────────────────
  T({ id: "serif-ivory", name: "Serif Ivory", category: "editorial", vibe: "아이보리 매거진 — 명조, 얇은 괘선, 차분한 골드", font: "serif", bg: "#0E0E10", sf: "#17171A", tx: "#F5F2EA", mt: "#A7A39A", ac: "#C9A227", a2: "#E5E0D5", radius: 4, safe: 120, weight: 700, ls: -0.5, scale: 0.98, kicker: true, chip: "none", deco: "rules", glow: 0.22, enter: "fade", emph: "none", trans: "fade", easing: "Easing.inOut(Easing.cubic)" }),
  T({ id: "vogue-black", name: "Vogue Black", category: "editorial", vibe: "보그풍 — 블랙 + 화이트 세리프, 하이패션 여백", font: "serif", bg: "#0A0A0A", sf: "#141414", tx: "#FFFFFF", mt: "#B0B0B0", ac: "#FFFFFF", a2: "#C9A227", radius: 0, safe: 124, weight: 700, ls: 1, scale: 1.02, kicker: true, chip: "none", deco: "rules", glow: 0.1, enter: "fade", emph: "none", trans: "fade" }),
  T({ id: "press-rule", name: "Press Rule", category: "editorial", vibe: "신문 헤드라인 — 라이트 페이퍼, 검정 세리프, 괘선", font: "serif", bg: "#F7F5F0", sf: "#FFFFFF", tx: "#141414", mt: "#5C5C5C", ac: "#B91C1C", a2: "#141414", radius: 0, safe: 116, weight: 700, ls: -0.5, scale: 1, align: "left", kicker: true, chip: "none", deco: "rules", glow: 0, light: true, enter: "fade", emph: "none", trans: "fade" }),
  T({ id: "kinfolk-warm", name: "Kinfolk Warm", category: "editorial", vibe: "킨포크풍 — 웜 베이지, 명조, 여백 많은 감성", font: "myeongjo", bg: "#EFE8DC", sf: "#F8F3EA", tx: "#2A241C", mt: "#7A7064", ac: "#A9744F", a2: "#2A241C", radius: 6, safe: 120, weight: 800, ls: -0.5, scale: 0.96, kicker: true, chip: "none", deco: "rules", glow: 0, light: true, enter: "fade", emph: "none", trans: "fade" }),
  T({ id: "headline-bold", name: "Headline Bold", category: "editorial", vibe: "헤드라인 볼드 — 큰 세리프 제목, 다크, 중앙", font: "serif", bg: "#111014", sf: "#1B1A20", tx: "#F4F1EA", mt: "#A29DAE", ac: "#E2B714", a2: "#F4F1EA", radius: 4, safe: 116, weight: 700, ls: -0.5, scale: 1.04, kicker: false, chip: "none", deco: "underline", glow: 0.2, enter: "fade", emph: "none", trans: "fade" }),
  T({ id: "column-gray", name: "Column Gray", category: "editorial", vibe: "칼럼 그레이 — 그레이 페이퍼, 좌측 칼럼 레이아웃", font: "serif", bg: "#E9E9E7", sf: "#F4F4F2", tx: "#1C1C1C", mt: "#5E5E5E", ac: "#2B6CB0", a2: "#1C1C1C", radius: 0, safe: 116, weight: 700, ls: -0.5, scale: 0.96, align: "left", kicker: true, chip: "none", deco: "rules", glow: 0, light: true, enter: "slide-up", emph: "none", trans: "slide" }),

  // ── LUXURY · PREMIUM ───────────────────────────────────────────────────────
  T({ id: "gold-noir", name: "Gold Noir", category: "luxury", vibe: "골드 누아르 — 칠흑 + 골드 세리프, 느린 페이드", font: "serif", bg: "#0A0A0B", sf: "#16161A", tx: "#FAFAFA", mt: "#A1A1AA", ac: "#D4AF37", a2: "#E5E7EB", radius: 6, safe: 124, weight: 700, ls: 0.5, scale: 0.98, kicker: true, chip: "none", deco: "rules", glow: 0.3, enter: "fade", emph: "none", trans: "fade", easing: "Easing.inOut(Easing.cubic)" }),
  T({ id: "champagne", name: "Champagne", category: "luxury", vibe: "샴페인 — 샴페인 베이지, 로즈골드, 우아함", font: "serif", bg: "#1A1612", sf: "#272019", tx: "#F6EEE2", mt: "#B9A793", ac: "#E8C9A0", a2: "#C98B6B", radius: 8, safe: 122, weight: 700, ls: 0.5, scale: 0.98, kicker: true, chip: "none", deco: "rules", glow: 0.25, enter: "fade", emph: "none", trans: "fade" }),
  T({ id: "marble-white", name: "Marble White", category: "luxury", vibe: "마블 화이트 — 대리석 화이트 + 골드 라인", font: "serif", bg: "#F6F4EF", sf: "#FFFFFF", tx: "#1A1A1A", mt: "#6E685E", ac: "#B8932F", a2: "#1A1A1A", radius: 4, safe: 122, weight: 700, ls: 0.5, scale: 0.98, kicker: true, chip: "none", deco: "rules", glow: 0, light: true, enter: "fade", emph: "none", trans: "fade" }),
  T({ id: "onyx-serif", name: "Onyx Serif", category: "luxury", vibe: "오닉스 — 깊은 블랙 + 실버, 미니멀 럭셔리", font: "serif", bg: "#070707", sf: "#121212", tx: "#F2F2F2", mt: "#9C9C9C", ac: "#C0C0C0", a2: "#D4AF37", radius: 2, safe: 124, weight: 700, ls: 1, scale: 1, kicker: true, chip: "none", deco: "rules", glow: 0.15, enter: "fade", emph: "none", trans: "fade" }),
  T({ id: "boutique", name: "Boutique", category: "luxury", vibe: "부티크 — 딥 버건디 + 골드, 따뜻한 고급", font: "myeongjo", bg: "#180E10", sf: "#251417", tx: "#F6E9E3", mt: "#C0A39A", ac: "#D9A441", a2: "#A33B4A", radius: 8, safe: 120, weight: 800, ls: -0.5, scale: 0.98, kicker: true, chip: "none", deco: "rules", glow: 0.25, enter: "fade", emph: "none", trans: "fade" }),
  T({ id: "velvet", name: "Velvet", category: "luxury", vibe: "벨벳 — 딥 퍼플 + 골드, 무드 있는 프리미엄", font: "serif", bg: "#100A18", sf: "#1C1228", tx: "#F3EEF8", mt: "#B3A6C7", ac: "#D4AF37", a2: "#9B6DFF", radius: 6, safe: 122, weight: 700, ls: 0.5, scale: 0.98, kicker: true, chip: "none", deco: "rules", glow: 0.35, enter: "fade", emph: "none", trans: "fade" }),

  // ── NEON · HYPE ────────────────────────────────────────────────────────────
  T({ id: "neon-green", name: "Neon Green", category: "neon", vibe: "네온 그린 — 칠흑 + 형광 그린 아웃라인 글자", font: "condensed", bg: "#050505", sf: "#0E0E0E", tx: "#FFFFFF", mt: "#9A9A9A", ac: "#39FF14", a2: "#FF2BD6", radius: 18, safe: 90, scale: 1.15, chip: "number", outline: true, glow: 1.0, enter: "pop", emph: "scale", trans: "zoom", easing: "Easing.bezier(0.34,1.56,0.64,1)" }),
  T({ id: "cyber-magenta", name: "Cyber Magenta", category: "neon", vibe: "사이버 마젠타 — 블랙 + 마젠타/시안 아웃라인", font: "condensed", bg: "#060309", sf: "#120A18", tx: "#FFFFFF", mt: "#A98FB5", ac: "#FF2BD6", a2: "#22D3EE", radius: 16, safe: 92, scale: 1.12, chip: "bar", outline: true, glow: 0.95, enter: "pop", emph: "scale", trans: "zoom" }),
  T({ id: "vapor", name: "Vapor", category: "neon", vibe: "베이퍼웨이브 — 보라/핑크 그라데, 글로우", font: "geo", bg: "#0B0420", sf: "#160A33", tx: "#FFFFFF", mt: "#C3A9E8", ac: "#FF77E1", a2: "#5CE1E6", radius: 20, safe: 96, weight: 900, scale: 1.08, chip: "number", outline: false, glow: 0.9, enter: "pop", emph: "scale", trans: "zoom" }),
  T({ id: "arcade", name: "Arcade", category: "neon", vibe: "아케이드 — 레트로 게임 네온, 큰 둥근 글자", font: "round", bg: "#080014", sf: "#140828", tx: "#FFFFFF", mt: "#B69AE0", ac: "#FFE600", a2: "#FF3CAC", radius: 22, safe: 96, weight: 400, scale: 1.1, chip: "number", outline: false, glow: 0.85, enter: "pop", emph: "scale", trans: "zoom" }),
  T({ id: "rave", name: "Rave", category: "neon", vibe: "레이브 — 블랙 + 일렉트릭 블루/핑크, 강한 글로우", font: "condensed", bg: "#020208", sf: "#0A0A18", tx: "#FFFFFF", mt: "#8FA6D8", ac: "#3D5BFF", a2: "#FF2BD6", radius: 16, safe: 92, scale: 1.12, chip: "bar", outline: true, glow: 1.0, enter: "pop", emph: "scale", trans: "zoom" }),
  T({ id: "glitch", name: "Glitch", category: "neon", vibe: "글리치 — 다크 + 시안/레드, 디지털 노이즈 무드", font: "plex", bg: "#070708", sf: "#121214", tx: "#EAFBFF", mt: "#8FB6BE", ac: "#00E5FF", a2: "#FF3B3B", radius: 8, safe: 94, weight: 700, upper: true, scale: 1.05, chip: "bar", outline: true, glow: 0.85, enter: "slide-up", emph: "scale", trans: "slide" }),

  // ── PASTEL · PLAYFUL ───────────────────────────────────────────────────────
  T({ id: "pastel-pink", name: "Pastel Pink", category: "pastel", vibe: "말랑 핑크 — 라이트 핑크, 둥근 폰트, 통통", font: "round", bg: "#FFF3F8", sf: "#FFFFFF", tx: "#3A2E3F", mt: "#8A7C90", ac: "#FF7BAC", a2: "#A78BFA", radius: 28, safe: 104, weight: 400, ls: 0, scale: 1.05, chip: "number", glow: 0.5, light: true, enter: "pop", emph: "scale", trans: "fade", easing: "Easing.bezier(0.34,1.56,0.64,1)" }),
  T({ id: "mint-soft", name: "Mint Soft", category: "pastel", vibe: "민트 소프트 — 연민트 배경, 둥근체, 산뜻", font: "round", bg: "#EAFBF3", sf: "#FFFFFF", tx: "#1F3B33", mt: "#6E8E84", ac: "#2BD4A0", a2: "#7BC4FF", radius: 26, safe: 104, weight: 400, scale: 1.04, chip: "number", glow: 0.45, light: true, enter: "pop", emph: "scale", trans: "fade" }),
  T({ id: "lavender", name: "Lavender", category: "pastel", vibe: "라벤더 — 연보라 배경, 부드러운 둥근체", font: "round", bg: "#F3EEFF", sf: "#FFFFFF", tx: "#332A4A", mt: "#7E76A0", ac: "#A78BFA", a2: "#FF9ECF", radius: 26, safe: 104, weight: 400, scale: 1.04, chip: "number", glow: 0.45, light: true, enter: "pop", emph: "scale", trans: "fade" }),
  T({ id: "peach", name: "Peach", category: "pastel", vibe: "피치 — 코랄 피치 배경, 따뜻하고 친근", font: "round", bg: "#FFF1EC", sf: "#FFFFFF", tx: "#4A2E28", mt: "#9A786E", ac: "#FF8A65", a2: "#FFC400", radius: 26, safe: 104, weight: 400, scale: 1.05, chip: "number", glow: 0.45, light: true, enter: "pop", emph: "scale", trans: "fade" }),
  T({ id: "bubble", name: "Bubble", category: "pastel", vibe: "버블 — 비비드 캔디 컬러, 통통 튀는 재미", font: "round", bg: "#FFFBE8", sf: "#FFFFFF", tx: "#33312A", mt: "#8A8470", ac: "#FF5DA2", a2: "#39C5FF", radius: 30, safe: 102, weight: 400, scale: 1.08, chip: "number", glow: 0.5, light: true, enter: "pop", emph: "scale", trans: "zoom" }),
  T({ id: "crayon", name: "Crayon", category: "pastel", vibe: "크레용 — 손글씨 둥근체, 화이트, 귀여운 톤", font: "round", bg: "#FFFFFF", sf: "#FFF7F0", tx: "#2E2A33", mt: "#857E8A", ac: "#FFB300", a2: "#FF6B6B", radius: 28, safe: 104, weight: 400, scale: 1.05, chip: "number", glow: 0.35, light: true, enter: "pop", emph: "scale", trans: "fade" }),

  // ── CORPORATE · ANNOUNCEMENT ───────────────────────────────────────────────
  T({ id: "corp-blue", name: "Corp Blue", category: "corporate", vibe: "기업 블루 — 라이트 배경, 블루 언더라인, 좌측", font: "geo", bg: "#FAFAFA", sf: "#FFFFFF", tx: "#111418", mt: "#6A7280", ac: "#2563EB", a2: "#111418", radius: 10, safe: 120, weight: 800, ls: -0.5, scale: 0.92, align: "left", kicker: true, chip: "none", deco: "underline", glow: 0, light: true, enter: "slide-up", emph: "none", trans: "slide" }),
  T({ id: "ir-navy", name: "IR Navy", category: "corporate", vibe: "IR 네이비 — 다크 네이비 + 실버, 신뢰감", font: "geo", bg: "#0A1020", sf: "#121A2E", tx: "#EAF0FA", mt: "#94A0B8", ac: "#5B8DEF", a2: "#C9D3E6", radius: 8, safe: 116, weight: 800, scale: 0.96, align: "left", kicker: true, chip: "bar", deco: "none", glow: 0.3, enter: "slide-up", emph: "none", trans: "slide" }),
  T({ id: "slate-pro", name: "Slate Pro", category: "corporate", vibe: "슬레이트 프로 — 그레이 + 인디고, 단정한 중앙", font: "geo", bg: "#10131A", sf: "#1A1F2A", tx: "#F1F3F7", mt: "#9AA2B0", ac: "#6366F1", a2: "#22D3EE", radius: 10, safe: 112, weight: 800, scale: 0.98, kicker: true, chip: "bar", deco: "none", glow: 0.35, enter: "fade", emph: "none", trans: "fade" }),
  T({ id: "ledger-green", name: "Ledger Green", category: "corporate", vibe: "레저 그린 — 화이트 + 딥 그린, 금융/회계", font: "plex", bg: "#FFFFFF", sf: "#F1F6F2", tx: "#15211A", mt: "#5E7066", ac: "#0E7A4B", a2: "#15211A", radius: 8, safe: 116, weight: 700, scale: 0.92, align: "left", kicker: true, chip: "none", deco: "underline", glow: 0, light: true, enter: "slide-up", emph: "none", trans: "slide" }),
  T({ id: "banker", name: "Banker", category: "corporate", vibe: "뱅커 — 다크 차콜 + 골드 라인, 보수적 권위", font: "serif", bg: "#121212", sf: "#1C1C1C", tx: "#F2F2F2", mt: "#9A9A9A", ac: "#C7A24B", a2: "#F2F2F2", radius: 4, safe: 118, weight: 700, scale: 0.98, kicker: true, chip: "none", deco: "rules", glow: 0.18, enter: "fade", emph: "none", trans: "fade" }),
  T({ id: "memo", name: "Memo", category: "corporate", vibe: "메모 — 깔끔한 화이트 공지, 좌측 정렬 정보형", font: "plex", bg: "#FFFFFF", sf: "#F5F6F8", tx: "#1A1D21", mt: "#6B7280", ac: "#111827", a2: "#2563EB", radius: 8, safe: 116, weight: 700, scale: 0.9, align: "left", kicker: true, chip: "none", deco: "underline", glow: 0, light: true, enter: "fade", emph: "none", trans: "fade" }),

  // ── DATA · REPORT ──────────────────────────────────────────────────────────
  T({ id: "data-ink", name: "Data Ink", category: "data", vibe: "데이터 잉크 — 다크 + 에메랄드/앰버, 좌측 수치 강조", font: "geo", bg: "#0A0F0D", sf: "#10211B", tx: "#ECFDF5", mt: "#9CCBB8", ac: "#10B981", a2: "#F59E0B", radius: 14, safe: 110, weight: 800, scale: 1, align: "left", kicker: true, bar: true, chip: "bar", glow: 0.4, enter: "fade", emph: "scale", trans: "fade", easing: "Easing.out(Easing.ease)" }),
  T({ id: "amber-stat", name: "Amber Stat", category: "data", vibe: "앰버 스탯 — 차콜 + 앰버, 카운트업 숫자형", font: "geo", bg: "#0E0C08", sf: "#1B160E", tx: "#FBF4E6", mt: "#C2B393", ac: "#F59E0B", a2: "#34D399", radius: 12, safe: 110, weight: 900, scale: 1.05, align: "left", bar: true, chip: "bar", glow: 0.4, enter: "fade", emph: "scale", trans: "fade" }),
  T({ id: "graph-ink", name: "Graph Ink", category: "data", vibe: "그래프 잉크 — 라이트 + 블루/그린, 리포트", font: "plex", bg: "#FAFBFC", sf: "#FFFFFF", tx: "#0F172A", mt: "#64748B", ac: "#2563EB", a2: "#10B981", radius: 10, safe: 114, weight: 700, scale: 0.94, align: "left", kicker: true, chip: "bar", deco: "none", glow: 0, light: true, enter: "slide-up", emph: "scale", trans: "slide" }),
  T({ id: "dashboard", name: "Dashboard", category: "data", vibe: "대시보드 — 딥 네이비 + 시안, KPI 강조", font: "geo", bg: "#070D17", sf: "#101A2C", tx: "#EAF2FF", mt: "#8FA3C8", ac: "#22D3EE", a2: "#A78BFA", radius: 12, safe: 110, weight: 800, scale: 1, align: "left", kicker: true, bar: true, chip: "bar", glow: 0.5, enter: "fade", emph: "scale", trans: "fade" }),
  T({ id: "metric", name: "Metric", category: "data", vibe: "메트릭 — 모노톤 다크 + 라임, 미니멀 수치", font: "plex", bg: "#0C0D0E", sf: "#16181A", tx: "#F2F4F5", mt: "#9AA0A6", ac: "#A3E635", a2: "#F2F4F5", radius: 8, safe: 110, weight: 700, scale: 1, align: "left", bar: true, chip: "bar", glow: 0.3, enter: "fade", emph: "scale", trans: "fade" }),
  T({ id: "insight", name: "Insight", category: "data", vibe: "인사이트 — 퍼플 다크 + 핑크, 분석 리포트", font: "geo", bg: "#0C0816", sf: "#171026", tx: "#F3EEFB", mt: "#B3A6C7", ac: "#A855F7", a2: "#EC4899", radius: 12, safe: 110, weight: 800, scale: 1, kicker: true, chip: "bar", glow: 0.5, enter: "fade", emph: "scale", trans: "fade" }),

  // ── STORY · EMOTIONAL ──────────────────────────────────────────────────────
  T({ id: "warm-story", name: "Warm Story", category: "story", vibe: "웜 스토리 — 브라운 톤, 명조, 골드, 감성 내러티브", font: "myeongjo", bg: "#14100C", sf: "#221A12", tx: "#F3E9D8", mt: "#BBA88C", ac: "#E0A458", a2: "#C97B4A", radius: 8, safe: 116, weight: 800, scale: 0.98, kicker: true, chip: "none", deco: "rules", glow: 0.3, enter: "fade", emph: "none", trans: "fade", easing: "Easing.inOut(Easing.cubic)" }),
  T({ id: "film-sepia", name: "Film Sepia", category: "story", vibe: "필름 세피아 — 빛바랜 세피아, 다큐 무드", font: "myeongjo", bg: "#191410", sf: "#27201A", tx: "#EFE3D2", mt: "#B6A48E", ac: "#CFA15E", a2: "#8C6B4A", radius: 6, safe: 116, weight: 800, scale: 0.96, kicker: true, chip: "none", deco: "rules", glow: 0.25, enter: "fade", emph: "none", trans: "fade" }),
  T({ id: "diary", name: "Diary", category: "story", vibe: "다이어리 — 따뜻한 아이보리, 손글씨 둥근체", font: "round", bg: "#FBF6EC", sf: "#FFFFFF", tx: "#3A332A", mt: "#8B8273", ac: "#E08A4B", a2: "#7BB6A1", radius: 22, safe: 112, weight: 400, scale: 1.02, kicker: false, chip: "none", deco: "underline", glow: 0, light: true, enter: "fade", emph: "none", trans: "fade" }),
  T({ id: "sunset", name: "Sunset", category: "story", vibe: "선셋 — 노을 그라데, 따뜻한 감성 마무리", font: "serif", bg: "#1A0F12", sf: "#2A171B", tx: "#FCEDE3", mt: "#C9A89C", ac: "#FF8A5C", a2: "#FFC15E", radius: 10, safe: 116, weight: 700, scale: 0.98, kicker: true, chip: "none", deco: "rules", glow: 0.5, enter: "fade", emph: "none", trans: "fade" }),
  T({ id: "memoir", name: "Memoir", category: "story", vibe: "메무아 — 잉크 블루 + 크림, 회고 에세이", font: "myeongjo", bg: "#0F1320", sf: "#1A2032", tx: "#EDEFF6", mt: "#9AA4BC", ac: "#C7A24B", a2: "#7B9ACC", radius: 6, safe: 116, weight: 800, scale: 0.96, kicker: true, chip: "none", deco: "rules", glow: 0.22, enter: "fade", emph: "none", trans: "fade" }),
  T({ id: "hearth", name: "Hearth", category: "story", vibe: "하스 — 따뜻한 적갈색 + 크림, 가족/일상", font: "myeongjo", bg: "#1B100C", sf: "#291813", tx: "#F4E6DB", mt: "#C2A491", ac: "#D9794B", a2: "#E4B062", radius: 10, safe: 116, weight: 800, scale: 0.98, kicker: true, chip: "none", deco: "rules", glow: 0.3, enter: "fade", emph: "none", trans: "fade" }),

  // ── BOLD · TYPOGRAPHY ──────────────────────────────────────────────────────
  T({ id: "mono-black", name: "Mono Black", category: "bold", vibe: "모노 블랙 — 흰 배경, 초대형 검정 타이포, 좌측", font: "impact", bg: "#FFFFFF", sf: "#F2F2F2", tx: "#0A0A0A", mt: "#5A5A5A", ac: "#FF3B30", a2: "#0A0A0A", radius: 0, safe: 96, weight: 400, ls: -2, scale: 1.2, align: "left", bar: true, chip: "none", glow: 0, light: true, enter: "slide-up", emph: "none", trans: "cut" }),
  T({ id: "mono-white", name: "Mono White", category: "bold", vibe: "모노 화이트 — 블랙 배경, 초대형 흰 타이포, 좌측", font: "impact", bg: "#0A0A0A", sf: "#161616", tx: "#FFFFFF", mt: "#8A8A8A", ac: "#FFFFFF", a2: "#FFE600", radius: 0, safe: 96, weight: 400, ls: -2, scale: 1.22, align: "left", bar: true, chip: "none", glow: 0.15, enter: "slide-up", emph: "none", trans: "cut" }),
  T({ id: "brutal-red", name: "Brutal Red", category: "bold", vibe: "브루탈 레드 — 레드 배경, 검정 초대형, 강한 선언", font: "impact", bg: "#E11900", sf: "#C21500", tx: "#FFFFFF", mt: "#FFD2C9", ac: "#0A0A0A", a2: "#FFFFFF", radius: 0, safe: 96, weight: 400, upper: true, ls: -2, scale: 1.25, align: "left", chip: "none", bar: true, glow: 0, light: false, enter: "slide-up", emph: "scale", trans: "cut" }),
  T({ id: "stamp", name: "Stamp", category: "bold", vibe: "스탬프 — 크라프트 + 잉크 블랙, 도장 느낌 강조", font: "impact", bg: "#1A1814", sf: "#252118", tx: "#F4EEDD", mt: "#B6AC92", ac: "#E04A2F", a2: "#F4EEDD", radius: 0, safe: 96, weight: 400, scale: 1.18, align: "center", bar: true, chip: "none", glow: 0.12, enter: "pop", emph: "scale", trans: "cut" }),
  T({ id: "poster", name: "Poster", category: "bold", vibe: "포스터 — 옐로우 배경, 검정 초대형, 그래픽 포스터", font: "impact", bg: "#FFE600", sf: "#F5DC00", tx: "#0A0A0A", mt: "#5A5526", ac: "#0A0A0A", a2: "#FF3B30", radius: 0, safe: 96, weight: 400, upper: true, ls: -2, scale: 1.24, align: "left", chip: "none", bar: true, glow: 0, light: true, enter: "slide-up", emph: "scale", trans: "cut" }),
  T({ id: "marker", name: "Marker", category: "bold", vibe: "마커 — 화이트 + 형광 하이라이트 강조", font: "geo", bg: "#FFFFFF", sf: "#F6F6F6", tx: "#141414", mt: "#5E5E5E", ac: "#FFE600", a2: "#FF3B30", radius: 6, safe: 104, weight: 900, scale: 1.04, chip: "none", deco: "none", emph: "highlight", glow: 0, light: true, enter: "slide-up", trans: "slide" }),

  // ── RETRO · VINTAGE ────────────────────────────────────────────────────────
  T({ id: "retro-sun", name: "Retro Sun", category: "retro", vibe: "80s 선셋 — 퍼플/오렌지 그라데, 레트로 글로우", font: "condensed", bg: "#1A0B2E", sf: "#2A114A", tx: "#FFF3E0", mt: "#D3B6E0", ac: "#FF8A3D", a2: "#FF4D9D", radius: 14, safe: 100, scale: 1.1, upper: true, kicker: true, chip: "number", outline: false, glow: 0.7, enter: "pop", emph: "scale", trans: "zoom" }),
  T({ id: "pop-90s", name: "Pop 90s", category: "retro", vibe: "90s 팝 — 비비드 원색 블록, 둥근체, 발랄", font: "round", bg: "#FDF0D5", sf: "#FFFFFF", tx: "#1A1A2E", mt: "#6E6E84", ac: "#FF4D6D", a2: "#3A86FF", radius: 24, safe: 100, weight: 400, scale: 1.06, chip: "number", glow: 0.3, light: true, enter: "pop", emph: "scale", trans: "zoom" }),
  T({ id: "retro-tan", name: "Retro Tan", category: "retro", vibe: "레트로 탄 — 탄/머스타드, 70s 따뜻한 빈티지", font: "myeongjo", bg: "#2A2118", sf: "#3A2E20", tx: "#F4E7CE", mt: "#C2AC86", ac: "#E0A03C", a2: "#C5603A", radius: 10, safe: 108, weight: 800, scale: 0.98, kicker: true, chip: "none", deco: "rules", glow: 0.3, enter: "fade", emph: "none", trans: "fade" }),
  T({ id: "cassette", name: "Cassette", category: "retro", vibe: "카세트 — 다크 + 오렌지/틸, 아날로그 테이프", font: "condensed", bg: "#14110E", sf: "#221C16", tx: "#F2E9DC", mt: "#B7A992", ac: "#FF7A29", a2: "#23C4B6", radius: 8, safe: 104, scale: 1.08, upper: true, kicker: true, chip: "bar", glow: 0.4, enter: "slide-up", emph: "scale", trans: "slide" }),
  T({ id: "disco", name: "Disco", category: "retro", vibe: "디스코 — 딥 퍼플 + 골드 글리터, 70s 글램", font: "serif", bg: "#160A1F", sf: "#251036", tx: "#F8ECFF", mt: "#C7A9DE", ac: "#FFD24A", a2: "#FF5DA2", radius: 12, safe: 108, weight: 700, scale: 1, kicker: true, chip: "number", glow: 0.7, enter: "pop", emph: "scale", trans: "zoom" }),
  T({ id: "polaroid", name: "Polaroid", category: "retro", vibe: "폴라로이드 — 빛바랜 크림 프레임, 추억 감성", font: "round", bg: "#F3EDE2", sf: "#FFFFFF", tx: "#33302A", mt: "#857F72", ac: "#D98A3D", a2: "#6E9F8E", radius: 18, safe: 110, weight: 400, scale: 1.02, kicker: false, chip: "none", deco: "underline", glow: 0, light: true, enter: "fade", emph: "none", trans: "fade" }),

  // ── NATURE · WELLNESS ──────────────────────────────────────────────────────
  T({ id: "forest", name: "Forest", category: "nature", vibe: "포레스트 — 딥 그린 + 세이지, 차분한 자연", font: "myeongjo", bg: "#0C140E", sf: "#16241A", tx: "#EAF3EC", mt: "#A6C2AE", ac: "#5FB87A", a2: "#C9A227", radius: 12, safe: 114, weight: 800, scale: 0.98, kicker: true, chip: "none", deco: "rules", glow: 0.3, enter: "fade", emph: "none", trans: "fade" }),
  T({ id: "ocean", name: "Ocean", category: "nature", vibe: "오션 — 딥 블루 + 아쿠아, 시원한 물결", font: "geo", bg: "#06131C", sf: "#0E2230", tx: "#E6F6FB", mt: "#9CC2D2", ac: "#2BC4D9", a2: "#7BE0C0", radius: 14, safe: 112, weight: 800, scale: 0.98, kicker: true, chip: "bar", glow: 0.45, enter: "slide-up", emph: "none", trans: "slide" }),
  T({ id: "sand", name: "Sand", category: "nature", vibe: "샌드 — 모래빛 베이지, 미니멀 웰니스", font: "geo", bg: "#EFE7D8", sf: "#F8F2E7", tx: "#2E2A22", mt: "#7E7666", ac: "#C29B5E", a2: "#7E9B86", radius: 16, safe: 116, weight: 700, scale: 0.94, kicker: true, chip: "none", deco: "underline", glow: 0, light: true, enter: "fade", emph: "none", trans: "fade" }),
  T({ id: "sage", name: "Sage", category: "nature", vibe: "세이지 — 연녹 세이지, 부드러운 둥근체", font: "round", bg: "#EAF0E6", sf: "#F6F9F2", tx: "#27322A", mt: "#74857A", ac: "#6FA37C", a2: "#C7A24B", radius: 24, safe: 112, weight: 400, scale: 1.02, chip: "number", glow: 0.3, light: true, enter: "pop", emph: "scale", trans: "fade" }),
  T({ id: "stone", name: "Stone", category: "nature", vibe: "스톤 — 그레이 스톤 + 테라코타, 미니멀", font: "geo", bg: "#1A1917", sf: "#252320", tx: "#EDEAE3", mt: "#A8A299", ac: "#C8744B", a2: "#9AA39A", radius: 10, safe: 114, weight: 800, scale: 0.98, align: "left", kicker: true, chip: "none", deco: "underline", glow: 0.15, enter: "slide-up", emph: "none", trans: "slide" }),
  T({ id: "dawn", name: "Dawn", category: "nature", vibe: "던 — 새벽 하늘 그라데, 핑크/블루, 잔잔함", font: "serif", bg: "#141225", sf: "#201C38", tx: "#F0ECFB", mt: "#B3AECB", ac: "#F4A6C0", a2: "#8FB9F0", radius: 12, safe: 114, weight: 700, scale: 0.98, kicker: true, chip: "none", deco: "rules", glow: 0.4, enter: "fade", emph: "none", trans: "fade" }),

  // ── EXPLAINER (설명 애니메이션: 중앙 모션 타이포 + 아이콘 + 하단 카라오케 자막) ──
  T({ id: "explainer-dark", name: "Explainer Dark", category: "explainer", vibe: "설명형 — 검은 배경, 중앙 모션 타이포 + 아이콘, 하단 어절 카라오케 자막", description: "내레이션에 맞춰 중앙 타이포·아이콘이 전개되고, 하단 자막이 말하는 어절마다 포인트 컬러로 바뀐다.", bestFor: ["설명", "정보", "교육", "해설"], skills: ["text-animations", "timing", "sequencing", "display-captions"], font: "sans", bg: "#000000", sf: "#0D0D0D", tx: "#FFFFFF", mt: "#B8B8B8", ac: "#FFC400", a2: "#22D3EE", radius: 16, safe: 110, weight: 900, scale: 1.05, kicker: true, chip: "none", deco: "none", glow: 0.0, subtitle: true, enter: "slide-up", emph: "scale", trans: "fade" }),
  T({ id: "explainer-cyan", name: "Explainer Cyan", category: "explainer", vibe: "설명형(시안) — 검은 배경, 시안 포인트, 중앙 타이포+아이콘, 하단 카라오케", description: "Explainer Dark의 시안 포인트 버전.", bestFor: ["설명", "정보", "테크 해설"], skills: ["text-animations", "timing", "sequencing", "display-captions"], font: "geo", bg: "#04070A", sf: "#0B1116", tx: "#FFFFFF", mt: "#9FB3BE", ac: "#22D3EE", a2: "#FFC400", radius: 16, safe: 110, weight: 800, scale: 1.04, kicker: true, chip: "none", deco: "none", glow: 0.0, subtitle: true, enter: "slide-up", emph: "scale", trans: "slide" }),
];

export function getTheme(id: string): DesignTheme | undefined {
  return themes.find((t) => t.id === id);
}

export function themesByCategory(): Array<{ category: ThemeCategory; label: string; themes: DesignTheme[] }> {
  const order = Object.keys(CATEGORY_LABELS) as ThemeCategory[];
  return order.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    themes: themes.filter((t) => t.category === category),
  }));
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

const SIGNALS: Array<{ words: string[]; cats: Partial<Record<ThemeCategory, number>>; reason: string }> = [
  { words: ["통계", "데이터", "숫자", "리포트", "보고서", "인사이트", "%", "퍼센트", "증가", "감소", "지표"], cats: { data: 4 }, reason: "숫자/통계/리포트" },
  { words: ["ai", "보안", "기술", "테크", "개발", "시스템", "클라우드", "api", "플랫폼", "소프트웨어"], cats: { tech: 4, corporate: 1 }, reason: "테크/제품" },
  { words: ["제품", "서비스", "기능", "출시", "데모", "앱", "솔루션", "런칭"], cats: { tech: 2, corporate: 2 }, reason: "제품/서비스" },
  { words: ["기업", "공지", "발표", "ir", "주주", "실적", "정책"], cats: { corporate: 4 }, reason: "기업/공지" },
  { words: ["강의", "튜토리얼", "교육", "방법", "배우", "설명", "가이드", "단계", "정리", "해설", "꿀팁", "노하우"], cats: { explainer: 5, tech: 1, corporate: 1 }, reason: "설명/교육형" },
  { words: ["럭셔리", "프리미엄", "브랜드", "피치", "투자", "고급", "비전", "명품"], cats: { luxury: 4, editorial: 1 }, reason: "럭셔리/프리미엄" },
  { words: ["이야기", "스토리", "감성", "사람", "여정", "마음", "추억", "다큐", "인터뷰"], cats: { story: 4, retro: 1 }, reason: "스토리/감성" },
  { words: ["이벤트", "할인", "게임", "챌린지", "바이럴", "지금", "단독", "한정", "파티"], cats: { neon: 4, sport: 1 }, reason: "이벤트/바이럴" },
  { words: ["스포츠", "운동", "도전", "한계", "훈련", "승리", "기록", "피트니스"], cats: { sport: 4 }, reason: "스포츠/동기부여" },
  { words: ["뷰티", "라이프", "일상", "브이로그", "귀여", "소소", "데일리"], cats: { pastel: 4 }, reason: "라이프스타일/감성" },
  { words: ["레트로", "복고", "8090", "빈티지", "추억의", "옛날"], cats: { retro: 4 }, reason: "레트로/빈티지" },
  { words: ["자연", "친환경", "숲", "바다", "웰니스", "힐링", "건강", "명상"], cats: { nature: 4 }, reason: "자연/웰니스" },
];

function corpus(spec: VideoSpec): string {
  return [spec.title, spec.summary, spec.core_message, spec.style?.name, ...spec.scenes.map((s) => `${s.screen_text} ${s.narration} ${s.visual_direction}`)]
    .join(" ")
    .toLowerCase();
}

/** Score & rank all 72 themes by category fit. Earlier themes win ties (curated priority). */
export function recommendThemes(spec: VideoSpec): ThemeRecommendation[] {
  const hay = corpus(spec);
  const catScore: Partial<Record<ThemeCategory, number>> = {};
  const catReason: Partial<Record<ThemeCategory, string>> = {};
  for (const sig of SIGNALS) {
    const hits = sig.words.reduce((n, w) => (hay.includes(w.toLowerCase()) ? n + 1 : n), 0);
    if (hits > 0) {
      for (const [cat, weight] of Object.entries(sig.cats)) {
        const c = cat as ThemeCategory;
        catScore[c] = (catScore[c] ?? 0) + hits * (weight as number);
        if (!catReason[c]) catReason[c] = sig.reason;
      }
    }
  }
  const recs = themes.map((t, idx) => {
    let score = 1 + (catScore[t.category] ?? 0);
    const reasons: string[] = [];
    if (catReason[t.category]) reasons.push(catReason[t.category] as string);
    // 다크 테마 선호: 시네마틱 배경(보케/그레인/비네팅)은 다크에서만 렌더되므로
    // 동점/동일 카테고리에선 다크가 기본 추천으로 올라오게 한다.
    if (!t.layout.isLight) score += 0.5;
    // Curated within-category priority: earlier entries score slightly higher so
    // the canonical theme of a category surfaces first on ties.
    score += (themes.length - idx) * 0.001;
    if (reasons.length === 0) reasons.push(t.bestFor.slice(0, 2).join(", "));
    return { theme: themeForSpec(t, spec), reason: reasons.join(" · "), score };
  });

  recs.sort((a, b) => b.score - a.score);
  return recs;
}

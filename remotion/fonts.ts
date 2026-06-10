import { loadFont as loadSans } from "@remotion/google-fonts/NotoSansKR";
import { loadFont as loadSerif } from "@remotion/google-fonts/NotoSerifKR";
import { loadFont as loadPlex } from "@remotion/google-fonts/IBMPlexSansKR";
import { loadFont as loadImpact } from "@remotion/google-fonts/BlackHanSans";
import { loadFont as loadGeo } from "@remotion/google-fonts/GothicA1";
import { loadFont as loadRound } from "@remotion/google-fonts/Jua";
import { loadFont as loadCondensed } from "@remotion/google-fonts/DoHyeon";
import { loadFont as loadBrush } from "@remotion/google-fonts/Gugi";
import { loadFont as loadMyeongjo } from "@remotion/google-fonts/NanumMyeongjo";

/**
 * Korean-capable Google fonts, one per theme font id.
 *
 * IMPORTANT: fonts are loaded LAZILY (only the id a render actually uses), with
 * a limited weight set. Eagerly loading all 9 fonts × every weight/subset at
 * module scope overran Remotion's 30s browser-setup timeout. @remotion/google-fonts
 * self-hosts the chosen font at render time; the Malgun Gothic fallback keeps
 * Korean readable if a fetch fails.
 */

const FALLBACK = "'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif";

type Loader = (style: "normal", opts: { weights: string[] }) => { fontFamily: string };

const REGISTRY: Record<string, { loader: Loader; weights: string[]; fallbackName: string }> = {
  sans: { loader: loadSans as Loader, weights: ["400", "700", "900"], fallbackName: "Noto Sans KR" },
  serif: { loader: loadSerif as Loader, weights: ["400", "700"], fallbackName: "Noto Serif KR" },
  plex: { loader: loadPlex as Loader, weights: ["400", "700"], fallbackName: "IBM Plex Sans KR" },
  impact: { loader: loadImpact as Loader, weights: ["400"], fallbackName: "Black Han Sans" },
  geo: { loader: loadGeo as Loader, weights: ["300", "700", "900"], fallbackName: "Gothic A1" },
  round: { loader: loadRound as Loader, weights: ["400"], fallbackName: "Jua" },
  condensed: { loader: loadCondensed as Loader, weights: ["400"], fallbackName: "Do Hyeon" },
  brush: { loader: loadBrush as Loader, weights: ["400"], fallbackName: "Gugi" },
  myeongjo: { loader: loadMyeongjo as Loader, weights: ["400", "800"], fallbackName: "Nanum Myeongjo" },
};

export type FontId = keyof typeof REGISTRY;

const resolved = new Map<string, string>();

/** Lazily load (once) the font for `id` and return its bare family name. */
function ensureFamily(id: string): string {
  const entry = REGISTRY[id] ?? REGISTRY.sans;
  const key = id in REGISTRY ? id : "sans";
  const cached = resolved.get(key);
  if (cached) return cached;
  let family = entry.fallbackName;
  try {
    family = entry.loader("normal", { weights: entry.weights }).fontFamily;
  } catch {
    family = entry.fallbackName;
  }
  resolved.set(key, family);
  return family;
}

export function fontFamily(id: string): string {
  return `${ensureFamily(id)}, ${FALLBACK}`;
}

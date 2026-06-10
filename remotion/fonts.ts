import { loadFont } from "@remotion/google-fonts/NotoSansKR";

/**
 * Korean-safe font (render_notes: "Use Korean-safe font fallback.").
 * @remotion/google-fonts self-hosts the font during render. If the network is
 * unavailable the CSS fallback chain still keeps Korean readable on most hosts.
 */
let family = "Noto Sans KR";
try {
  const loaded = loadFont("normal", { weights: ["400", "700", "900"] });
  family = loaded.fontFamily;
} catch {
  family = "Noto Sans KR";
}

export const koreanFontFamily = `${family}, 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif`;

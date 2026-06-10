/**
 * Scans the curated Remotion skill markdown in src/content/remotion-skills and
 * derives a manifest of RemotionSkillDoc entries (section 2.3 of make.md).
 *
 * This module is environment-agnostic: it takes file contents as input so it
 * can be unit-tested without touching the filesystem. The actual filesystem
 * walk lives in scripts/generate-manifest.mjs and the API layer.
 */

export type SkillCategory =
  | "core"
  | "text"
  | "transition"
  | "timing"
  | "sequence"
  | "font"
  | "image"
  | "video"
  | "audio"
  | "caption"
  | "layout"
  | "effect"
  | "unknown";

export interface RemotionSkillDoc {
  id: string;
  title: string;
  path: string;
  category: SkillCategory;
  tags: string[];
  summary: string;
  rawMarkdown: string;
}

interface ParsedFrontmatter {
  name?: string;
  description?: string;
  tags: string[];
  body: string;
}

export function parseFrontmatter(rawMarkdown: string): ParsedFrontmatter {
  const markdown = rawMarkdown.replace(/\r\n/g, "\n");
  const fmMatch = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!fmMatch) {
    return { tags: [], body: markdown };
  }
  const [, fmBlock, body] = fmMatch;
  const fm: ParsedFrontmatter = { tags: [], body };

  const lines = fmBlock.split("\n");
  let inMetadata = false;
  for (const line of lines) {
    const nameMatch = line.match(/^name:\s*(.+)$/);
    if (nameMatch) {
      fm.name = nameMatch[1].trim();
      continue;
    }
    const descMatch = line.match(/^description:\s*(.+)$/);
    if (descMatch) {
      fm.description = descMatch[1].trim();
      continue;
    }
    if (/^metadata:\s*$/.test(line)) {
      inMetadata = true;
      continue;
    }
    const tagsMatch = line.match(/^\s*tags:\s*(.+)$/);
    if (tagsMatch) {
      fm.tags = tagsMatch[1]
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      continue;
    }
    if (inMetadata && /^\S/.test(line)) {
      inMetadata = false;
    }
  }
  return fm;
}

const CATEGORY_RULES: Array<{ category: SkillCategory; test: (id: string, tags: string[]) => boolean }> = [
  { category: "core", test: (id) => id === "skill" || id === "compositions" || id === "parameters" || id === "calculate-metadata" },
  { category: "text", test: (id, tags) => id.includes("text") || id.includes("measuring-text") || tags.includes("typography") || tags.includes("text") },
  { category: "transition", test: (id) => id.includes("transition") || id.includes("trimming") },
  { category: "timing", test: (id) => id.includes("timing") || id.includes("sequencing") === false && id === "timing" },
  { category: "sequence", test: (id) => id.includes("sequenc") },
  { category: "font", test: (id) => id.includes("font") },
  { category: "image", test: (id) => id.includes("image") || id.includes("gif") || id.includes("lottie") || id.includes("maplibre") },
  { category: "video", test: (id) => id.includes("video") || id.includes("transparent") || id.includes("3d") },
  { category: "audio", test: (id) => id.includes("audio") || id.includes("voiceover") || id.includes("sfx") || id.includes("silence") || id.includes("get-audio") },
  { category: "caption", test: (id) => id.includes("caption") || id.includes("subtitle") || id.includes("srt") || id.includes("transcribe") },
  { category: "effect", test: (id) => id.includes("light-leak") || id.includes("html-in-canvas") || id.includes("audio-visualization") },
  { category: "layout", test: (id) => id.includes("measuring-dom") || id.includes("tailwind") },
];

export function categorize(id: string, tags: string[]): SkillCategory {
  for (const rule of CATEGORY_RULES) {
    if (rule.test(id, tags)) return rule.category;
  }
  return "unknown";
}

export function titleCase(id: string): string {
  return id
    .split(/[-_]/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function deriveSummary(fm: ParsedFrontmatter): string {
  if (fm.description) return fm.description;
  // Fall back to first non-heading, non-empty line of the body.
  const lines = fm.body.split("\n").map((l) => l.trim());
  for (const line of lines) {
    if (line && !line.startsWith("#")) {
      return line.slice(0, 160);
    }
  }
  return "Remotion best-practice rule.";
}

export interface ScanInput {
  /** id derived from filename without extension, e.g. "text-animations" or "skill" for SKILL.md */
  id: string;
  /** project-relative path, e.g. "src/content/remotion-skills/rules/text-animations.md" */
  path: string;
  markdown: string;
}

export function buildSkillDoc(input: ScanInput): RemotionSkillDoc {
  const fm = parseFrontmatter(input.markdown);
  const tags = fm.tags;
  return {
    id: input.id,
    title: titleCase(fm.name ?? input.id),
    path: input.path,
    category: categorize(input.id, tags),
    tags,
    summary: deriveSummary(fm),
    rawMarkdown: input.markdown,
  };
}

export function buildManifest(inputs: ScanInput[]): RemotionSkillDoc[] {
  return inputs
    .map(buildSkillDoc)
    .sort((a, b) => a.id.localeCompare(b.id));
}

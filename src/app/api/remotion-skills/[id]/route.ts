import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { remotionSkillDocsById } from "@/generated/remotionSkillsManifest";
import { skillContentPath } from "@/lib/paths";

export const runtime = "nodejs";

/**
 * Returns the raw markdown for one skill doc (section 13).
 * Path access is constrained to the remotion-skills folder (section 15).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const doc = remotionSkillDocsById[params.id];
  if (!doc) {
    return NextResponse.json({ error: "skill 문서를 찾을 수 없습니다." }, { status: 404 });
  }

  let rawMarkdown = doc.rawMarkdown;
  // Prefer reading from disk (single source of truth) but fall back to manifest.
  try {
    const safe = skillContentPath(doc.path);
    rawMarkdown = await fs.readFile(safe, "utf8");
  } catch {
    // keep manifest copy
  }

  return NextResponse.json({
    id: doc.id,
    title: doc.title,
    category: doc.category,
    path: doc.path,
    tags: doc.tags,
    summary: doc.summary,
    rawMarkdown,
  });
}

import { NextResponse } from "next/server";
import { remotionSkillDocs } from "@/generated/remotionSkillsManifest";

export const runtime = "nodejs";

/** Lightweight listing (no rawMarkdown) — section 13. */
export async function GET() {
  const docs = remotionSkillDocs.map((d) => ({
    id: d.id,
    title: d.title,
    category: d.category,
    summary: d.summary,
    tags: d.tags,
    path: d.path,
  }));
  return NextResponse.json({ docs });
}

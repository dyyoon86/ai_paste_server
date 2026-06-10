import { describe, it, expect } from "vitest";
import { parseFrontmatter, categorize, buildManifest, buildSkillDoc } from "@/lib/skillsScanner";
import { remotionSkillDocs, remotionSkillDocsById } from "@/generated/remotionSkillsManifest";

const sampleMd = `---
name: text-animations
description: Typography and text animation patterns for Remotion.
metadata:
  tags: typography, text, typewriter
---

## Text animations

Body content here.
`;

describe("skillsScanner", () => {
  it("parses frontmatter name/description/tags", () => {
    const fm = parseFrontmatter(sampleMd);
    expect(fm.name).toBe("text-animations");
    expect(fm.description).toContain("Typography");
    expect(fm.tags).toEqual(["typography", "text", "typewriter"]);
  });

  it("categorizes known ids", () => {
    expect(categorize("text-animations", ["text"])).toBe("text");
    expect(categorize("transitions", [])).toBe("transition");
    expect(categorize("google-fonts", [])).toBe("font");
    expect(categorize("audio", [])).toBe("audio");
    expect(categorize("skill", [])).toBe("core");
    expect(categorize("display-captions", [])).toBe("caption");
  });

  it("builds a doc with rawMarkdown preserved", () => {
    const doc = buildSkillDoc({ id: "text-animations", path: "p.md", markdown: sampleMd });
    expect(doc.rawMarkdown).toBe(sampleMd);
    expect(doc.title).toBe("Text Animations");
    expect(doc.category).toBe("text");
  });

  it("buildManifest sorts by id", () => {
    const docs = buildManifest([
      { id: "z", path: "z.md", markdown: "---\nname: z\n---\nx" },
      { id: "a", path: "a.md", markdown: "---\nname: a\n---\nx" },
    ]);
    expect(docs.map((d) => d.id)).toEqual(["a", "z"]);
  });
});

describe("generated manifest", () => {
  it("contains the installed remotion skill docs with rawMarkdown", () => {
    expect(remotionSkillDocs.length).toBeGreaterThan(20);
    const ta = remotionSkillDocsById["text-animations"];
    expect(ta).toBeTruthy();
    expect(ta.rawMarkdown.length).toBeGreaterThan(50);
    expect(ta.category).toBe("text");
  });

  it("includes the core SKILL doc", () => {
    expect(remotionSkillDocsById["skill"]).toBeTruthy();
  });
});

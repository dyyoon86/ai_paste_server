import { describe, it, expect, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import { jobDir, jobPath, isValidJobId } from "@/lib/paths";
import { initialState, writeStatus, readStatus, patchStatus } from "@/lib/jobStore";
import { writeJobArtifacts } from "@/lib/renderer";
import { buildRenderPlan } from "@/lib/renderPlan";
import { recommendRulePacks } from "@/lib/rulePacks";
import { extractVideoSpecJson } from "@/lib/specParser";
import { validateVideoSpec } from "@/lib/videoSpecSchema";
import { SAMPLE_INPUT } from "@/lib/sampleInput";

const createdJobs: string[] = [];

afterAll(async () => {
  for (const id of createdJobs) {
    await fs.rm(jobDir(id), { recursive: true, force: true }).catch(() => {});
  }
});

function sample() {
  const spec = validateVideoSpec(extractVideoSpecJson(SAMPLE_INPUT).json).spec!;
  const pack = recommendRulePacks(spec, 80)[0].pack;
  return { spec, pack, plan: buildRenderPlan(spec, pack) };
}

describe("path safety", () => {
  it("validates uuid job ids", () => {
    expect(isValidJobId(randomUUID())).toBe(true);
    expect(isValidJobId("../etc/passwd")).toBe(false);
    expect(isValidJobId("abc")).toBe(false);
  });

  it("blocks path traversal in jobPath", () => {
    const id = randomUUID();
    expect(() => jobPath(id, "..", "..", "secret")).toThrow();
  });
});

describe("job artifacts + status", () => {
  it("creates the job folder with all artifacts", async () => {
    const { spec, pack, plan } = sample();
    const jobId = randomUUID();
    createdJobs.push(jobId);

    await writeStatus(initialState(jobId, pack.id, plan.usedSkillDocIds));
    await writeJobArtifacts({ jobId, rawInput: SAMPLE_INPUT, spec, rulePack: pack, plan });

    const expectFile = async (rel: string) => {
      const st = await fs.stat(jobPath(jobId, rel));
      expect(st.size, rel).toBeGreaterThan(0);
    };
    await expectFile("input.txt");
    await expectFile("spec.json");
    await expectFile("rule-pack.json");
    await expectFile("render-plan.json");
    await expectFile("render-input.json");
    await expectFile("status.json");
    await expectFile("project/package.json");
    await expectFile("project/src/Root.tsx");
    await expectFile("project/src/Video.tsx");
    await expectFile("project/src/plan.ts");

    const renderPlan = JSON.parse(await fs.readFile(jobPath(jobId, "render-plan.json"), "utf8"));
    expect(renderPlan.compositionId).toBe("PasteVideo");
    expect(renderPlan.scenes.length).toBe(spec.scenes.length);
  });

  it("updates status.json via patchStatus", async () => {
    const { pack, plan } = sample();
    const jobId = randomUUID();
    createdJobs.push(jobId);

    await writeStatus(initialState(jobId, pack.id, plan.usedSkillDocIds));
    const before = await readStatus(jobId);
    expect(before?.status).toBe("queued");

    const after = await patchStatus(jobId, { status: "rendering", progress: 0.5 });
    expect(after?.status).toBe("rendering");
    expect(after?.progress).toBe(0.5);

    const reread = await readStatus(jobId);
    expect(reread?.status).toBe("rendering");
  });
});

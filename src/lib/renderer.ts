import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";
import { REPO_ROOT, jobPath } from "./paths";
import {
  createJobDir,
  patchStatus,
  writeStatus,
  writeJson,
  writeJobFile,
  outputExists,
  type JobState,
} from "./jobStore";
import type { RenderPlan } from "./renderPlan";
import { COMPOSITION_ID } from "./renderPlan";
import type { VideoSpec } from "./videoSpecSchema";
import type { RemotionRulePack } from "./rulePacks";

const require = createRequire(import.meta.url);

export const REMOTION_ENTRY = "remotion/index.ts";
export const RENDER_TIMEOUT_MS = 1000 * 60 * 8; // 8 minutes hard cap (section 15)

/**
 * Build the argv passed to the Remotion CLI. Pure & testable
 * (make.md test: "Remotion render command 인자 생성 테스트").
 * User input never reaches a shell string — args are passed as an array.
 */
export function buildRenderArgs(opts: {
  entry: string;
  compositionId: string;
  outputPath: string;
  propsPath: string;
  concurrency?: number;
}): string[] {
  return [
    "render",
    opts.entry,
    opts.compositionId,
    opts.outputPath,
    `--props=${opts.propsPath}`,
    `--concurrency=${opts.concurrency ?? 2}`,
    "--timeout=90000",
    "--log=info",
  ];
}

/** Resolve the Remotion CLI script so we can spawn it with `node` (no shell). */
export function resolveRemotionCli(): string {
  // Prefer the explicit path under the repo's node_modules. Next's production
  // bundle relocates this module, so require.resolve may not find a package
  // that is only used via spawn (never imported).
  const explicit = path.join(
    REPO_ROOT,
    "node_modules",
    "@remotion",
    "cli",
    "remotion-cli.js",
  );
  if (existsSync(explicit)) return explicit;

  const pkgJson = require.resolve("@remotion/cli/package.json");
  return path.join(path.dirname(pkgJson), "remotion-cli.js");
}

/**
 * Write all job artifacts to disk: input.txt, spec.json, rule-pack.json,
 * render-plan.json, render-input.json (props), and a faithful standalone
 * Remotion project under project/ (section 8 & 9).
 */
export async function writeJobArtifacts(opts: {
  jobId: string;
  rawInput: string;
  spec: VideoSpec;
  rulePack: RemotionRulePack;
  plan: RenderPlan;
}): Promise<void> {
  const { jobId, rawInput, spec, rulePack, plan } = opts;
  await createJobDir(jobId);
  await writeJobFile(jobId, "input.txt", rawInput);
  await writeJson(jobId, "spec.json", spec);
  await writeJson(jobId, "rule-pack.json", rulePack);
  await writeJson(jobId, "render-plan.json", plan);
  await writeJson(jobId, "render-input.json", { plan });
  await generateJobProject(opts);
}

/**
 * Generate a self-contained Remotion project in /data/jobs/{jobId}/project/.
 * Component source is copied verbatim from the canonical remotion/ folder so
 * the snapshot stays in lock-step with what actually renders; the job's plan
 * is embedded as plan.ts and a job-specific Root/index wire it up.
 */
async function generateJobProject(opts: {
  jobId: string;
  spec: VideoSpec;
  rulePack: RemotionRulePack;
  plan: RenderPlan;
}): Promise<void> {
  const { jobId, spec, rulePack, plan } = opts;
  const srcDir = path.join(REPO_ROOT, "remotion");
  const copyFiles = [
    "Video.tsx",
    "Scene.tsx",
    "Background.tsx",
    "TextBlock.tsx",
    "animations.ts",
    "planTypes.ts",
    "fonts.ts",
  ];
  for (const f of copyFiles) {
    const contents = await fs.readFile(path.join(srcDir, f), "utf8");
    await writeJobFile(jobId, path.join("project", "src", f), contents);
  }

  // Embedded plan + spec + rule pack (section 9: src/spec.ts, src/rulePack.ts).
  await writeJobFile(
    jobId,
    path.join("project", "src", "plan.ts"),
    `import type { RenderPlan } from "./planTypes";\n\nexport const plan: RenderPlan = ${JSON.stringify(
      plan,
      null,
      2,
    )};\n`,
  );
  await writeJobFile(
    jobId,
    path.join("project", "src", "spec.ts"),
    `// Validated VIDEO_SPEC for this job.\nexport const spec = ${JSON.stringify(spec, null, 2)} as const;\n`,
  );
  await writeJobFile(
    jobId,
    path.join("project", "src", "rulePack.ts"),
    `// Remotion RulePack used for this job.\nexport const rulePack = ${JSON.stringify(rulePack, null, 2)} as const;\n`,
  );

  await writeJobFile(
    jobId,
    path.join("project", "src", "Root.tsx"),
    `import React from "react";
import { Composition } from "remotion";
import { PasteVideo } from "./Video";
import { plan } from "./plan";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="${COMPOSITION_ID}"
    component={PasteVideo}
    durationInFrames={Math.max(1, plan.durationInFrames)}
    fps={plan.fps}
    width={plan.width}
    height={plan.height}
    defaultProps={{ plan }}
  />
);
`,
  );
  await writeJobFile(
    jobId,
    path.join("project", "src", "index.ts"),
    `import { registerRoot } from "remotion";\nimport { RemotionRoot } from "./Root";\n\nregisterRoot(RemotionRoot);\n`,
  );

  await writeJobFile(
    jobId,
    path.join("project", "package.json"),
    JSON.stringify(
      {
        name: `paste-video-${jobId.slice(0, 8)}`,
        version: "1.0.0",
        private: true,
        description: `Generated Remotion project for "${spec.title}" using rule pack ${rulePack.id}.`,
        scripts: {
          render: `remotion render src/index.ts ${COMPOSITION_ID} out.mp4`,
          studio: "remotion studio src/index.ts",
        },
        dependencies: {
          "@remotion/cli": "4.0.290",
          "@remotion/google-fonts": "4.0.290",
          remotion: "4.0.290",
          react: "18.3.1",
          "react-dom": "18.3.1",
        },
      },
      null,
      2,
    ),
  );
  await writeJobFile(
    jobId,
    path.join("project", "remotion.config.ts"),
    `import { Config } from "@remotion/cli/config";\n\nConfig.setVideoImageFormat("jpeg");\nConfig.setConcurrency(2);\n`,
  );
  await writeJobFile(
    jobId,
    path.join("project", "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2020",
          module: "esnext",
          moduleResolution: "bundler",
          jsx: "react-jsx",
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
        },
        include: ["src"],
      },
      null,
      2,
    ),
  );
  await writeJobFile(
    jobId,
    path.join("project", "README.md"),
    `# Generated Remotion project\n\nThis project was generated by PasteMotion for job \`${jobId}\`.\n\n\`\`\`bash\nnpm install\nnpm run render\n\`\`\`\n\nRule pack: **${rulePack.name}** (${rulePack.id})\nSkill docs: ${plan.usedSkillDocIds.join(", ")}\n`,
  );
}

/**
 * Kick off a background render. Returns immediately; progress is written to
 * status.json which the GET /api/jobs/{jobId} endpoint polls.
 */
export function startRender(state: JobState, plan: RenderPlan): void {
  const jobId = state.jobId;
  const outputPath = jobPath(jobId, "output.mp4");
  const propsPath = jobPath(jobId, "render-input.json");
  const logPath = jobPath(jobId, "render.log");

  const args = buildRenderArgs({
    entry: REMOTION_ENTRY,
    compositionId: plan.compositionId,
    outputPath,
    propsPath,
  });

  const cli = resolveRemotionCli();

  void (async () => {
    await patchStatus(jobId, {
      status: "rendering",
      progress: 0.02,
      message: "Remotion 번들링 중...",
    });

    const env = {
      ...process.env,
      // Corporate SSL intercept fallback so @remotion/google-fonts can fetch.
      NODE_TLS_REJECT_UNAUTHORIZED: "0",
    };

    const child = spawn(process.execPath, [cli, ...args], {
      cwd: REPO_ROOT,
      env,
      windowsHide: true,
    });

    let logBuffer = "";
    let lastProgress = 0.02;
    const append = (chunk: Buffer) => {
      const text = chunk.toString();
      logBuffer += text;
      // Remotion prints "Rendered X/Y" and percentage lines we can parse.
      const pctMatch = [...text.matchAll(/(\d{1,3})%/g)].pop();
      if (pctMatch) {
        const pct = Math.min(99, parseInt(pctMatch[1], 10)) / 100;
        if (pct >= lastProgress + 0.03) {
          lastProgress = pct;
          void patchStatus(jobId, {
            progress: 0.1 + pct * 0.85,
            message: `렌더링 중... ${Math.round(pct * 100)}%`,
          });
        }
      }
      if (logBuffer.length > 200_000) {
        logBuffer = logBuffer.slice(-100_000);
      }
    };
    child.stdout.on("data", append);
    child.stderr.on("data", append);

    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      void fail(jobId, "렌더링 타임아웃(8분)을 초과했습니다.", logBuffer);
    }, RENDER_TIMEOUT_MS);

    child.on("error", (err) => {
      clearTimeout(timeout);
      void fail(jobId, `Remotion 실행 실패: ${err.message}`, logBuffer);
    });

    child.on("close", async (code) => {
      clearTimeout(timeout);
      await fs.writeFile(logPath, logBuffer, "utf8").catch(() => {});
      if (code === 0 && (await outputExists(jobId))) {
        await patchStatus(jobId, {
          status: "completed",
          progress: 1,
          message: "완료되었습니다.",
          videoUrl: `/api/jobs/${jobId}/video`,
          error: null,
        });
      } else if (code === 0) {
        await fail(jobId, "렌더링은 끝났지만 output.mp4를 찾을 수 없습니다.", logBuffer);
      } else {
        await fail(
          jobId,
          interpretFailure(logBuffer, code),
          logBuffer,
        );
      }
    });
  })().catch((err) => {
    void fail(jobId, `렌더링 시작 실패: ${err?.message ?? err}`, "");
  });
}

function interpretFailure(log: string, code: number | null): string {
  const lower = log.toLowerCase();
  if (lower.includes("ffmpeg")) {
    return "FFmpeg 관련 오류로 렌더링에 실패했습니다. 서버에 FFmpeg가 설치되어 있는지 확인하세요.";
  }
  if (lower.includes("enospc")) {
    return "디스크 공간이 부족하여 렌더링에 실패했습니다.";
  }
  if (lower.includes("cannot find") || lower.includes("module not found")) {
    return "Remotion 모듈을 찾지 못했습니다. `npm install`을 다시 실행하세요.";
  }
  const tail = log.trim().split("\n").slice(-4).join("\n");
  return `Remotion 렌더링이 실패했습니다 (exit ${code}).\n${tail}`;
}

async function fail(jobId: string, message: string, log: string): Promise<void> {
  if (log) {
    await writeJobFile(jobId, "render.log", log).catch(() => {});
  }
  await patchStatus(jobId, {
    status: "failed",
    message: "렌더링 실패",
    error: message,
  });
}

/** Lightweight environment preflight (section 10/14). */
export async function preflight(): Promise<{ ok: boolean; problems: string[] }> {
  const problems: string[] = [];
  const major = parseInt(process.versions.node.split(".")[0], 10);
  if (major < 18) {
    problems.push(`Node ${process.versions.node} 감지됨. Node 18+ (권장 22+)가 필요합니다.`);
  }
  try {
    resolveRemotionCli();
  } catch {
    problems.push("Remotion CLI를 찾지 못했습니다. `npm install`을 실행하세요.");
  }
  return { ok: problems.length === 0, problems };
}

// Re-export for status writer convenience.
export { writeStatus };

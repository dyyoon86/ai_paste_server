import { promises as fs } from "node:fs";
import path from "node:path";
import { jobDir, jobPath, JOBS_DIR } from "./paths";

/**
 * Filesystem-backed job state (no DB for MVP, section 1).
 * Layout per job:
 *   /data/jobs/{jobId}/input.txt
 *   /data/jobs/{jobId}/spec.json
 *   /data/jobs/{jobId}/rule-pack.json
 *   /data/jobs/{jobId}/render-plan.json
 *   /data/jobs/{jobId}/render-input.json   (props for `remotion render`)
 *   /data/jobs/{jobId}/project/            (faithful standalone Remotion project)
 *   /data/jobs/{jobId}/output.mp4
 *   /data/jobs/{jobId}/status.json
 *   /data/jobs/{jobId}/render.log
 */

export type JobStatus = "queued" | "rendering" | "completed" | "failed";

export interface JobState {
  jobId: string;
  status: JobStatus;
  progress: number;
  message: string;
  videoUrl: string | null;
  error: string | null;
  usedRulePack: string;
  usedSkillDocIds: string[];
  createdAt: string;
  updatedAt: string;
}

export async function ensureJobsDir(): Promise<void> {
  await fs.mkdir(JOBS_DIR, { recursive: true });
}

export async function createJobDir(jobId: string): Promise<string> {
  const dir = jobDir(jobId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function writeJobFile(
  jobId: string,
  relName: string,
  contents: string,
): Promise<void> {
  const target = jobPath(jobId, relName);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, contents, "utf8");
}

export async function writeJson(
  jobId: string,
  relName: string,
  value: unknown,
): Promise<void> {
  await writeJobFile(jobId, relName, JSON.stringify(value, null, 2));
}

export async function writeStatus(state: JobState): Promise<void> {
  state.updatedAt = nowIso();
  await writeJobFile(state.jobId, "status.json", JSON.stringify(state, null, 2));
}

export async function readStatus(jobId: string): Promise<JobState | null> {
  try {
    const raw = await fs.readFile(jobPath(jobId, "status.json"), "utf8");
    return JSON.parse(raw) as JobState;
  } catch {
    return null;
  }
}

export async function patchStatus(
  jobId: string,
  patch: Partial<JobState>,
): Promise<JobState | null> {
  const current = await readStatus(jobId);
  if (!current) return null;
  const next: JobState = { ...current, ...patch, updatedAt: nowIso() };
  await writeJobFile(jobId, "status.json", JSON.stringify(next, null, 2));
  return next;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function initialState(
  jobId: string,
  rulePackId: string,
  usedSkillDocIds: string[],
): JobState {
  const ts = nowIso();
  return {
    jobId,
    status: "queued",
    progress: 0,
    message: "대기 중...",
    videoUrl: null,
    error: null,
    usedRulePack: rulePackId,
    usedSkillDocIds,
    createdAt: ts,
    updatedAt: ts,
  };
}

export async function outputExists(jobId: string): Promise<boolean> {
  try {
    const st = await fs.stat(jobPath(jobId, "output.mp4"));
    return st.isFile() && st.size > 0;
  } catch {
    return false;
  }
}

import path from "node:path";

/**
 * Filesystem boundaries & path-safety helpers (section 15 of make.md).
 *
 * Everything a job writes MUST live under <repo>/data/jobs/<jobId>. We validate
 * jobId is a plain uuid-ish token and that any resolved path stays inside the
 * job directory.
 */

// REPO_ROOT: where node_modules + remotion/ source live (read-only OK; the
// Remotion CLI is spawned with this as cwd). Overridable for packaged apps.
export const REPO_ROOT = process.env.PASTEMOTION_ROOT || process.cwd();
// DATA_DIR: writable job storage. In a packaged desktop app the install dir is
// read-only, so Electron points this at userData via PASTEMOTION_DATA.
export const DATA_DIR = process.env.PASTEMOTION_DATA || path.join(REPO_ROOT, "data");
export const JOBS_DIR = path.join(DATA_DIR, "jobs");
export const SKILLS_CONTENT_DIR = path.join(
  REPO_ROOT,
  "src",
  "content",
  "remotion-skills",
);

const JOB_ID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export function isValidJobId(jobId: string): boolean {
  return typeof jobId === "string" && JOB_ID_RE.test(jobId);
}

export function jobDir(jobId: string): string {
  if (!isValidJobId(jobId)) {
    throw new Error("잘못된 jobId 형식입니다.");
  }
  return path.join(JOBS_DIR, jobId);
}

/** Resolve a path inside a job dir, guarding against traversal. */
export function jobPath(jobId: string, ...segments: string[]): string {
  const base = jobDir(jobId);
  const resolved = path.resolve(base, ...segments);
  const rel = path.relative(base, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("허용되지 않은 경로 접근입니다.");
  }
  return resolved;
}

/**
 * Resolve a skill markdown path, guarding to the remotion-skills folder only
 * (section 15: 원본 markdown 조회 API는 프로젝트 내 remotion-skills 폴더만 접근 가능).
 */
export function skillContentPath(relPath: string): string {
  // relPath comes from the manifest, e.g. "src/content/remotion-skills/rules/x.md"
  const resolved = path.resolve(REPO_ROOT, relPath);
  const rel = path.relative(SKILLS_CONTENT_DIR, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("허용되지 않은 skill 경로 접근입니다.");
  }
  return resolved;
}

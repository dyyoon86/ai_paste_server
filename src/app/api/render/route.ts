import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { validateVideoSpec } from "@/lib/videoSpecSchema";
import { getRulePack, recommendRulePacks } from "@/lib/rulePacks";
import { scoreHook } from "@/lib/hookScore";
import { buildRenderPlan } from "@/lib/renderPlan";
import {
  ensureJobsDir,
  initialState,
  writeStatus,
} from "@/lib/jobStore";
import { writeJobArtifacts, startRender, preflight } from "@/lib/renderer";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: { spec?: unknown; rulePackId?: unknown; rawInput?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바른 JSON이 아닙니다." }, { status: 400 });
  }

  // Re-validate the spec server-side (never trust the client).
  const validation = validateVideoSpec(body.spec);
  if (!validation.ok || !validation.spec) {
    return NextResponse.json(
      { error: "VIDEO_SPEC 검증 실패", issues: validation.issues, fixPrompt: validation.fixPrompt },
      { status: 422 },
    );
  }
  const spec = validation.spec;

  // Resolve rule pack: explicit choice, else top recommendation.
  const hook = scoreHook(spec);
  let rulePack = typeof body.rulePackId === "string" ? getRulePack(body.rulePackId) : undefined;
  if (rulePack) {
    // Apply aspect-ratio-derived resolution & duration via the recommender so
    // composition defaults match the spec even for an explicit pick.
    const recs = recommendRulePacks(spec, hook.score);
    const matched = recs.find((r) => r.pack.id === rulePack!.id);
    if (matched) rulePack = matched.pack;
  } else {
    const recs = recommendRulePacks(spec, hook.score);
    rulePack = recs[0]?.pack;
  }
  if (!rulePack) {
    return NextResponse.json({ error: "rule pack을 결정할 수 없습니다." }, { status: 400 });
  }

  const pre = await preflight();
  if (!pre.ok) {
    return NextResponse.json(
      { error: "렌더링 환경 점검 실패", problems: pre.problems },
      { status: 503 },
    );
  }

  const plan = buildRenderPlan(spec, rulePack);
  const jobId = randomUUID();

  await ensureJobsDir();
  const state = initialState(jobId, rulePack.id, plan.usedSkillDocIds);
  await writeStatus(state);

  try {
    await writeJobArtifacts({
      jobId,
      rawInput: typeof body.rawInput === "string" ? body.rawInput : JSON.stringify(spec, null, 2),
      spec,
      rulePack,
      plan,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `job 아티팩트 생성 실패: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }

  // Fire-and-forget background render; status.json is polled by the client.
  startRender(state, plan);

  return NextResponse.json({ jobId, status: "queued" }, { status: 202 });
}

import { NextRequest, NextResponse } from "next/server";
import { isValidJobId } from "@/lib/paths";
import { readStatus } from "@/lib/jobStore";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } },
) {
  const { jobId } = params;
  if (!isValidJobId(jobId)) {
    return NextResponse.json({ error: "잘못된 jobId 형식입니다." }, { status: 400 });
  }
  const state = await readStatus(jobId);
  if (!state) {
    return NextResponse.json({ error: "job을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json(state, {
    headers: { "Cache-Control": "no-store" },
  });
}

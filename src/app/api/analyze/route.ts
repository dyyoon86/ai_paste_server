import { NextRequest, NextResponse } from "next/server";
import { analyzeInput } from "@/lib/analyze";

export const runtime = "nodejs";

const MAX_INPUT_BYTES = 256 * 1024; // input size limit (section 15)

export async function POST(req: NextRequest) {
  let body: { input?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, stage: "extract", message: "요청 본문이 올바른 JSON이 아닙니다." },
      { status: 400 },
    );
  }

  const input = typeof body.input === "string" ? body.input : "";
  if (Buffer.byteLength(input, "utf8") > MAX_INPUT_BYTES) {
    return NextResponse.json(
      { ok: false, stage: "extract", message: "입력이 너무 큽니다 (최대 256KB)." },
      { status: 413 },
    );
  }

  const result = analyzeInput(input);
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}

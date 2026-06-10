import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { isValidJobId, jobPath } from "@/lib/paths";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } },
) {
  const { jobId } = params;
  if (!isValidJobId(jobId)) {
    return NextResponse.json({ error: "잘못된 jobId 형식입니다." }, { status: 400 });
  }

  const filePath = jobPath(jobId, "output.mp4");
  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch {
    return NextResponse.json({ error: "완료된 영상이 없습니다." }, { status: 404 });
  }

  const total = stat.size;
  const range = req.headers.get("range");

  if (range) {
    const match = /bytes=(\d+)-(\d*)/.exec(range);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : total - 1;
      if (start >= total || end >= total) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${total}` },
        });
      }
      const stream = createReadStream(filePath, { start, end });
      return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
        status: 206,
        headers: {
          "Content-Type": "video/mp4",
          "Content-Length": String(end - start + 1),
          "Content-Range": `bytes ${start}-${end}/${total}`,
          "Accept-Ranges": "bytes",
        },
      });
    }
  }

  const stream = createReadStream(filePath);
  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(total),
      "Accept-Ranges": "bytes",
      "Content-Disposition": `inline; filename="paste-video-${jobId.slice(0, 8)}.mp4"`,
    },
  });
}

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

/**
 * Free, key-less narration TTS via Microsoft Edge's online voices (msedge-tts).
 * Runs only inside the background render job. Produces an mp3 per scene which is
 * embedded into the render plan as a base64 data URL (no file serving needed;
 * the server stays a pass-through). All failures are swallowed by the caller so
 * a TTS outage just yields a silent render.
 */

const require = createRequire(import.meta.url);

interface MsEdgeTtsModule {
  MsEdgeTTS: new () => {
    setMetadata: (voice: string, format: string) => Promise<void>;
    toStream: (text: string) => { audioStream?: NodeJS.ReadableStream } | NodeJS.ReadableStream;
  };
  OUTPUT_FORMAT: Record<string, string>;
}

/** Lazily load msedge-tts (CJS) at call time so it's never evaluated at build. */
function loadTts(): MsEdgeTtsModule {
  try {
    return require("msedge-tts") as MsEdgeTtsModule;
  } catch {
    return require(path.join(process.cwd(), "node_modules", "msedge-tts")) as MsEdgeTtsModule;
  }
}

export const DEFAULT_VOICE = "ko-KR-SunHiNeural";

/** Synthesize text to an mp3 Buffer. Rejects on TTS/network failure. */
export async function synthesizeMp3(text: string, voice = DEFAULT_VOICE): Promise<Buffer> {
  const { MsEdgeTTS, OUTPUT_FORMAT } = loadTts();
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const res = tts.toStream(text);
  const stream = (res as { audioStream?: NodeJS.ReadableStream }).audioStream ?? (res as NodeJS.ReadableStream);
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    const done = () => resolve();
    stream.on("data", (c: Buffer) => chunks.push(c));
    stream.on("end", done);
    stream.on("close", done);
    stream.on("error", reject);
    setTimeout(done, 25_000); // safety cap
  });
  const buf = Buffer.concat(chunks);
  if (buf.length === 0) throw new Error("TTS produced empty audio");
  return buf;
}

/** Duration (seconds) of an audio file via ffprobe; 0 on failure. */
export function audioDurationSec(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    const p = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    let out = "";
    p.stdout.on("data", (d) => (out += d.toString()));
    p.on("close", () => resolve(parseFloat(out.trim()) || 0));
    p.on("error", () => resolve(0));
  });
}

export interface SceneNarrationResult {
  /** base64 data URL of the mp3 */
  dataUrl: string;
  durationSec: number;
}

/** Synthesize one scene's narration, persisting the mp3 under the job audio dir. */
export async function synthesizeScene(
  audioDir: string,
  sceneId: number,
  text: string,
  voice = DEFAULT_VOICE,
): Promise<SceneNarrationResult> {
  const buf = await synthesizeMp3(text, voice);
  await fs.mkdir(audioDir, { recursive: true });
  const file = path.join(audioDir, `scene-${sceneId}.mp3`);
  await fs.writeFile(file, buf);
  const durationSec = await audioDurationSec(file);
  return { dataUrl: `data:audio/mpeg;base64,${buf.toString("base64")}`, durationSec };
}

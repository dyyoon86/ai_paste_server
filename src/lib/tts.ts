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
    setMetadata: (voice: string, format: string, opts?: { wordBoundaryEnabled?: boolean }) => Promise<void>;
    toStream: (text: string) => {
      audioStream: NodeJS.ReadableStream;
      metadataStream?: NodeJS.ReadableStream | null;
    };
  };
  OUTPUT_FORMAT: Record<string, string>;
}

export interface SubtitleWord {
  /** start time in seconds from the start of this narration */
  t: number;
  w: string;
}

/** Parse msedge-tts WordBoundary metadata (concatenated JSON) into word timings. */
function parseWordBoundaries(meta: string): SubtitleWord[] {
  const out: SubtitleWord[] = [];
  if (!meta) return out;
  for (const part of meta.split(/(?<=\})\s*(?=\{)/)) {
    try {
      const obj = JSON.parse(part);
      for (const md of obj.Metadata ?? []) {
        if (md.Type === "WordBoundary" && md.Data?.text?.Text) {
          out.push({ t: (md.Data.Offset ?? 0) / 1e7, w: md.Data.text.Text });
        }
      }
    } catch {
      /* skip malformed fragment */
    }
  }
  return out;
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

/** Synthesize text to an mp3 Buffer + per-word timings. Rejects on TTS failure. */
export async function synthesizeMp3(
  text: string,
  voice = DEFAULT_VOICE,
): Promise<{ buf: Buffer; words: SubtitleWord[] }> {
  const { MsEdgeTTS, OUTPUT_FORMAT } = loadTts();
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {
    wordBoundaryEnabled: true,
  });
  const { audioStream, metadataStream } = tts.toStream(text);
  const chunks: Buffer[] = [];
  let meta = "";
  await new Promise<void>((resolve, reject) => {
    const done = () => resolve();
    audioStream.on("data", (c: Buffer) => chunks.push(c));
    if (metadataStream) metadataStream.on("data", (m: Buffer) => (meta += m.toString()));
    audioStream.on("end", done);
    audioStream.on("close", done);
    audioStream.on("error", reject);
    setTimeout(done, 25_000); // safety cap
  });
  const buf = Buffer.concat(chunks);
  if (buf.length === 0) throw new Error("TTS produced empty audio");
  return { buf, words: parseWordBoundaries(meta) };
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
  words: SubtitleWord[];
}

/** Synthesize one scene's narration, persisting the mp3 under the job audio dir. */
export async function synthesizeScene(
  audioDir: string,
  sceneId: number,
  text: string,
  voice = DEFAULT_VOICE,
): Promise<SceneNarrationResult> {
  const { buf, words } = await synthesizeMp3(text, voice);
  await fs.mkdir(audioDir, { recursive: true });
  const file = path.join(audioDir, `scene-${sceneId}.mp3`);
  await fs.writeFile(file, buf);
  const durationSec = await audioDurationSec(file);
  return { dataUrl: `data:audio/mpeg;base64,${buf.toString("base64")}`, durationSec, words };
}

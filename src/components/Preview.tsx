"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Player, type PlayerRef, type CallbackListener } from "@remotion/player";
import { PasteVideo } from "../../remotion/Video";
import { buildRenderPlan } from "@/lib/renderPlan";
import { getTheme, themeForSpec } from "@/lib/themes";
import type { VideoSpec } from "@/lib/videoSpecSchema";

/**
 * Pre-render preview. Builds the exact render plan on the client and plays it in
 * the Remotion Player (same composition the server renders), so the user sees a
 * faithful, scrubbable preview before committing to an MP4 render. A scene
 * timeline below the player lets you jump to any scene.
 */
export default function Preview({
  spec,
  themeId,
}: {
  spec: VideoSpec;
  themeId: string | null;
}) {
  const playerRef = useRef<PlayerRef>(null);
  const [frame, setFrame] = useState(0);

  const plan = useMemo(() => {
    const theme = themeId ? getTheme(themeId) : undefined;
    if (!theme) return null;
    return buildRenderPlan(spec, themeForSpec(theme, spec));
  }, [spec, themeId]);

  // Track current frame to highlight the active scene.
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    const onFrame: CallbackListener<"frameupdate"> = (e) => setFrame(e.detail.frame);
    p.addEventListener("frameupdate", onFrame);
    return () => p.removeEventListener("frameupdate", onFrame);
  }, [plan]);

  if (!plan) return null;

  const portrait = plan.height >= plan.width;
  const maxW = portrait ? 264 : 380;
  const scale = maxW / plan.width;
  const dispW = Math.round(plan.width * scale);
  const dispH = Math.round(plan.height * scale);

  const seek = (f: number) => {
    playerRef.current?.seekTo(f);
  };

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      <div className="shrink-0">
        <Player
          ref={playerRef}
          component={PasteVideo}
          inputProps={{ plan }}
          durationInFrames={Math.max(1, plan.durationInFrames)}
          fps={plan.fps}
          compositionWidth={plan.width}
          compositionHeight={plan.height}
          style={{
            width: dispW,
            height: dispH,
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid #2a2140",
          }}
          controls
          loop
          clickToPlay
          spaceKeyToPlayOrPause
          acknowledgeRemotionLicense
        />
        <p className="mt-2 text-center text-[11px] text-[#6f6489]">
          미리보기 · {Math.round(plan.durationInFrames / plan.fps)}초 · {plan.fps}fps · {plan.width}×{plan.height}
        </p>
      </div>

      {/* Scene timeline */}
      <div className="flex-1">
        <p className="mb-2 text-xs font-semibold text-[#b6a6d6]">
          타임라인 ({plan.scenes.length}개 장면 · 클릭하면 이동)
        </p>
        <div className="flex h-9 w-full overflow-hidden rounded-lg border border-[#2a2140]">
          {plan.scenes.map((s) => {
            const active = frame >= s.startFrame && frame < s.endFrame;
            const pct = (s.durationInFrames / plan.durationInFrames) * 100;
            return (
              <button
                key={s.id}
                onClick={() => seek(s.startFrame)}
                title={`Scene ${s.id}: ${s.screenText}`}
                style={{ width: `${pct}%`, background: active ? s.accent : "#171026" }}
                className="flex items-center justify-center border-r border-[#0c0817] text-[10px] font-bold text-white transition-colors last:border-r-0 hover:brightness-125"
              >
                {s.id}
              </button>
            );
          })}
        </div>
        <div className="mt-3 space-y-1.5">
          {plan.scenes.map((s) => {
            const active = frame >= s.startFrame && frame < s.endFrame;
            return (
              <button
                key={s.id}
                onClick={() => seek(s.startFrame)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${
                  active ? "border-brand bg-brand/10" : "border-[#241c38] bg-[#0c0817] hover:border-[#3a2e55]"
                }`}
              >
                <span
                  style={{ background: s.accent }}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-bold text-white"
                >
                  {s.id}
                </span>
                <span className="flex-1 truncate text-sm text-[#e6ddf6]">{s.screenText}</span>
                <span className="shrink-0 text-[11px] text-[#7d7298]">
                  {(s.startFrame / plan.fps).toFixed(1)}–{(s.endFrame / plan.fps).toFixed(1)}s
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

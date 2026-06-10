"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { AnalyzeResult, AnalyzeSuccess } from "@/lib/analyze";
import type { JobState } from "@/lib/jobStore";
import type { VideoSpec, Scene } from "@/lib/videoSpecSchema";

const TRANSITIONS = ["fade", "slide", "zoom", "wipe", "cut"] as const;
const EFFECTS = ["none", "punch-in", "punch-out"] as const;

const ASPECT_RES: Record<string, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
  "1:1": { width: 1080, height: 1080 },
};

/** Even, contiguous re-timing across the duration (keeps the spec server-valid). */
function retime(scenes: Scene[], duration: number): Scene[] {
  const n = scenes.length;
  if (n === 0) return scenes;
  const r = (v: number) => Math.round(v * 10) / 10;
  return scenes.map((s, i) => ({
    ...s,
    id: i + 1,
    start: r((i * duration) / n),
    end: i === n - 1 ? duration : r(((i + 1) * duration) / n),
  }));
}

// Remotion Player runs in the browser only.
const Preview = dynamic(() => import("@/components/Preview"), {
  ssr: false,
  loading: () => <p className="text-xs text-subtle">미리보기 로딩 중...</p>,
});

type DocView = { id: string; title: string; path: string; rawMarkdown: string } | null;

export default function Home() {
  const [input, setInput] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [showAllThemes, setShowAllThemes] = useState(false);
  const [job, setJob] = useState<JobState | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [docView, setDocView] = useState<DocView>(null);
  const [editSpec, setEditSpec] = useState<VideoSpec | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const success = analysis?.ok ? (analysis as AnalyzeSuccess) : null;

  // The edited spec is the source of truth for preview/render once analyzed.
  const resolvedRes = editSpec
    ? ASPECT_RES[editSpec.aspect_ratio] ?? editSpec.resolution
    : { width: 0, height: 0 };

  const patchScene = useCallback((index: number, patch: Partial<Scene>) => {
    setEditSpec((prev) => {
      if (!prev) return prev;
      const scenes = prev.scenes.map((s, i) => (i === index ? { ...s, ...patch } : s));
      return { ...prev, scenes };
    });
  }, []);

  const addScene = useCallback(() => {
    setEditSpec((prev) => {
      if (!prev || prev.scenes.length >= 30) return prev;
      const next: Scene = {
        id: prev.scenes.length + 1,
        start: 0,
        end: 1,
        screen_text: "새 장면",
        narration: "",
        visual_direction: "",
        transition: "fade",
        effect: "none",
      };
      return { ...prev, scenes: retime([...prev.scenes, next], prev.duration_seconds) };
    });
  }, []);

  const removeScene = useCallback((index: number) => {
    setEditSpec((prev) => {
      if (!prev || prev.scenes.length <= 1) return prev;
      const scenes = prev.scenes.filter((_, i) => i !== index);
      return { ...prev, scenes: retime(scenes, prev.duration_seconds) };
    });
  }, []);

  const setDuration = useCallback((seconds: number) => {
    setEditSpec((prev) => {
      if (!prev) return prev;
      const d = Math.max(3, Math.min(180, Math.round(seconds)));
      return { ...prev, duration_seconds: d, scenes: retime(prev.scenes, d) };
    });
  }, []);

  const runAnalyze = useCallback(async (text: string) => {
    setAnalyzing(true);
    setRenderError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: text }),
      });
      const data: AnalyzeResult = await res.json();
      setAnalysis(data);
      if (data.ok) {
        setSelectedTheme(data.recommendations[0]?.id ?? null);
        setEditSpec(data.spec);
      }
    } catch (err) {
      setAnalysis({
        ok: false,
        stage: "extract",
        message: `분석 요청 실패: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startRender = useCallback(async () => {
    if (!editSpec || !selectedTheme) return;
    setRendering(true);
    setRenderError(null);
    setJob(null);
    stopPolling();
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spec: editSpec,
          themeId: selectedTheme,
          rawInput: input,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRenderError(
          data.error +
            (data.problems ? `\n- ${data.problems.join("\n- ")}` : "") +
            (data.issues ? `\n- ${data.issues.map((i: { path: string; message: string }) => `${i.path}: ${i.message}`).join("\n- ")}` : ""),
        );
        setRendering(false);
        return;
      }
      const jobId: string = data.jobId;
      pollRef.current = setInterval(async () => {
        try {
          const s = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
          if (!s.ok) return;
          const state: JobState = await s.json();
          setJob(state);
          if (state.status === "completed" || state.status === "failed") {
            stopPolling();
            setRendering(false);
          }
        } catch {
          /* keep polling */
        }
      }, 1200);
    } catch (err) {
      setRenderError(`렌더링 요청 실패: ${err instanceof Error ? err.message : String(err)}`);
      setRendering(false);
    }
  }, [editSpec, selectedTheme, input, stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const openDoc = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/remotion-skills/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setDocView({ id: data.id, title: data.title, path: data.path, rawMarkdown: data.rawMarkdown });
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      {/* Header */}
      <header className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="text-[15px] font-semibold tracking-tight text-fg">PasteMotion</span>
        </div>
        <span className="text-[12px] text-subtle">paste → video</span>
      </header>

      <h1 className="mb-6 text-[34px] font-bold leading-[1.08] tracking-[-0.02em] text-fg">
        붙여넣으면, 영상이 됩니다.
      </h1>

      {/* Paste box */}
      <section className="rounded-3xl border border-line bg-surface p-5">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          placeholder="여기에 VIDEO_SPEC_JSON을 붙여넣으세요. (스킬이 만든 ---BEGIN_VIDEO_SPEC_JSON--- 블록 전체를 그대로 붙여도 됩니다)"
          className="scrollbar-thin h-52 w-full resize-y rounded-2xl border border-line2 bg-inset p-4 font-mono text-xs leading-relaxed text-fg outline-none transition focus:border-accent placeholder:text-faint"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => runAnalyze(input)}
            disabled={analyzing || !input.trim()}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-canvas transition hover:brightness-105 disabled:opacity-30"
          >
            {analyzing ? "불러오는 중..." : "불러오기"}
          </button>
        </div>
      </section>

      {/* Errors */}
      {analysis && !analysis.ok && (
        <ErrorPanel result={analysis} />
      )}

      {/* Analysis */}
      {success && editSpec && (
        <>
          <AnalysisPanel spec={editSpec} resolution={resolvedRes} />

          {/* live Preview (left, sticky) + scene-by-scene editor (right) */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-start">
            <div className="lg:sticky lg:top-4">
              <section className="rounded-3xl border border-line bg-surface p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-fg">미리보기</h2>
                  <button
                    onClick={startRender}
                    disabled={rendering}
                    className="rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-fg shadow-glow transition hover:brightness-110 disabled:opacity-40"
                  >
                    {rendering ? "렌더링 중..." : "MP4 생성"}
                  </button>
                </div>
                <Preview spec={editSpec} themeId={selectedTheme} compact />
              </section>
            </div>
            <SpecEditor
              spec={editSpec}
              onTitle={(title) => setEditSpec((p) => (p ? { ...p, title } : p))}
              onDuration={setDuration}
              onCta={(cta) => setEditSpec((p) => (p ? { ...p, cta } : p))}
              onPatchScene={patchScene}
              onAddScene={addScene}
              onRemoveScene={removeScene}
            />
          </div>

          <ThemePanel
            data={success}
            selected={selectedTheme}
            onSelect={setSelectedTheme}
            onViewDoc={openDoc}
            onOpenGallery={() => setShowAllThemes(true)}
          />

          {showAllThemes && (
            <ThemeGalleryModal
              data={success}
              selected={selectedTheme}
              onSelect={(id) => {
                setSelectedTheme(id);
                setShowAllThemes(false);
              }}
              onClose={() => setShowAllThemes(false)}
            />
          )}
        </>
      )}

      {/* Render */}
      {(rendering || job || renderError) && (
        <RenderPanel job={job} error={renderError} />
      )}

      {docView && <DocModal doc={docView} onClose={() => setDocView(null)} />}

      <footer className="mt-16 border-t border-line pt-5 text-[11px] text-faint">
        Remotion · 붙여넣기로 만드는 영상 초안
      </footer>
    </main>
  );
}

function ErrorPanel({ result }: { result: Extract<AnalyzeResult, { ok: false }> }) {
  return (
    <section className="mt-6 rounded-3xl border border-red-500/30 bg-red-950/20 p-5">
      <h2 className="text-base font-bold text-red-300">
        {result.stage === "extract" ? "JSON 추출 실패" : "검증 실패"}
      </h2>
      <p className="mt-1 text-sm text-red-200/90">{result.message}</p>
      {result.detail && (
        <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-xs text-red-200/70">
          {result.detail}
        </pre>
      )}
      {result.issues && result.issues.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-red-200/90">
          {result.issues.map((i, idx) => (
            <li key={idx}>
              <code className="text-red-300">{i.path}</code> — {i.message}
            </li>
          ))}
        </ul>
      )}
      {result.fixPrompt && (
        <div className="mt-4">
          <p className="mb-1 text-xs font-semibold text-red-300">Claude에 다시 넣을 수정 프롬프트:</p>
          <pre className="scrollbar-thin max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-xs text-red-100/80">
            {result.fixPrompt}
          </pre>
        </div>
      )}
    </section>
  );
}

function AnalysisPanel({
  spec,
  resolution,
}: {
  spec: VideoSpec;
  resolution: { width: number; height: number };
}) {
  return (
    <section className="mt-6 rounded-3xl border border-line bg-surface p-5">
      <h2 className="mb-3 text-base font-bold text-fg">분석</h2>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Meta label="제목" value={spec.title} />
        <Meta label="길이" value={`${spec.duration_seconds}초`} />
        <Meta label="장면" value={`${spec.scenes.length}개`} />
        <Meta label="해상도" value={`${resolution.width}×${resolution.height} (${spec.aspect_ratio})`} />
        {spec.core_message ? <Meta label="핵심" value={spec.core_message} /> : null}
      </div>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className="text-subtle">{label}</span>
      <span className="text-fg2">{value}</span>
    </span>
  );
}

function SpecEditor({
  spec,
  onTitle,
  onDuration,
  onCta,
  onPatchScene,
  onAddScene,
  onRemoveScene,
}: {
  spec: VideoSpec;
  onTitle: (v: string) => void;
  onDuration: (v: number) => void;
  onCta: (v: VideoSpec["cta"]) => void;
  onPatchScene: (index: number, patch: Partial<Scene>) => void;
  onAddScene: () => void;
  onRemoveScene: (index: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const inputCls =
    "w-full rounded-lg border border-line2 bg-inset px-3 py-2 text-sm text-fg outline-none focus:border-brand";
  return (
    <section className="rounded-3xl border border-line bg-surface p-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-fg">내용 편집</h2>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-line2 px-3 py-1 text-xs text-muted hover:border-brand"
        >
          {open ? "접기" : "펼치기"}
        </button>
      </div>
      <p className="mb-4 text-xs text-subtle">
        JSON을 몰라도 됩니다. 여기서 고치면 옆 미리보기에 바로 반영됩니다.
      </p>

      {open && (
        <div className="space-y-4">
          {/* meta row */}
          <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
            <label className="block">
              <span className="mb-1 block text-[11px] text-muted">제목</span>
              <input className={inputCls} value={spec.title} onChange={(e) => onTitle(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] text-muted">길이(초)</span>
              <input
                type="number"
                min={3}
                max={180}
                className={inputCls}
                value={spec.duration_seconds}
                onChange={(e) => onDuration(Number(e.target.value) || spec.duration_seconds)}
              />
            </label>
            <label className="flex items-end gap-2 pb-2">
              <input
                type="checkbox"
                checked={spec.cta.enabled}
                onChange={(e) => onCta({ ...spec.cta, enabled: e.target.checked })}
              />
              <span className="text-xs text-muted">CTA</span>
            </label>
          </div>
          {spec.cta.enabled && (
            <input
              className={inputCls}
              placeholder="CTA 문구 (예: 지금 시작하세요 ✅)"
              value={spec.cta.text}
              onChange={(e) => onCta({ ...spec.cta, text: e.target.value })}
            />
          )}

          {/* scenes */}
          <div className="space-y-3">
            {spec.scenes.map((s, i) => (
              <div key={i} className="rounded-2xl border border-line bg-inset p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-muted">
                    장면 {i + 1}
                    <span className="ml-2 font-normal text-faint tabular">
                      {s.start}–{s.end}s
                    </span>
                  </span>
                  <button
                    onClick={() => onRemoveScene(i)}
                    disabled={spec.scenes.length <= 1}
                    className="rounded px-2 py-0.5 text-[11px] text-faint hover:text-red-400 disabled:opacity-30"
                  >
                    삭제
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
                  <input
                    className={inputCls}
                    placeholder="화면 문구 (짧게)"
                    value={s.screen_text}
                    onChange={(e) => onPatchScene(i, { screen_text: e.target.value })}
                  />
                  <input
                    className={inputCls}
                    placeholder="내레이션 (설명)"
                    value={s.narration}
                    onChange={(e) => onPatchScene(i, { narration: e.target.value })}
                  />
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="flex items-center gap-2">
                    <span className="w-10 text-[11px] text-faint">전환</span>
                    <select
                      className={inputCls}
                      value={TRANSITIONS.includes(s.transition as (typeof TRANSITIONS)[number]) ? s.transition : "fade"}
                      onChange={(e) => onPatchScene(i, { transition: e.target.value })}
                    >
                      {TRANSITIONS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="w-10 text-[11px] text-faint">강조</span>
                    <select
                      className={inputCls}
                      value={EFFECTS.includes((s.effect as (typeof EFFECTS)[number]) ?? "none") ? (s.effect ?? "none") : "none"}
                      onChange={(e) => onPatchScene(i, { effect: e.target.value })}
                    >
                      {EFFECTS.map((t) => (
                        <option key={t} value={t}>{t === "none" ? "없음" : t === "punch-in" ? "패스트 줌인" : "패스트 줌아웃"}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="w-10 shrink-0 text-[11px] text-faint">아이콘</span>
                  <input
                    className={inputCls}
                    placeholder="이모지 (예: 🕐 ✅ 💡 📊)"
                    value={s.icon ?? ""}
                    onChange={(e) => onPatchScene(i, { icon: e.target.value })}
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="w-10 shrink-0 text-[11px] text-faint">포인트</span>
                  <input
                    className={inputCls}
                    placeholder="요약 포인트, 쉼표 구분 (예: 1회용, 자동 식별, 유효기간)"
                    value={(s.points ?? []).join(", ")}
                    onChange={(e) =>
                      onPatchScene(i, {
                        points: e.target.value.split(",").map((x) => x.trim()).filter(Boolean),
                      })
                    }
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="w-10 shrink-0 text-[11px] text-faint">이미지</span>
                  <input
                    className={inputCls}
                    placeholder="이미지 URL (선택)"
                    value={s.image && !s.image.startsWith("data:") ? s.image : ""}
                    onChange={(e) => onPatchScene(i, { image: e.target.value })}
                  />
                  <label className="shrink-0 cursor-pointer rounded-lg border border-line2 px-3 py-2 text-[11px] text-fg2 hover:border-brand">
                    파일
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const r = new FileReader();
                        r.onload = () => onPatchScene(i, { image: String(r.result) });
                        r.readAsDataURL(f);
                      }}
                    />
                  </label>
                  {s.image ? (
                    <button
                      onClick={() => onPatchScene(i, { image: "" })}
                      className="shrink-0 text-[11px] text-faint hover:text-red-400"
                    >
                      제거
                    </button>
                  ) : null}
                </div>
                {s.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.image} alt="" className="mt-2 h-14 w-full rounded-lg object-cover" />
                ) : null}
              </div>
            ))}
          </div>

          <button
            onClick={onAddScene}
            disabled={spec.scenes.length >= 30}
            className="rounded-lg border border-line2 px-4 py-2 text-xs font-semibold text-fg2 hover:border-brand disabled:opacity-40"
          >
            + 장면 추가 ({spec.scenes.length}/30)
          </button>
        </div>
      )}
    </section>
  );
}

type Rec = AnalyzeSuccess["recommendations"][number];

function ThemeSwatches({ palette }: { palette: Rec["palette"] }) {
  const swatches = [palette.background, palette.accent, palette.accent2, palette.text];
  return (
    <div className="flex overflow-hidden rounded-lg border border-black/30">
      {swatches.map((c, i) => (
        <div key={i} style={{ background: c }} className="h-7 flex-1" />
      ))}
    </div>
  );
}

function ThemeCard({
  rec,
  active,
  onSelect,
  onViewDoc,
  compact,
}: {
  rec: Rec;
  active: boolean;
  onSelect: (id: string) => void;
  onViewDoc: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl border p-4 transition ${
        active ? "border-brand bg-brand/10" : "border-line2 bg-inset"
      }`}
    >
      <div className="mb-2">
        <ThemeSwatches palette={rec.palette} />
      </div>
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-fg">{rec.name}</h3>
        <span className="rounded-full border border-line2 px-1.5 py-0.5 text-[9px] uppercase text-subtle">
          {rec.palette.isLight ? "light" : "dark"} · {rec.palette.fontId}
        </span>
      </div>
      <p className="mt-1 text-xs text-fg2">{rec.vibe}</p>
      <p className="mt-1 text-[11px] text-subtle">{rec.reason}</p>
      {!compact && (
        <div className="mt-2 flex flex-wrap gap-1">
          {rec.usedSkillDocIds.slice(0, 5).map((id) => (
            <button
              key={id}
              onClick={() => onViewDoc(id)}
              title="원본 Remotion markdown 보기"
              className="rounded border border-line2 px-1.5 py-0.5 text-[10px] text-muted hover:border-brand hover:text-fg"
            >
              {id}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => onSelect(rec.id)}
        className={`mt-3 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
          active ? "bg-brand text-fg" : "bg-line2 text-fg hover:bg-line3"
        }`}
      >
        {active ? "선택됨 ✓" : "이 테마 사용"}
      </button>
    </div>
  );
}

function groupByCategory(items: Rec[]): { label: string; items: Rec[] }[] {
  const groups: { label: string; items: Rec[] }[] = [];
  const byCat = new Map<string, { label: string; items: Rec[] }>();
  for (const t of items) {
    let g = byCat.get(t.category);
    if (!g) {
      g = { label: t.categoryLabel, items: [] };
      byCat.set(t.category, g);
      groups.push(g);
    }
    g.items.push(t);
  }
  return groups;
}

function ThemePanel({
  data,
  selected,
  onSelect,
  onViewDoc,
  onOpenGallery,
}: {
  data: AnalyzeSuccess;
  selected: string | null;
  onSelect: (id: string) => void;
  onViewDoc: (id: string) => void;
  onOpenGallery: () => void;
}) {
  // If the selected theme isn't one of the 3 recommendations, surface it as a
  // 4th card so the user always sees what's currently applied.
  const recIds = new Set(data.recommendations.map((r) => r.id));
  const selectedExtra =
    selected && !recIds.has(selected)
      ? data.allThemes.find((t) => t.id === selected)
      : undefined;
  const cards = selectedExtra
    ? [selectedExtra, ...data.recommendations]
    : data.recommendations;

  return (
    <section className="mt-6 rounded-3xl border border-line bg-surface p-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-fg">디자인 템플릿</h2>
        <button
          onClick={onOpenGallery}
          className="rounded-lg border border-line2 px-3 py-1.5 text-xs font-semibold text-fg2 transition hover:border-brand"
        >
          전체 {data.allThemes.length}개 둘러보기 →
        </button>
      </div>
      <p className="mb-4 text-xs text-subtle">
        주제에 맞춰 추천된 템플릿입니다. 각 템플릿은 색·폰트·레이아웃·모션이 다릅니다.
        선택하면 아래 미리보기에 바로 반영됩니다.
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {cards.slice(0, 3).map((rec) => (
          <ThemeCard
            key={rec.id}
            rec={rec}
            active={selected === rec.id}
            onSelect={onSelect}
            onViewDoc={onViewDoc}
          />
        ))}
      </div>
      <p className="mt-3 text-[11px] text-faint">
        칩(skill doc)을 클릭하면 Remotion 원본 markdown을 그대로 볼 수 있습니다.
      </p>
    </section>
  );
}

function ThemeGalleryModal({
  data,
  selected,
  onSelect,
  onClose,
}: {
  data: AnalyzeSuccess;
  selected: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = q.trim()
    ? data.allThemes.filter((t) =>
        `${t.name} ${t.vibe} ${t.categoryLabel} ${t.bestFor.join(" ")}`
          .toLowerCase()
          .includes(q.trim().toLowerCase()),
      )
    : data.allThemes;
  const groups = groupByCategory(filtered);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-t-2xl border border-line2 bg-surface sm:max-h-[88vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line p-4">
          <div>
            <h3 className="font-bold text-fg">디자인 템플릿 — 전체 {data.allThemes.length}개</h3>
            <p className="text-[11px] text-subtle">클릭하면 적용되고 닫힙니다 · 미리보기에 반영됩니다</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="검색 (이름·무드·카테고리)"
              className="w-44 rounded-lg border border-line2 bg-inset px-3 py-1.5 text-xs text-fg outline-none focus:border-brand"
            />
            <button
              onClick={onClose}
              className="rounded-lg border border-line2 px-3 py-1.5 text-sm text-muted hover:border-brand"
            >
              닫기
            </button>
          </div>
        </div>

        <div className="scrollbar-thin overflow-auto p-4">
          {groups.length === 0 ? (
            <p className="py-10 text-center text-sm text-subtle">검색 결과가 없습니다.</p>
          ) : (
            <div className="space-y-5">
              {groups.map((g) => (
                <div key={g.label}>
                  <p className="mb-2 text-xs font-semibold text-muted">
                    {g.label}
                    <span className="ml-1 text-faint">({g.items.length})</span>
                  </p>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {g.items.map((rec) => (
                      <ThemeCard
                        key={rec.id}
                        rec={rec}
                        active={selected === rec.id}
                        onSelect={onSelect}
                        onViewDoc={() => {}}
                        compact
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RenderPanel({ job, error }: { job: JobState | null; error: string | null }) {
  const progress = job ? Math.round(job.progress * 100) : 0;
  return (
    <section className="mt-6 rounded-3xl border border-line bg-surface p-5">
      <h2 className="mb-3 text-base font-bold text-fg">렌더링</h2>

      {error && (
        <pre className="mb-3 whitespace-pre-wrap rounded-lg bg-red-950/30 p-3 text-xs text-red-200">
          {error}
        </pre>
      )}

      {job && (
        <>
          <div className="mb-1 flex items-center justify-between text-xs text-muted">
            <span>
              상태: <b className="text-fg">{statusLabel(job.status)}</b>
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-inset">
            <div
              className={`h-full rounded-full transition-all ${
                job.status === "failed" ? "bg-red-500" : "bg-brand"
              }`}
              style={{ width: `${Math.max(3, progress)}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-fg">{job.message}</p>
          {job.error && (
            <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-red-950/30 p-3 text-xs text-red-200">
              {job.error}
            </pre>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-subtle">
            <span>테마: {job.usedRulePack}</span>
            <span>·</span>
            <span>skills: {job.usedSkillDocIds.join(", ")}</span>
          </div>

          {job.status === "completed" && job.videoUrl && (
            <div className="mt-4">
              <video
                src={job.videoUrl}
                controls
                playsInline
                className="max-h-[70vh] w-auto rounded-2xl border border-line2"
              />
              <div className="mt-3">
                <a
                  href={job.videoUrl}
                  download={`paste-video-${job.jobId.slice(0, 8)}.mp4`}
                  className="inline-block rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-fg hover:brightness-110"
                >
                  MP4 다운로드
                </a>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function statusLabel(s: JobState["status"]): string {
  switch (s) {
    case "queued":
      return "대기 중";
    case "rendering":
      return "렌더링 중";
    case "completed":
      return "완료";
    case "failed":
      return "실패";
  }
}

function DocModal({ doc, onClose }: { doc: NonNullable<DocView>; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-line2 bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line p-4">
          <div>
            <h3 className="font-bold text-fg">{doc.title}</h3>
            <p className="text-[11px] text-subtle">{doc.path}</p>
          </div>
          <button onClick={onClose} className="rounded-lg px-3 py-1 text-sm text-muted hover:bg-line2">
            닫기
          </button>
        </div>
        <pre className="scrollbar-thin overflow-auto whitespace-pre-wrap p-4 text-xs leading-relaxed text-fg">
          {doc.rawMarkdown}
        </pre>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SAMPLE_INPUT } from "@/lib/sampleInput";
import type { AnalyzeResult, AnalyzeSuccess } from "@/lib/analyze";
import type { JobState } from "@/lib/jobStore";

type DocView = { id: string; title: string; path: string; rawMarkdown: string } | null;

export default function Home() {
  const [input, setInput] = useState(SAMPLE_INPUT);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [job, setJob] = useState<JobState | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [docView, setDocView] = useState<DocView>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const success = analysis?.ok ? (analysis as AnalyzeSuccess) : null;

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
        setSelectedPack(data.recommendations[0]?.id ?? null);
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

  // Re-analyze from an in-memory spec (used by hook suggestions).
  const reanalyzeSpec = useCallback(
    async (specObj: unknown) => {
      const wrapped = `---BEGIN_VIDEO_SPEC_JSON---\n${JSON.stringify(specObj, null, 2)}\n---END_VIDEO_SPEC_JSON---`;
      setInput(wrapped);
      await runAnalyze(wrapped);
    },
    [runAnalyze],
  );

  const applyHook = useCallback(
    (hookText: string) => {
      if (!success) return;
      const next = structuredClone(success.spec);
      if (next.scenes[0]) next.scenes[0].screen_text = hookText;
      void reanalyzeSpec(next);
    },
    [success, reanalyzeSpec],
  );

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startRender = useCallback(async () => {
    if (!success || !selectedPack) return;
    setRendering(true);
    setRenderError(null);
    setJob(null);
    stopPolling();
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spec: success.spec,
          rulePackId: selectedPack,
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
  }, [success, selectedPack, input, stopPolling]);

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
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand text-xl font-black text-white">
            P
          </span>
          <h1 className="text-2xl font-black tracking-tight">PasteMotion</h1>
          <span className="rounded-full border border-brand/40 px-2 py-0.5 text-xs text-brand-fg">
            Remotion Paste Renderer
          </span>
        </div>
        <p className="mt-3 text-lg font-semibold text-white">
          Claude 결과를 붙여넣으면 영상 초안이 됩니다
        </p>
        <p className="text-sm text-[#9a8fb5]">
          강한 훅과 Remotion skills 기반 디자인 규칙으로 MP4까지 렌더링
        </p>
      </header>

      {/* Paste box */}
      <section className="rounded-3xl border border-[#241c38] bg-[#120d1f] p-5">
        <label className="mb-2 block text-sm font-semibold text-[#b6a6d6]">
          Claude 답변 전체를 붙여넣으세요 (구분자 자동 추출)
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          className="scrollbar-thin h-56 w-full resize-y rounded-2xl border border-[#2a2140] bg-[#0c0817] p-4 font-mono text-xs leading-relaxed text-[#d8cef0] outline-none focus:border-brand"
        />
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            onClick={() => runAnalyze(input)}
            disabled={analyzing}
            className="rounded-xl bg-[#2a2140] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#372a55] disabled:opacity-50"
          >
            {analyzing ? "추출 중..." : "JSON 추출"}
          </button>
          <button
            onClick={startRender}
            disabled={!success || rendering}
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-40"
          >
            {rendering ? "렌더링 중..." : "영상 생성"}
          </button>
          <button
            onClick={() => setInput(SAMPLE_INPUT)}
            className="rounded-xl border border-[#2a2140] px-4 py-2.5 text-sm text-[#b6a6d6] hover:border-brand"
          >
            샘플 불러오기
          </button>
        </div>
      </section>

      {/* Errors */}
      {analysis && !analysis.ok && (
        <ErrorPanel result={analysis} />
      )}

      {/* Analysis */}
      {success && (
        <>
          <AnalysisPanel data={success} onApplyHook={applyHook} />
          <RulePackPanel
            data={success}
            selected={selectedPack}
            onSelect={setSelectedPack}
            onViewDoc={openDoc}
          />
        </>
      )}

      {/* Render */}
      {(rendering || job || renderError) && (
        <RenderPanel job={job} error={renderError} />
      )}

      {docView && <DocModal doc={docView} onClose={() => setDocView(null)} />}

      <footer className="mt-12 border-t border-[#241c38] pt-5 text-xs text-[#6f6489]">
        디자인 규칙은 <code className="text-brand-fg">remotion-dev/skills</code> 의 공식 markdown을 기반으로 적용됩니다.
        CSS transition/animation 없이 Remotion으로 deterministic하게 렌더링합니다.
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
  data,
  onApplyHook,
}: {
  data: AnalyzeSuccess;
  onApplyHook: (text: string) => void;
}) {
  const { spec, hook } = data;
  const gradeColor =
    hook.score >= 75 ? "text-emerald-400" : hook.score >= 60 ? "text-amber-400" : "text-red-400";
  return (
    <section className="mt-6 grid gap-4 rounded-3xl border border-[#241c38] bg-[#120d1f] p-5 md:grid-cols-2">
      <div>
        <h2 className="mb-3 text-base font-bold text-white">분석</h2>
        <dl className="space-y-2 text-sm">
          <Row label="제목" value={spec.title} />
          <Row label="핵심 메시지" value={spec.core_message} />
          <Row label="영상 길이" value={`${spec.duration_seconds}초`} />
          <Row label="장면 수" value={`${spec.scenes.length}개`} />
          <Row label="해상도" value={`${data.resolvedResolution.width}×${data.resolvedResolution.height} (${spec.aspect_ratio})`} />
        </dl>
      </div>
      <div>
        <div className="flex items-baseline gap-3">
          <h2 className="text-base font-bold text-white">훅 점수</h2>
          <span className={`text-3xl font-black ${gradeColor}`}>{hook.score}</span>
          <span className={`text-sm font-semibold ${gradeColor}`}>{hook.grade}</span>
        </div>
        {hook.warning && (
          <p className="mt-2 rounded-lg bg-amber-950/30 p-2 text-xs text-amber-300">{hook.warning}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {hook.signals.map((s, i) => (
            <span
              key={i}
              className={`rounded-full px-2 py-0.5 text-[11px] ${
                s.delta >= 0 ? "bg-emerald-900/40 text-emerald-300" : "bg-red-900/40 text-red-300"
              }`}
            >
              {s.label} {s.delta > 0 ? `+${s.delta}` : s.delta}
            </span>
          ))}
        </div>
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold text-[#b6a6d6]">훅 개선안 (클릭하면 첫 장면 교체)</p>
          <div className="space-y-1.5">
            {data.hookSuggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onApplyHook(s)}
                className="block w-full rounded-lg border border-[#2a2140] bg-[#0c0817] px-3 py-2 text-left text-sm text-[#d8cef0] transition hover:border-brand"
              >
                {i + 1}. {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 shrink-0 text-[#7d7298]">{label}</dt>
      <dd className="text-[#e6ddf6]">{value}</dd>
    </div>
  );
}

function RulePackPanel({
  data,
  selected,
  onSelect,
  onViewDoc,
}: {
  data: AnalyzeSuccess;
  selected: string | null;
  onSelect: (id: string) => void;
  onViewDoc: (id: string) => void;
}) {
  return (
    <section className="mt-6 rounded-3xl border border-[#241c38] bg-[#120d1f] p-5">
      <h2 className="mb-1 text-base font-bold text-white">디자인 / 룰</h2>
      <p className="mb-4 text-xs text-[#7d7298]">
        설치된 Remotion skills markdown 기반으로 자동 추천된 rule pack입니다. 직접 선택할 수도 있습니다.
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {data.recommendations.map((rec) => {
          const active = selected === rec.id;
          return (
            <div
              key={rec.id}
              className={`flex flex-col rounded-2xl border p-4 transition ${
                active ? "border-brand bg-brand/10" : "border-[#2a2140] bg-[#0c0817]"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white">{rec.name}</h3>
                {active && <span className="text-xs font-bold text-brand-fg">선택됨</span>}
              </div>
              <p className="mt-1 text-xs text-[#9a8fb5]">{rec.reason}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {rec.usedSkillDocIds.map((id) => (
                  <button
                    key={id}
                    onClick={() => onViewDoc(id)}
                    title="원본 markdown 보기"
                    className="rounded border border-[#332954] px-1.5 py-0.5 text-[10px] text-[#b6a6d6] hover:border-brand hover:text-white"
                  >
                    {id}
                  </button>
                ))}
              </div>
              <button
                onClick={() => onSelect(rec.id)}
                className={`mt-3 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  active ? "bg-brand text-white" : "bg-[#2a2140] text-[#d8cef0] hover:bg-[#372a55]"
                }`}
              >
                이 rule pack 사용
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-[#6f6489]">
        칩(skill doc)을 클릭하면 Remotion 원본 markdown을 그대로 볼 수 있습니다.
      </p>
    </section>
  );
}

function RenderPanel({ job, error }: { job: JobState | null; error: string | null }) {
  const progress = job ? Math.round(job.progress * 100) : 0;
  return (
    <section className="mt-6 rounded-3xl border border-[#241c38] bg-[#120d1f] p-5">
      <h2 className="mb-3 text-base font-bold text-white">렌더링</h2>

      {error && (
        <pre className="mb-3 whitespace-pre-wrap rounded-lg bg-red-950/30 p-3 text-xs text-red-200">
          {error}
        </pre>
      )}

      {job && (
        <>
          <div className="mb-1 flex items-center justify-between text-xs text-[#b6a6d6]">
            <span>
              상태: <b className="text-white">{statusLabel(job.status)}</b>
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-[#0c0817]">
            <div
              className={`h-full rounded-full transition-all ${
                job.status === "failed" ? "bg-red-500" : "bg-brand"
              }`}
              style={{ width: `${Math.max(3, progress)}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-[#d8cef0]">{job.message}</p>
          {job.error && (
            <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-red-950/30 p-3 text-xs text-red-200">
              {job.error}
            </pre>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[#7d7298]">
            <span>rule pack: {job.usedRulePack}</span>
            <span>·</span>
            <span>skills: {job.usedSkillDocIds.join(", ")}</span>
          </div>

          {job.status === "completed" && job.videoUrl && (
            <div className="mt-4">
              <video
                src={job.videoUrl}
                controls
                playsInline
                className="max-h-[70vh] w-auto rounded-2xl border border-[#2a2140]"
              />
              <div className="mt-3">
                <a
                  href={job.videoUrl}
                  download={`paste-video-${job.jobId.slice(0, 8)}.mp4`}
                  className="inline-block rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white hover:brightness-110"
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
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-[#2a2140] bg-[#120d1f]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#241c38] p-4">
          <div>
            <h3 className="font-bold text-white">{doc.title}</h3>
            <p className="text-[11px] text-[#7d7298]">{doc.path}</p>
          </div>
          <button onClick={onClose} className="rounded-lg px-3 py-1 text-sm text-[#b6a6d6] hover:bg-[#2a2140]">
            닫기
          </button>
        </div>
        <pre className="scrollbar-thin overflow-auto whitespace-pre-wrap p-4 text-xs leading-relaxed text-[#d8cef0]">
          {doc.rawMarkdown}
        </pre>
      </div>
    </div>
  );
}

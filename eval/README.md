# 평가 하네스 (Loop Engineering)

> "측정 없는 진화는 금지." 스킬/컴포지션을 바꿀 때마다 **고정 시험지(골든셋)** 위에서 점수를 재고, **평균이 오를 때만** 변경을 채택한다. (생성 AI와 채점 AI는 분리 — 자기 시험 자기 채점 금지)

## 구성
- `golden_set.json` — 고정 주제 시험지. **동결**(기존 주제 수정 금지, 추가만). 바뀌면 버전 비교 무의미.
- `rubric.md` — 채점 AI 전용 품질 루브릭(hook/story/graphic/pacing/polish, 각 0~10).
- `evaluate.mjs` — **채점기**: 결정론적 구조 점수(0~50, 하드제약/타이밍/음성싱크/XOR 등) + critic 프롬프트 생성.
- `run.mjs` — **측정 루프 러너**: 각 주제로 스킬이 스펙 생성(생성 AI) → 구조 자동검사 + critic AI 품질채점 → 평균 + `results/`에 기록.

## 사용
```bash
# 전체 골든셋 측정 (생성+채점, claude CLI 필요)
node eval/run.mjs

# 앞 N개만 / 빠른 구조점수만(claude 불필요)
node eval/run.mjs --n 3
node eval/run.mjs --no-critic

# 단일 스펙 빠른 채점(구조점수)
node eval/evaluate.mjs path/to/spec.json
```

## 루프(스킬을 개선하는 법)
1. 현재 스킬로 `node eval/run.mjs` → 평균점수 A 기록.
2. 스킬을 **한 군데만** 바꾼다.
3. 다시 `node eval/run.mjs` → 평균점수 B.
4. **B > A 일 때만** 그 변경을 채택(커밋). 아니면 버린다.
5. 실패한 변경은 한 줄 메모로 남겨 같은 헛수고 반복 방지.

점수 = 구조(50, 결정론) + 품질(50, critic AI) = 100점.

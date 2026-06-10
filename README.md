# PasteMotion — Remotion Paste Renderer

Claude 웹에서 만든 영상 스펙(JSON)을 붙여넣으면, 서버가 **Remotion**으로 MP4 영상 초안을 렌더링하는 Next.js 웹앱입니다.

> 강한 훅 + 검증된 Remotion 디자인/애니메이션 규칙 + 수정 가능한 영상 초안 생성기

## 흐름

```
무료 Claude 웹에서 영상 스펙 생성
→ 결과 복사 → 웹앱에 붙여넣기 → JSON 파싱/검증
→ 훅 점수 분석 → Remotion rule pack 자동 추천
→ Remotion 프로젝트 자동 생성 → MP4 렌더링 → 미리보기/다운로드
```

## 기술 스택

- **Next.js 14 (App Router)** + TypeScript + Tailwind CSS
- **Remotion 4** (`useCurrentFrame`/`interpolate`/`spring`/`Sequence` 기반, CSS 애니메이션 미사용)
- **zod** 검증 · **Vitest** 테스트
- Node.js 22+ · FFmpeg · 로컬 파일시스템 잡 스토어(MVP, DB 없음)

## Remotion skills

디자인 규칙은 직접 만든 템플릿이 아니라 **Remotion 공식 skills markdown**을 기반으로 합니다.

```bash
npm run skills:add      # npx skills add remotion-dev/skills
npm run manifest        # src/content/remotion-skills → src/generated/remotionSkillsManifest.ts
```

원본 markdown은 `src/content/remotion-skills/`에 그대로 보존되며, 앱 내 `/api/remotion-skills`로 조회할 수 있습니다.

## 실행

```bash
npm install
npm run dev             # http://localhost:3000  (predev가 manifest를 자동 생성)
# 또는
npm run build && npm start
npm test                # Vitest
npm run remotion:studio # Remotion Studio 미리보기
```

## 디렉터리

```
remotion/                     공유 Remotion 컴포지션 (실제 렌더 엔트리: remotion/index.ts)
src/lib/                      파서 · zod 스키마 · 훅 점수 · rule pack · 렌더 플랜 · 렌더러
src/content/remotion-skills/  보존된 Remotion skills 원본 markdown
src/generated/                스캔으로 생성된 skills manifest
src/app/                      UI(page.tsx) + API 라우트
data/jobs/{jobId}/            잡별 산출물 (spec/rule-pack/render-plan/project/output.mp4/status)
test/                         Vitest 테스트
```

## API

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/analyze` | 붙여넣은 텍스트 → JSON 추출/검증 + 훅 점수 + rule pack 추천 |
| POST | `/api/render` | 잡 생성 + 백그라운드 Remotion 렌더 시작 |
| GET | `/api/jobs/{jobId}` | 잡 상태/진행률 |
| GET | `/api/jobs/{jobId}/video` | 완료된 `output.mp4` (Range 지원) |
| GET | `/api/remotion-skills` | skills 문서 목록 |
| GET | `/api/remotion-skills/{id}` | 원본 markdown |

## 입력 구분자

```
---BEGIN_VIDEO_SPEC_JSON---
{ ...VideoSpec... }
---END_VIDEO_SPEC_JSON---
```

레거시 `---BEGIN_HYPERFRAMES_VIDEO_SPEC_JSON---` 구분자, ` ```json ` 코드펜스, 구분자 없는 순수 JSON도 지원합니다.

## 보안 (MVP)

- jobId는 uuid, 모든 파일 경로는 `data/jobs/{jobId}` 내부로 제한 (경로 탈출 차단)
- `child_process`에 사용자 입력을 shell string으로 넣지 않음 (argv 배열 + props 파일)
- 입력 크기 제한 256KB · scene 최대 30개 · 길이 최대 180초 · 렌더 타임아웃 8분
- 원본 markdown 조회는 `remotion-skills` 폴더로 한정

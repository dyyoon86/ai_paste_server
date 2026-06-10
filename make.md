# Remotion Skills 기반 Paste-to-Video Server MVP 구현 프롬프트

너는 숙련된 풀스택/비디오 렌더링 개발자다.  
아래 스펙대로 **Claude 웹 결과를 붙여넣으면 서버가 Remotion으로 MP4 영상을 렌더링하는 웹앱**을 구현해라.

중요: 디자인 템플릿 72개를 우리가 직접 하드코딩하지 않는다.  
대신 아래 명령으로 받은 **Remotion 공식/커뮤니티 skills markdown과 rules markdown을 프로젝트에 그대로 포함하고**, 그 내용을 우리 프로그램의 디자인/렌더링 규칙 엔진에 녹인다.

```bash
npx skills add remotion-dev/skills
```

이 앱의 핵심은 다음이다.

```text
무료 Claude 웹에서 영상 스펙 생성
→ 사용자가 결과를 복사
→ 우리 웹앱에 붙여넣기
→ 서버가 JSON 파싱
→ Remotion skills/rules markdown 기반으로 디자인/애니메이션 규칙 적용
→ Remotion 프로젝트 자동 생성
→ MP4 렌더링
→ 미리보기/다운로드
```

---

## 0. 제품 포지션

이 앱은 “대충 영상이 나오는 툴”이 아니다.  
그리고 “전문 편집자를 대체하는 고급 편집툴”도 아니다.

정확한 포지션은 아래다.

```text
강한 훅 + 검증된 Remotion 디자인/애니메이션 규칙 + 수정 가능한 영상 초안 생성기
```

반드시 지켜야 할 기준:

```text
- 첫 3초 훅은 강해야 한다.
- 디자인은 직접 만든 허술한 72개 템플릿이 아니라 Remotion skills/rules에서 가져온 규칙을 기반으로 한다.
- 모바일에서 글자가 읽혀야 한다.
- 장면 전환과 텍스트 애니메이션은 Remotion 방식으로 deterministic하게 구현한다.
- CSS transition/animation에 의존하지 않는다.
- 실제 MP4 파일이 생성되어야 한다.
```

---

## 1. 기술 스택

```text
Framework: Next.js App Router
Language: TypeScript
Styling: Tailwind CSS
UI: shadcn/ui 또는 기본 컴포넌트
Video renderer: Remotion
Runtime: Node.js 22+
Video dependency: FFmpeg
Storage: local filesystem for MVP
Queue: simple in-memory job queue for MVP
Package manager: npm
Validation: zod
Tests: Vitest
```

MVP에서는 DB를 쓰지 않는다.

```text
/data/jobs/{jobId}/input.txt
/data/jobs/{jobId}/spec.json
/data/jobs/{jobId}/render-plan.json
/data/jobs/{jobId}/project/
/data/jobs/{jobId}/output.mp4
/data/jobs/{jobId}/status.json
```

---

## 2. Remotion skills 설치/흡수 방식

## 2.1 설치

프로젝트 초기화 후 반드시 아래 명령을 실행한다.

```bash
npx skills add remotion-dev/skills
```

설치 결과로 생긴 markdown/rules 파일을 확인한다.
어느 경로에 설치되는지는 환경마다 다를 수 있으므로, 설치 후 아래 방식으로 탐색한다.

```bash
find . -iname "*.md" | grep -i remotion
find . -type d | grep -i skills
```

만약 `npx skills add remotion-dev/skills`가 네트워크/환경 문제로 실패하면:

```text
- 실패 로그를 명확히 남긴다.
- 앱 구현 자체는 중단하지 않는다.
- 대신 `docs/remotion-skills/README.md`에 “설치 필요” 안내를 작성한다.
- 하지만 최종 완료 전에는 다시 설치를 시도한다.
```

## 2.2 원본 markdown 보존

설치된 Remotion skill/rules markdown은 우리 프로그램 안에 복사해 보존한다.

권장 경로:

```text
src/content/remotion-skills/
  SKILL.md
  rules/
    text-animations.md
    transitions.md
    timing.md
    sequencing.md
    google-fonts.md
    images.md
    videos.md
    audio.md
    captions.md
    ...
```

중요:

```text
- markdown 내용을 임의로 요약해서 없애지 말 것.
- 원본 파일명과 디렉터리 구조를 최대한 유지할 것.
- 앱에서 이 markdown들을 읽고 표시/참조할 수 있게 할 것.
- 렌더링 코드 생성 규칙은 이 markdown 내용을 기반으로 만들 것.
```

## 2.3 skills manifest 생성

설치된 markdown을 스캔해서 아래 파일을 생성한다.

```text
src/generated/remotionSkillsManifest.ts
```

타입:

```ts
export type RemotionSkillDoc = {
  id: string;
  title: string;
  path: string;
  category:
    | "core"
    | "text"
    | "transition"
    | "timing"
    | "sequence"
    | "font"
    | "image"
    | "video"
    | "audio"
    | "caption"
    | "layout"
    | "effect"
    | "unknown";
  tags: string[];
  summary: string;
  rawMarkdown: string;
};

export const remotionSkillDocs: RemotionSkillDoc[] = [ ... ];
```

주의:

```text
- rawMarkdown를 포함해서 앱이 원문을 참조할 수 있게 한다.
- 너무 큰 경우에는 rawMarkdown를 별도 `/api/remotion-skills/{id}`로 lazy load해도 된다.
- 하지만 원본 md 파일은 반드시 프로젝트에 포함한다.
```

---

## 3. 핵심 UX

메인 페이지 `/`에 아래 UI를 만든다.

```text
상단:
- 제품명: PasteMotion 또는 Remotion Paste Renderer
- 카피: “Claude 결과를 붙여넣으면 영상 초안이 됩니다”
- 서브카피: “강한 훅과 Remotion skills 기반 디자인 규칙으로 MP4까지 렌더링”

중앙:
- 큰 textarea
- 버튼: JSON 추출
- 버튼: 영상 생성

분석 영역:
- 제목
- 핵심 메시지
- 영상 길이
- 장면 수
- 훅 점수
- 훅 개선안 3개

디자인/룰 영역:
- 자동 선택된 Remotion rule pack
- 사용된 markdown/rules 목록
- 사용자가 rule pack을 바꿀 수 있는 선택 UI
- 원본 markdown 보기 버튼

렌더링 영역:
- 상태 바
- 로그 요약
- 완료 후 video 태그 미리보기
- MP4 다운로드 버튼
```

사용자는 전체 Claude 답변을 붙여넣어도 된다.
앱은 아래 구분자 사이 JSON만 추출한다.

```text
---BEGIN_HYPERFRAMES_VIDEO_SPEC_JSON---
{ ...json... }
---END_HYPERFRAMES_VIDEO_SPEC_JSON---
```

기존 스킬 호환성을 위해 구분자 이름은 일단 유지한다.  
다만 내부 렌더러는 Remotion이다.

추가로 새 구분자도 지원한다.

```text
---BEGIN_VIDEO_SPEC_JSON---
{ ...json... }
---END_VIDEO_SPEC_JSON---
```

구분자가 없으면 textarea 전체를 JSON으로 파싱한다.

---

## 4. VIDEO_SPEC_JSON 스키마

아래 스키마를 zod로 검증한다.

```ts
type VideoSpec = {
  schema: "hyperframes.one_click_video.v1" | "remotion.one_click_video.v1";
  title: string;
  format: "vertical_short_video" | "horizontal_video" | "square_video";
  aspect_ratio: "9:16" | "16:9" | "1:1";
  resolution: {
    width: number;
    height: number;
  };
  duration_seconds: number;
  language: string;
  style: {
    name: string;
    background: string;
    accent_color: string;
    text_style: string;
    motion: string;
  };
  summary: string;
  core_message: string;
  cta: {
    enabled: boolean;
    text: string;
    action: string;
  };
  scenes: Array<{
    id: number;
    start: number;
    end: number;
    screen_text: string;
    narration: string;
    visual_direction: string;
    transition: string;
  }>;
  assets: Array<{
    type: "image" | "video" | "audio";
    url?: string;
    local_path?: string;
    description?: string;
  }>;
  render_notes: string[];
};
```

검증 실패 시 사용자에게 아래를 보여준다.

```text
- 빠진 필드
- 잘못된 타입
- 문제가 된 경로
- Claude에 다시 넣을 수정 프롬프트
```

---

## 5. 훅 품질 검사

이 제품은 “그냥 렌더링”이 아니라 “첫 3초 훅이 강한 영상”을 만든다.

렌더링 전에 첫 scene의 `screen_text`와 `narration`을 검사한다.

## 5.1 훅 점수

0~100점 휴리스틱을 구현한다.

가점:

```text
+20 질문형: “아직도”, “왜”, “혹시”, “모르면”, “해봤나요”
+20 문제형: “막막”, “귀찮”, “반복”, “시간 낭비”, “안 된다”
+20 반전형: “사실”, “그런데”, “하지만”, “진짜 문제는”
+20 결과형: “바로”, “3초”, “자동”, “완성”, “MP4”, “만들어집니다”
+10 짧은 문장: screen_text가 4~16자
+10 시각적 대비: Before/After, 손작업/자동화, 빈화면/완성본 등 대비 표현
```

감점:

```text
-30 “오늘은 ~ 알아보겠습니다”
-20 너무 긴 screen_text
-20 추상적인 표현만 있음
-20 첫 장면이 설명형임
```

기준:

```text
90 이상: 매우 좋음
75 이상: 좋음
60 이상: 보통
60 미만: 약함
```

60 미만이면 경고를 띄운다.

```text
첫 3초 훅이 약합니다. 그래도 렌더링할 수 있지만, 조회 유지율이 낮을 수 있습니다.
```

## 5.2 훅 개선안

서버에서 LLM을 호출하지 않는다.
규칙 기반으로 훅 개선안 3개를 제안한다.

예:

```text
1. “아직도 이걸 손으로 하나요?”
2. “내용만 넣었는데 영상이 나왔습니다”
3. “빈 화면에서 시작하지 마세요”
```

사용자가 클릭하면 첫 scene의 `screen_text`를 교체한다.

---

## 6. 디자인 템플릿을 직접 만들지 말고 Remotion rule pack을 만든다

기존 계획의 “72개 디자인 템플릿 직접 작성”은 폐기한다.

대신 설치된 Remotion skills markdown을 기반으로 rule pack을 만든다.

## 6.1 RulePack 타입

```ts
export type RemotionRulePack = {
  id: string;
  name: string;
  description: string;
  bestFor: string[];
  requiredSkillDocIds: string[];
  optionalSkillDocIds: string[];
  compositionDefaults: {
    fps: number;
    width: number;
    height: number;
    durationInFrames: number;
  };
  visualDefaults: {
    background: string;
    surface: string;
    text: string;
    mutedText: string;
    accent: string;
    accent2: string;
    borderRadius: number;
    safeArea: number;
  };
  animationRules: {
    sceneEnter: "fade" | "slide-up" | "zoom" | "wipe" | "pop";
    textEmphasis: "highlight" | "scale" | "underline" | "none";
    transition: "cut" | "fade" | "slide" | "wipe" | "zoom";
    easing: string;
  };
  remotionNotes: string[];
};
```

## 6.2 기본 RulePack은 “템플릿”이 아니라 “skills 조합”이다

최소 아래 rule pack을 만든다.

```text
1. Hook First Short
   - 짧은 숏폼, 강한 첫 장면
   - text-animations, timing, transitions, sequencing 중심

2. Clean Explainer
   - 설명/교육형
   - sequencing, text-animations, google-fonts, measuring-text 중심

3. Product Demo
   - 제품/서비스 소개
   - images, videos, sequencing, transitions 중심

4. Data Story
   - 숫자/리포트/인사이트
   - timing, measuring-text, transitions, images 중심

5. Social Bold
   - SNS용 큰 타이포
   - text-animations, timing, transitions 중심

6. Premium Pitch
   - 브랜드/피치덱 느낌
   - google-fonts, timing, transitions, images 중심
```

중요:

```text
- 위 rule pack은 6개만 시작해도 된다.
- 하지만 각 rule pack은 반드시 실제 Remotion markdown/rules 파일 id를 requiredSkillDocIds에 연결해야 한다.
- 디자인 세부 규칙은 우리가 상상해서 쓰는 것이 아니라, Remotion skills markdown에서 권장하는 방식으로 구현한다.
```

---

## 7. RulePack 자동 추천

사용자가 JSON을 붙여넣으면 앱이 rule pack을 추천한다.

추천 규칙:

```text
- aspect_ratio에 맞게 width/height 결정
- 첫 장면이 강한 훅이면 Hook First Short 또는 Social Bold 우선
- 숫자/통계/보고서/인사이트가 많으면 Data Story 우선
- 제품/서비스/기능 설명이면 Product Demo 우선
- 강의/튜토리얼/교육이면 Clean Explainer 우선
- 피치/브랜드/투자/고급 느낌이면 Premium Pitch 우선
- 기본값은 Hook First Short
```

UI에는 추천 rule pack 3개를 보여준다.
각 카드에는 아래를 보여준다.

```text
- rule pack 이름
- 추천 이유
- 사용될 Remotion skill docs 목록
- 원본 markdown 보기
```

---

## 8. Remotion 프로젝트 생성

렌더링 API:

```text
POST /api/render
```

입력:

```json
{
  "spec": "VideoSpec",
  "rulePackId": "hook-first-short"
}
```

응답:

```json
{
  "jobId": "abc123",
  "status": "queued"
}
```

서버 작업:

```text
1. jobId 생성
2. /data/jobs/{jobId}/ 폴더 생성
3. spec.json 저장
4. rule-pack.json 저장
5. render-plan.json 생성
6. Remotion 프로젝트 생성
7. Remotion 컴포지션 파일 작성
8. 렌더링 작업 시작
9. status.json 갱신
```

MVP에서는 `child_process.spawn`으로 백그라운드 렌더링을 처리한다.
단, 사용자 입력을 shell string에 직접 넣지 않는다.

---

## 9. Remotion 프로젝트 파일 구조

각 job 폴더 아래에 Remotion 프로젝트를 만든다.

```text
/data/jobs/{jobId}/project/
  package.json
  remotion.config.ts
  src/
    Root.tsx
    Video.tsx
    Scene.tsx
    Background.tsx
    TextBlock.tsx
    transitions.ts
    animations.ts
    spec.ts
    rulePack.ts
  public/
```

`src/Root.tsx`에서는 `Composition`을 정의한다.

```tsx
import { Composition } from "remotion";
import { Video } from "./Video";
import { spec } from "./spec";

export const RemotionRoot = () => {
  const fps = 30;
  const durationInFrames = Math.ceil(spec.duration_seconds * fps);

  return (
    <Composition
      id="PasteVideo"
      component={Video}
      durationInFrames={durationInFrames}
      fps={fps}
      width={spec.resolution.width}
      height={spec.resolution.height}
      defaultProps={{ spec }}
    />
  );
};
```

## 9.1 Remotion 구현 규칙

반드시 지켜라.

```text
- CSS transition 사용 금지
- CSS animation 사용 금지
- Tailwind animate-* 클래스 사용 금지
- 모든 시간 기반 애니메이션은 useCurrentFrame(), interpolate(), Easing, spring() 사용
- 장면 배치는 Sequence 사용
- 전체 화면 배치는 AbsoluteFill 사용
- 이미지에는 Remotion Img 사용
- 영상에는 Remotion Video 사용
- 오디오는 Audio 사용
- public 폴더 파일은 staticFile() 사용
```

---

## 10. 렌더링 명령

프로젝트 생성 후 렌더링은 아래 방식으로 한다.

```bash
npx remotion render src/Root.tsx PasteVideo /data/jobs/{jobId}/output.mp4
```

개발/디버그용 preview:

```bash
npx remotion studio
```

레이아웃 확인용 still render:

```bash
npx remotion still src/Root.tsx PasteVideo /data/jobs/{jobId}/still.png --frame=30 --scale=0.25
```

Node 22+, FFmpeg, Remotion 설치 여부를 사전에 확인한다.

```bash
node --version
ffmpeg -version
npx remotion --version
```

---

## 11. 상태 API

```text
GET /api/jobs/{jobId}
```

응답:

```json
{
  "jobId": "abc123",
  "status": "queued | rendering | completed | failed",
  "progress": 0.42,
  "message": "Rendering scene 3...",
  "videoUrl": "/api/jobs/abc123/video",
  "error": null,
  "usedRulePack": "hook-first-short",
  "usedSkillDocIds": ["text-animations", "timing", "transitions", "sequencing"]
}
```

---

## 12. 비디오 다운로드 API

```text
GET /api/jobs/{jobId}/video
```

완료된 `output.mp4`를 반환한다.

---

## 13. Remotion skills 문서 조회 API

원본 markdown을 앱에서 볼 수 있어야 한다.

```text
GET /api/remotion-skills
GET /api/remotion-skills/{id}
```

`/api/remotion-skills` 응답:

```json
{
  "docs": [
    {
      "id": "text-animations",
      "title": "Text animations",
      "category": "text",
      "summary": "Typography and text animation patterns"
    }
  ]
}
```

`/api/remotion-skills/{id}` 응답:

```json
{
  "id": "text-animations",
  "path": "src/content/remotion-skills/rules/text-animations.md",
  "rawMarkdown": "..."
}
```

---

## 14. 에러 처리

아래 상황을 처리한다.

```text
- JSON 파싱 실패
- VIDEO_SPEC_JSON 구분자 없음
- 필수 필드 누락
- scenes 배열이 비어 있음
- duration_seconds와 scene 시간이 맞지 않음
- npx skills add remotion-dev/skills 실패
- Remotion skills markdown을 찾지 못함
- Node 버전 부족
- FFmpeg 없음
- Remotion 실행 실패
- 렌더링 타임아웃
- output.mp4 없음
```

사용자에게는 이해 가능한 메시지를 보여준다.

예:

```text
렌더링에 실패했습니다.
원인: FFmpeg를 찾을 수 없습니다.
해결: 서버에 FFmpeg를 설치한 뒤 다시 시도하세요.
```

---

## 15. 보안

MVP라도 아래는 지킨다.

```text
- jobId는 uuid 사용
- 모든 파일 경로는 /data/jobs/{jobId} 내부로 제한
- child_process에 사용자 입력을 shell string으로 직접 넣지 말 것
- assets URL 다운로드는 MVP에서 비활성화하거나 allowlist만 허용
- 입력 JSON 크기 제한
- scene 최대 30개
- duration_seconds 최대 180초
- 렌더링 타임아웃 설정
- 원본 markdown 조회 API는 프로젝트 내 remotion-skills 폴더만 접근 가능
```

---

## 16. 테스트

Vitest로 아래 테스트를 작성한다.

```text
- VIDEO_SPEC_JSON 구분자 추출 테스트
- 새 구분자 BEGIN_VIDEO_SPEC_JSON 추출 테스트
- 구분자 없을 때 전체 JSON 파싱 테스트
- zod 스키마 검증 테스트
- 훅 점수 계산 테스트
- 훅 개선안 생성 테스트
- Remotion skills markdown 스캔 테스트
- remotionSkillsManifest 생성 테스트
- RulePack 추천 테스트
- job 폴더 생성 테스트
- render-plan.json 생성 테스트
- status.json 갱신 테스트
- Remotion render command 인자 생성 테스트
```

---

## 17. 샘플 입력

개발 중 기본 textarea 예시로 넣는다.

```text
---BEGIN_VIDEO_SPEC_JSON---
{
  "schema": "remotion.one_click_video.v1",
  "title": "글을 넣으면 영상이 나오는 방식",
  "format": "vertical_short_video",
  "aspect_ratio": "9:16",
  "resolution": { "width": 1080, "height": 1920 },
  "duration_seconds": 30,
  "language": "ko",
  "style": {
    "name": "clean modern motion graphics",
    "background": "dark gradient",
    "accent_color": "#7C3AED",
    "text_style": "large bold mobile readable",
    "motion": "subtle kinetic typography"
  },
  "summary": "Claude가 만든 영상 설계를 서버 웹앱에 붙여넣으면 Remotion으로 MP4 초안을 렌더링한다.",
  "core_message": "내용만 있어도 강한 훅과 Remotion 규칙 기반 영상 초안을 만들 수 있다.",
  "cta": {
    "enabled": false,
    "text": "",
    "action": "none"
  },
  "scenes": [
    {
      "id": 1,
      "start": 0,
      "end": 3,
      "screen_text": "아직도 빈 화면?",
      "narration": "영상 만들 때 제일 어려운 건 편집보다 시작입니다.",
      "visual_direction": "큰 흰색 타이포, 어두운 배경, 보라색 글로우",
      "transition": "fade in"
    },
    {
      "id": 2,
      "start": 3,
      "end": 7,
      "screen_text": "내용만 넣기",
      "narration": "Claude에 주제나 원고를 넣으면 영상 설계가 나옵니다.",
      "visual_direction": "텍스트 입력 박스와 화살표",
      "transition": "slide"
    },
    {
      "id": 3,
      "start": 7,
      "end": 12,
      "screen_text": "복사해서 붙여넣기",
      "narration": "그 결과를 서버 웹앱에 붙여넣습니다.",
      "visual_direction": "JSON 카드가 브라우저 창으로 들어가는 모션",
      "transition": "wipe"
    },
    {
      "id": 4,
      "start": 12,
      "end": 19,
      "screen_text": "Remotion 규칙 적용",
      "narration": "직접 만든 허술한 템플릿 대신 Remotion skills의 규칙을 적용합니다.",
      "visual_direction": "markdown rule 카드들이 영상 컴포지션으로 변환되는 모션",
      "transition": "zoom"
    },
    {
      "id": 5,
      "start": 19,
      "end": 25,
      "screen_text": "MP4 렌더링",
      "narration": "서버가 Remotion으로 실제 영상 파일을 만듭니다.",
      "visual_direction": "렌더링 프로그레스 바와 MP4 파일 아이콘",
      "transition": "slide"
    },
    {
      "id": 6,
      "start": 25,
      "end": 30,
      "screen_text": "초안부터 완성",
      "narration": "완벽한 편집보다 먼저, 시작 가능한 영상이 생깁니다.",
      "visual_direction": "완성된 세로 영상 미리보기",
      "transition": "fade"
    }
  ],
  "assets": [],
  "render_notes": [
    "Use Korean-safe font fallback.",
    "Keep all text within mobile safe area.",
    "Avoid long paragraphs on screen."
  ]
}
---END_VIDEO_SPEC_JSON---
```

---

## 18. 완료 기준

구현 완료 후 아래를 반드시 확인한다.

```text
- npm install 성공
- npx skills add remotion-dev/skills 성공 또는 명확한 실패 처리
- Remotion skills markdown이 src/content/remotion-skills/에 복사됨
- remotionSkillsManifest.ts 생성됨
- npm run dev 성공
- 메인 페이지 접속 가능
- 샘플 VIDEO_SPEC_JSON 붙여넣기 가능
- JSON 추출 성공
- 훅 점수 표시
- 추천 rule pack 3개 표시
- 사용된 Remotion skill docs 표시
- 원본 markdown 보기 가능
- 영상 생성 job 생성
- status API 동작
- Remotion 프로젝트 생성
- render-plan.json 생성
- output.mp4 생성 또는 명확한 렌더링 실패 메시지 표시
- output.mp4 생성 시 브라우저 미리보기 가능
- 다운로드 가능
- npm test 통과
```

절대 placeholder로 끝내지 마라.  
“나머지는 구현 예정”이라고 하지 마라.  
최소 MVP가 실제로 실행되어야 한다.

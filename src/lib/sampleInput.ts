/** Default textarea sample (section 17 of make.md). */
export const SAMPLE_INPUT = `---BEGIN_VIDEO_SPEC_JSON---
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
---END_VIDEO_SPEC_JSON---`;

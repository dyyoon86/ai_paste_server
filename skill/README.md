# remotion-shorts-spec — Claude 스킬 (PasteMotion 두뇌)

무료 Claude 사용자가 **쇼츠 주제/제목만 주면 `VIDEO_SPEC_JSON`을 뽑아주는** Claude 스킬입니다.
영상은 직접 만들지 않고(웹에서는 불가), **JSON만** 출력합니다. 그 JSON을 이 저장소의
**Remotion Paste Server(PasteMotion)** 에 붙여넣어 MP4로 렌더링합니다.

```
무료 Claude 웹: 제목 입력 → 이 스킬이 VIDEO_SPEC_JSON 생성
        ↓ 복사
PasteMotion(웹앱): 붙여넣기 → JSON 추출 → 디자인 템플릿 선택 → 미리보기 → MP4 생성
```

## Claude 웹(claude.ai)에 등록하는 법

1. `SKILL.md` 파일(이 폴더)을 준비합니다.
2. claude.ai → Settings → **Capabilities/Skills** 에서 스킬 업로드(또는 Projects의 커스텀 인스트럭션에 `SKILL.md` 본문을 붙여넣기).
3. 등록 후, 대화창에 영상 주제를 입력:
   - "이 주제로 쇼츠 스펙 만들어줘: FDS가 사기를 막는 법"
   - "직장인 점심 10분 레시피 영상 JSON"
4. 출력된 `---BEGIN_VIDEO_SPEC_JSON--- … ---END_VIDEO_SPEC_JSON---` 블록을 복사.

> 스킬 업로드가 안 되는 플랜이면, `SKILL.md` 본문을 그대로 대화 첫 메시지에 붙여넣고 맨 끝에 제목만
> 적어도 동일하게 동작합니다.

## PasteMotion에서 렌더

1. PasteMotion 웹앱 textarea에 위 JSON 블록을 붙여넣기
2. **JSON 추출** → 훅 점수·추천 템플릿 확인
3. **전체 72개 둘러보기**에서 디자인 템플릿 선택 → **미리보기** 확인
4. **이 디자인으로 MP4 생성**

## 보장 사항
- 서버 zod 스키마 완전 준수(빠진 필드 시 PasteMotion이 수정 프롬프트 안내)
- 강한 첫 3초 훅, 5~6장면 내러티브, 위협=빨강·완료=초록 무드 큐
- 렌더 명령/HyperFrames 프롬프트/파일 저장 안내 없음 — **JSON만**

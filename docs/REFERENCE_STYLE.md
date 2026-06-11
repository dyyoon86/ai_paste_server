# 레퍼런스 스타일 분석 & 그래픽 요소 제작 가이드

> 출처: 바이브랩스 "프롬프트의 시대는 가고 루프의 시대" (youtu.be/oZUeRib1Xec) — Claude Code + Remotion 시네마틱 explainer.
> 이 문서는 그 영상의 비주얼 시스템을 분해해, PasteMotion(고정 템플릿 + JSON) 에서 **JSON 호출만으로** 같은 결을 내기 위한 설계서다.
> 상태 표기: ✅ 구현됨 / 🔜 추가 필요.

---

## 0. 스타일 정체성 (한 줄)
**칠흑 시네마틱 배경 + 영문 키커 + 2색 헤드라인 + 코드로 그린 인포그래픽/벡터 프롭 + 하단 카라오케 자막.**
정신없는 장식 없이 여백 많고, 텍스트는 고정·안정. 움직임은 배경·등장·전환에서만.

---

## 1. 레이아웃 시스템
원본은 가로 16:9 좌측정렬이지만, **우리는 세로 9:16 중앙정렬**로 적응한다(숏폼 필수).

세로 레터박스 3분할:
- **상단 검정바(~15.5%)**: 영상 제목(2색, `*…*`=강조).
- **가운데 콘텐츠 창(~64.5%)**: 배경 + [키커 → 헤드라인 → (이모지/그래픽/포인트)].
- **하단 검정바(~20%)**: 내레이션 카라오케 자막.
- 경계에 진행바.

씬 1개 = 메시지 1개. 헤드라인 4~16자.

구현: `remotion/Video.tsx`(레터박스/제목바/진행바/자막바), `remotion/Scene.tsx`(씬 내부 스택).

---

## 2. 타이포 구성요소
- **키커(kicker)**: 영문 대문자 + 와이드 트래킹(예: `THE OLD WAY`, `RED ZONE · ASK FIRST`). 등장 시 레터스페이싱이 벌어지며 페이드인. → JSON `visual_direction`에 영문 키커를 넣는다. ✅
- **헤드라인**: 큰 2색. `*강조*`로 감싼 단어는 accent 박스. 단어별 스프링 펀치 등장(좌→우 스태거). → JSON `screen_text`. ✅
- **서브라인**: 헤드라인 아래 작은 muted 설명(1~2줄). 🔜(현재 points로 대체 가능)
- **자막**: 하단, 어절마다 색 변화(읽은=흰, 현재=accent, 예정=회색). TTS 단어 타이밍 기반. → JSON `narration`. ✅

---

## 3. 컬러·악센트 시스템
- 베이스: 거의 검정(#07~#11 계열).
- 악센트는 **씬 무드별로 전환**: 시안/블루(기본·정보), 앰버/골드(강조·결과), 그린(해결·완료), 레드(위험·RED ZONE).
- 우리 구현: 테마(themeId)가 기본 accent를 정하고, 씬 무드 감지(`detectSceneMood`)로 위험=red/해결=green 자동 전환. ✅
- 다크 테마 후보: `linear-dark`(퍼플), `plex-slate`(틸), `dashboard`(시안/네이비), `headline-bold`(골드).

---

## 4. 모션 원칙 (중요)
1. **텍스트·그래픽은 등장 후 고정.** 지속적인 흔들림(호흡 스케일/플로트) 금지 — 싸구려로 보인다. ✅(제거함)
2. **등장 애니메이션을 강조**: 단어/이모지/칩/그래픽이 스프링 오버슈트로 "톡!" 등장. ✅
3. **전환은 `cut` 기본**(세로에서 깔끔). fade는 0.4s 디졸브. ✅
4. **움직이는 건 배경**: 보케 광원 드리프트 + 필름 그레인 셔머 + 노드 네트워크. 텍스트는 정지.
5. 자막은 전환 겹침을 반영한 실제 타임라인에 싱크(문장 잘림 방지). ✅

---

## 5. 배경 레이어
### 5-1. 프로시저럴 시네마틱 배경 ✅ (`remotion/Background.tsx`)
- 딥 베이스 그라데이션 + **보케 광원 3개**(블러 90px, 천천히 드리프트) + **도트 그리드**(마스크) + **필름 그레인**(SVG feTurbulence, 프레임마다 이동) + **강한 비네팅**.
- "어둡게 블러된 실사 배경"의 무드를 사진 없이 코드로 흉내. 키 불필요 → 배포 앱에서 그대로.

### 5-2. 노드 네트워크 배경 🔜
- 만드는 법: N개 노드(육각형/원)를 랜덤·결정적 좌표에 배치, 가까운 노드끼리 선 연결, 각 노드에 옅은 글로우. 프레임에 따라 노드가 미세하게 떠다니고 선 투명도 펄스.
- 구현 스케치: SVG `<line>` + `<circle>`, 좌표는 `random(seed)`로 고정. 선 opacity = `0.1 + 0.1*sin(frame...)`.

### 5-3. 실사 배경 이미지 🔜 (소스 필요)
- 옵션: Pexels 무료 API(키 1개) / 우리 이미지게이트웨이(Gemini·Flow AI생성) / 직접 업로드.
- 렌더: `<Img>` 또는 `<OffthreadVideo>`를 cover로 깔고, 위에 `rgba(0,0,0,.55)` 스크림 + 비네팅 + 블러(`filter: blur(6px)`)로 눌러 무드화. 텍스트 가독성 확보.
- JSON: `scene.image`(URL/dataURL) 이미 지원 — Scene이 이미지 있으면 cover 배경으로 렌더. ✅(소스만 연결하면 됨)

---

## 6. 그래픽 오브젝트 카탈로그
공통 데이터 모델(JSON):
```json
"graphic": { "type": "<타입>", "items": [ {"label":"", "value":0, "sub":""} ] }
```
구현: `remotion/Graphics.tsx`의 `SceneGraphic`가 type으로 분기. Scene이 graphic 있으면 헤드라인을 위로 올리고 가운데를 그래픽으로 채움.

| # | 타입(`type`) | 설명 | 데이터 | 만드는 법(요지) | 상태 |
|---|---|---|---|---|---|
| 3 | `bars` | 막대그래프, 값+체크+라벨 | label,value | flex 끝정렬, height=value/max, 스프링 성장, 상단 값·하단 ✓ | ✅ |
| 4 | `flow` | 박스→화살표 순서 | label,sub | 카드 세로/가로 스택, 사이에 ↓/→, 순차 스프링 | ✅ |
| 5 | `checklist` | 체크박스 리스트 | label | 체크박스(✓)+텍스트, 좌→우 슬라이드 등장 | ✅ |
| 6 | `stat` | 큰 숫자 카운트업 | label,value,sub | value를 0→목표로 interpolate, 라벨 하단 | ✅ |
| 6b | `fraction` | 분수(2/7) | value(분자),sub(분모) | 큰 분자 + "/ N 개", 카운트업 | 🔜 |
| 7 | `compare` | before/after 2박스 | label,sub | 좌(점선·흐림)·우(실선·accent) | ✅ |
| 8 | `cards` | 파일/문서 카드 | label,sub | 아이콘(📄)+제목+부제 카드 행, 순차 등장 | 🔜 |
| 9 | `quote` | 인용/콜아웃 | label(인용),sub | 라운드 박스 안 큰 "…", 따옴표 강조 | 🔜 |
| 10 | `mismatch` | 불일치 관계도 | 2개씩 label쌍 | 박스 ─ ✗ ─ 박스(빨강 X), 점선 연결 | 🔜 |
| 11 | `badge` | 단일 라벨 배지 | label | accent 외곽 알약 1개, 팝 등장 | 🔜 |
| 12 | (points) | 알약 라벨 그리드 | — | scene.points 알약칩 | ✅ |
| 13 | `prop:clipboard` | 클립보드 체크리스트 | label | checklist를 클립보드 액자(클립+테두리)로 감쌈 | 🔜 |
| 13b | `prop:device` | 기기 목업(폰/탭/맥) | label | 라운드 외곽선 프레임 + 라벨 | 🔜 |
| 13c | `prop:terminal` | `$ 명령어` → 아이콘 | label,sub | 모노 박스 + 화살표 + 결과 아이콘 | 🔜 |

> 추가 타입 제작 패턴은 모두 동일: `Graphics.tsx`에 함수 컴포넌트 추가 → `useCurrentFrame()`+`spring()`으로 등장 → `SceneGraphic` 디스패처에 `type` 분기 한 줄.

---

## 7. 자막(카라오케) ✅
- 하단 검정바, 어절 단위 색칠. 단어 타이밍은 TTS(edge-tts/msedge-tts) 워드 바운더리.
- 마크업 `*…*`는 화면 헤드라인/제목용 — narration엔 넣지 않는다(자막은 카라오케로 강조).

---

## 8. 파일 매핑 (어디를 고치나)
- `remotion/Video.tsx` — 레터박스, 제목바, 진행바, 하단 자막바, 자막 타이밍.
- `remotion/Scene.tsx` — 씬 스택(키커/헤드라인/이모지/그래픽), 배경 이미지.
- `remotion/Background.tsx` — 프로시저럴 시네마틱 배경(+노드 네트워크는 여기 추가).
- `remotion/TextBlock.tsx` — 헤드라인 단어 펀치 등장, 이모지, points 알약.
- `remotion/Graphics.tsx` — 인포그래픽/프롭 라이브러리(여기에 신규 타입 추가).
- `src/lib/videoSpecSchema.ts` / `src/lib/renderPlan.ts` / `remotion/planTypes.ts` — `graphic` 필드 스키마/전달.
- `skill/SKILL.md` — claude.ai가 위 요소(키커·`*강조*`·graphic·다크무드)를 뽑도록 가르치는 규칙.

---

## 9. JSON 스펙 예시 (그래픽 씬)
```json
{
  "id": 1, "start": 0, "end": 4,
  "visual_direction": "THE RESULT",
  "screen_text": "단계마다 *껑충*",
  "narration": "도구를 갖출수록 생산성이 단계마다 크게 뜁니다.",
  "graphic": { "type": "bars", "items": [
    {"label":"기본","value":20}, {"label":"에이전트","value":62}, {"label":"루프","value":88}
  ] },
  "transition": "cut"
}
```

---

## 10. 남은 작업(요약)
- 🔜 그래픽 타입 추가: `cards`, `quote`, `mismatch`, `badge`, `fraction`, 프롭(clipboard/device/terminal).
- 🔜 배경 타입 추가: 노드 네트워크.
- 🔜 실사 배경 소스 결정(Pexels 키 / 이미지게이트웨이 / 업로드).
- 🔜 위 전부를 `skill/SKILL.md`에 반영 → claude.ai가 처음부터 이 결로 스펙 생성.

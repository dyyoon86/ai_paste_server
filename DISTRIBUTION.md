# PasteMotion 배포 가이드 (원클릭 설치 앱)

무료 Claude 사용자가 **링크 2개**만으로 영상을 만들 수 있게 하는 구조.

## 사용자 흐름

1. **링크 ① — 스킬 파일**: `skill/SKILL.md` 를 claude.ai 대화창에 업로드.
   → Claude가 영상 설계(VIDEO_SPEC JSON)를 만들어 줌.
2. **링크 ② — 설치 파일**: 아래 설치파일을 더블클릭으로 설치 → 실행.
   → 앱 화면에 JSON을 붙여넣고 "렌더" → 내 PC에서 MP4 생성.

설치파일 안에 Node / FFmpeg / 헤드리스 Chrome 이 **전부 포함**되어 있어
사용자는 아무것도 따로 깔 필요가 없음. (첫 렌더 시 Remotion이 헤드리스
Chromium 을 자동 1회 다운로드)

## 설치파일 종류

- Windows: `PasteMotion-Setup-<버전>.exe` (원클릭 NSIS 설치)
- macOS: `PasteMotion-<버전>.dmg`
- Linux: `PasteMotion-<버전>.AppImage` (실행권한 주고 더블클릭)

## 빌드 방법

### (권장) 시스템과 격리된 전용 Node 로 빌드
PC에 깔린 다른 Node/도구와 전혀 무관하게, 프로젝트 전용 Node 로만 작업:
```bash
# 최초 1회: 전용 Node 받기 (.toolchain/node 에 설치, 시스템 안 건드림)
mkdir -p .toolchain && curl -fsSL \
  https://nodejs.org/dist/v22.22.3/node-v22.22.3-linux-x64.tar.xz \
  | tar -xJ -C .toolchain && mv .toolchain/node-v22.22.3-linux-x64 .toolchain/node

# 매 작업 시작 시 (venv 의 activate 와 동일)
source .toolchain/activate     # 이 셸의 PATH 앞에 전용 node 를 붙임

npm install
npm run dist:linux             # 또는 dist:win / dist:mac (해당 OS에서만)
```
> 전용 node 바이너리는 `.gitignore` 처리됨(레포엔 `activate` 스크립트만 포함).
> CI 는 `actions/setup-node` 가 같은 격리를 제공하므로 별도 설치 불필요.

### 또는 시스템 Node 로 그냥 빌드
```bash
npm install
npm run dist:linux
# 산출물: dist-app/
```

3개 OS 전부 자동 빌드 (권장):
1. 이 레포를 GitHub에 푸시.
2. 버전 태그를 푸시하면 GitHub Actions(`.github/workflows/build.yml`)가
   win/mac/linux 설치파일을 만들어 **Release** 에 자동 첨부.
   ```bash
   git tag v0.1.0 && git push origin v0.1.0
   ```
3. Actions 탭에서 `workflow_dispatch` 로 수동 실행도 가능(아티팩트로 다운로드).

> Windows `.exe` 와 macOS `.dmg` 는 각각 Windows/macOS 러너에서만 만들 수 있어
> 로컬 리눅스에서는 AppImage 만 생성됨. 그래서 3종 동시 배포는 CI 필수.

## 동작 구조 (요약)

- Electron(`electron/main.cjs`)이 앱 시작 시 내장 Node로 Next.js 프로덕션
  서버를 `127.0.0.1`에 띄우고, 그 페이지를 앱 창으로 로드.
- 렌더는 `src/lib/renderer.ts` 가 같은 node_modules 를 cwd 로 Remotion CLI 를
  spawn → `output.mp4` 생성.
- 작업물은 설치 폴더(읽기전용)가 아니라 사용자 데이터 폴더에 저장
  (`PASTEMOTION_DATA`, OS별 userData). 앱 루트는 `PASTEMOTION_ROOT`.
- asar 비활성화: Remotion 이 자식 프로세스로 실제 파일을 읽어야 하므로
  node_modules 를 압축하지 않고 그대로 패키징.

## 라이선스 주의 (꼭 확인)

Remotion 은 일정 규모 이상(법인/팀)에서는 **상용 라이선스**가 필요합니다.
무료 도구로 공개 배포하기 전에 Remotion 라이선스 조건을 반드시 확인하세요.
https://www.remotion.dev/docs/license

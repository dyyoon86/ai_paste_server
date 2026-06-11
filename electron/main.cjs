// PasteMotion 데스크톱 래퍼
// 내장 Next.js 프로덕션 서버를 띄우고 그 페이지를 앱 창으로 연다.
// 사용자는 Node/FFmpeg/Chrome 별도 설치 없이 더블클릭 한 번으로 사용.
//   - Next 서버: Electron 내장 Node 로 next start 실행
//   - Remotion 렌더: 같은 node_modules 를 cwd 로 spawn (renderer.ts)
//   - 작업물(data/jobs): 설치 폴더가 읽기전용이라 userData 로 분리
const { app, BrowserWindow, shell, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const { spawn } = require("node:child_process");

const PORT = process.env.PASTEMOTION_PORT || "37650";
const isDev = !app.isPackaged;
let serverProc = null;
let win = null;

// 앱 리소스 루트 (node_modules + .next + remotion/ 가 있는 곳)
function appRoot() {
  return isDev ? path.join(__dirname, "..") : path.join(process.resourcesPath, "app");
}

function dataDir() {
  // 쓰기 가능한 사용자 데이터 폴더
  const d = path.join(app.getPath("userData"), "data");
  fs.mkdirSync(path.join(d, "jobs"), { recursive: true });
  return d;
}

function startNextServer() {
  const root = appRoot();
  const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
  const env = {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(PORT),
    HOSTNAME: "127.0.0.1",
    PASTEMOTION_ROOT: root,      // 렌더 child 가 node_modules/remotion 을 찾는 기준
    PASTEMOTION_DATA: dataDir(), // 작업물 쓰기 위치 (userData)
    ELECTRON_RUN_AS_NODE: "1",   // Electron 실행파일을 순수 node 로
  };
  serverProc = spawn(process.execPath, [nextBin, "start", "-p", String(PORT), "-H", "127.0.0.1"], {
    cwd: root,
    env,
    stdio: "inherit",
  });
  serverProc.on("exit", (code) => console.log("[next-server] exited", code));
}

function waitForServer(timeoutMs = 40000) {
  const url = `http://127.0.0.1:${PORT}/`;
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => { res.destroy(); resolve(); });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) reject(new Error("내장 서버 시작 시간 초과"));
        else setTimeout(tick, 400);
      });
    };
    tick();
  });
}

async function createWindow(url) {
  win = new BrowserWindow({
    width: 1280,
    height: 880,
    title: "PasteMotion",
    backgroundColor: "#0a0a0a",
    webPreferences: { contextIsolation: true },
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  await win.loadURL(url);
}

app.whenReady().then(async () => {
  try {
    if (isDev) {
      // 개발 중엔 이미 떠있는 next dev / next start 를 연다
      await waitForServer().catch(() => {});
      await createWindow(`http://127.0.0.1:${PORT}/`);
    } else {
      startNextServer();
      await waitForServer();
      await createWindow(`http://127.0.0.1:${PORT}/`);
    }
  } catch (e) {
    dialog.showErrorBox("PasteMotion 시작 실패", String(e && e.stack ? e.stack : e));
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow(`http://127.0.0.1:${PORT}/`);
});
app.on("window-all-closed", () => {
  if (serverProc) try { serverProc.kill(); } catch {}
  if (process.platform !== "darwin") app.quit();
});
app.on("before-quit", () => {
  if (serverProc) try { serverProc.kill(); } catch {}
});

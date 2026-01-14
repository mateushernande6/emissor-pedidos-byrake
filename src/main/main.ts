import { config as loadEnv } from "dotenv";
import { app, BrowserWindow } from "electron";
import * as http from "http";
import * as path from "path";
import { IPCHandlers } from "./ipc-handlers";

// Carrega variáveis de ambiente do arquivo .env
loadEnv();

let mainWindow: BrowserWindow | null = null;
let ipcHandlers: IPCHandlers | null = null;

async function waitForHttpOk(url: string, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await new Promise<boolean>((resolve) => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve(
          res.statusCode !== undefined &&
            res.statusCode >= 200 &&
            res.statusCode < 500
        );
      });
      req.on("error", () => resolve(false));
      req.setTimeout(1500, () => {
        req.destroy();
        resolve(false);
      });
    });

    if (ok) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

function attachDiagnostics(window: BrowserWindow): void {
  window.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedURL) => {
      console.error("[main] did-fail-load", {
        errorCode,
        errorDescription,
        validatedURL,
      });
    }
  );

  window.webContents.on(
    "console-message",
    (_event, level, message, line, sourceId) => {
      console.log("[renderer]", { level, message, line, sourceId });
    }
  );

  window.webContents.on("render-process-gone", (_event, details) => {
    console.error("[main] render-process-gone", details);
  });

  window.webContents.on("unresponsive", () => {
    console.error("[main] window unresponsive");
  });
}

async function createWindow(): Promise<void> {
  // Caminho do ícone
  const iconPath = path.join(__dirname, "../../assets/icon.png");

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    title: "Emissor ByRake",
    autoHideMenuBar: true,
    icon: iconPath,
  });

  attachDiagnostics(mainWindow);

  if (!app.isPackaged) {
    const devUrl = "http://localhost:3000";
    const ready = await waitForHttpOk(devUrl, 30000);
    if (!ready) {
      console.error(
        "[main] Dev server não respondeu a tempo. Tentando carregar mesmo assim.",
        { devUrl }
      );
    }
    await mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    await mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Inicializa IPC handlers
  ipcHandlers = new IPCHandlers();

  const logger = ipcHandlers.getLogService();
  logger.info("Aplicativo iniciado");

  createWindow().catch((error) => {
    console.error("[main] Falha ao criar janela", error);
    logger.error(`Falha ao criar janela: ${error?.message || String(error)}`);
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (ipcHandlers) {
    const logger = ipcHandlers.getLogService();
    logger.info("Aplicativo encerrando");
  }
});

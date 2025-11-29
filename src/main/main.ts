import { config as loadEnv } from "dotenv";
import { app, BrowserWindow } from "electron";
import * as path from "path";
import { IPCHandlers } from "./ipc-handlers";

// Carrega variáveis de ambiente do arquivo .env
loadEnv();

let mainWindow: BrowserWindow | null = null;
let ipcHandlers: IPCHandlers | null = null;

function createWindow(): void {
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

  // Em desenvolvimento, carrega do webpack dev server
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:3000");
    // mainWindow.webContents.openDevTools(); // Desabilitado - abrir manualmente se necessário
  } else {
    // Em produção, carrega o arquivo HTML compilado
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
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

  createWindow();

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

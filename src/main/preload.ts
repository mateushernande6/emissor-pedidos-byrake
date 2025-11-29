import { contextBridge, ipcRenderer } from "electron";
import {
  AppConfig,
  LogEntry,
  PrinterInfo,
  ConnectionStatus,
  PrintJob,
} from "../core/types";

// Expõe APIs seguras para o renderer
contextBridge.exposeInMainWorld("electronAPI", {
  // Configuração
  config: {
    get: (): Promise<Partial<AppConfig>> => ipcRenderer.invoke("config:get"),
    set: (config: Partial<AppConfig>): Promise<{ success: boolean }> =>
      ipcRenderer.invoke("config:set", config),
    isConfigured: (): Promise<boolean> =>
      ipcRenderer.invoke("config:isConfigured"),
  },

  // Impressoras
  printer: {
    list: (): Promise<PrinterInfo[]> => ipcRenderer.invoke("printer:list"),
    test: (printerName: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke("printer:test", printerName),
    setDefault: (printerName: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke("printer:setDefault", printerName),
  },

  // Conexão
  connection: {
    connect: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke("connection:connect"),
    disconnect: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke("connection:disconnect"),
    getStatus: (): Promise<ConnectionStatus> =>
      ipcRenderer.invoke("connection:getStatus"),
  },

  // Jobs
  jobs: {
    getRecent: (
      limit?: number,
      startDate?: string,
      endDate?: string
    ): Promise<{ success: boolean; jobs: PrintJob[] }> =>
      ipcRenderer.invoke("jobs:getRecent", limit, startDate, endDate),
    updateStatus: (
      jobId: string,
      orderStatus: string
    ): Promise<{ success: boolean }> =>
      ipcRenderer.invoke("jobs:updateStatus", jobId, orderStatus),
    reprint: (jobId: string, payload: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke("jobs:reprint", jobId, payload),
  },

  // Estação
  station: {
    updateCategories: (categories: string[]): Promise<{ success: boolean }> =>
      ipcRenderer.invoke("station:updateCategories", categories),
    updateName: (name: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke("station:updateName", name),
  },

  // Listeners
  onLog: (callback: (log: LogEntry) => void): (() => void) => {
    const listener = (_event: any, log: LogEntry) => callback(log);
    ipcRenderer.on("log:new", listener);
    return () => ipcRenderer.removeListener("log:new", listener);
  },

  onStatusChange: (
    callback: (status: ConnectionStatus) => void
  ): (() => void) => {
    const listener = (_event: any, status: ConnectionStatus) =>
      callback(status);
    ipcRenderer.on("status:changed", listener);
    return () => ipcRenderer.removeListener("status:changed", listener);
  },
});

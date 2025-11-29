import {
  AppConfig,
  LogEntry,
  PrinterInfo,
  ConnectionStatus,
  PrintJob,
} from "../core/types";

export interface ElectronAPI {
  config: {
    get: () => Promise<Partial<AppConfig>>;
    set: (config: Partial<AppConfig>) => Promise<{ success: boolean }>;
    isConfigured: () => Promise<boolean>;
  };
  printer: {
    list: () => Promise<PrinterInfo[]>;
    test: (printerName: string) => Promise<{ success: boolean }>;
    setDefault: (printerName: string) => Promise<{ success: boolean }>;
  };
  connection: {
    connect: () => Promise<{ success: boolean }>;
    disconnect: () => Promise<{ success: boolean }>;
    getStatus: () => Promise<ConnectionStatus>;
  };
  jobs: {
    getRecent: (
      limit?: number,
      startDate?: string,
      endDate?: string
    ) => Promise<{ success: boolean; jobs: PrintJob[] }>;
    updateStatus: (
      jobId: string,
      orderStatus: string
    ) => Promise<{ success: boolean }>;
    reprint: (jobId: string, payload: string) => Promise<{ success: boolean }>;
  };
  station: {
    updateCategories: (categories: string[]) => Promise<{ success: boolean }>;
    updateName: (name: string) => Promise<{ success: boolean }>;
  };
  onLog: (callback: (log: LogEntry) => void) => () => void;
  onStatusChange: (callback: (status: ConnectionStatus) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

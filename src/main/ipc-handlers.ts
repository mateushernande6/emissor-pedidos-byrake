import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from "electron";
import { ConfigStore } from "../core/configStore";
import { PrinterService } from "../core/printerService";
import { SupabaseService } from "../core/supabaseClient";
import { LogService } from "../core/logService";
import { PrintClient } from "../core/printClient";
import { AppConfig, LogEntry, ConnectionStatus } from "../core/types";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../core/runtimeEnv";

function getSupabaseCredentials(): { url: string; key: string } {
  const url = (process.env.SUPABASE_URL || SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY || "").trim();
  return { url, key };
}

export class IPCHandlers {
  private configStore: ConfigStore;
  private printerService: PrinterService;
  private supabaseService: SupabaseService;
  private logService: LogService;
  private printClients: Map<string, PrintClient>;
  private supabaseInitialized: boolean = false;

  constructor() {
    this.configStore = new ConfigStore();
    this.printerService = new PrinterService();
    this.supabaseService = new SupabaseService();
    this.logService = new LogService();
    this.printClients = new Map();

    this.setupHandlers();
    this.setupLogForwarding();
    this.setupStatusForwarding();
  }

  private setupHandlers(): void {
    // Configuração
    ipcMain.handle("config:get", () => {
      return this.configStore.get();
    });

    ipcMain.handle(
      "config:set",
      (_event: IpcMainInvokeEvent, config: Partial<AppConfig>) => {
        // Apenas salva token da estação e impressora selecionada
        // URL e chave do Supabase vêm do .env
        const normalized: Partial<AppConfig> = { ...config };
        if (typeof normalized.stationToken === "string") {
          normalized.stationToken = normalized.stationToken
            .trim()
            .toUpperCase();
        }
        this.configStore.set(normalized);
        return { success: true };
      },
    );

    ipcMain.handle("config:isConfigured", () => {
      return this.configStore.isConfigured();
    });

    // Impressoras
    ipcMain.handle("printer:list", async () => {
      try {
        return await this.printerService.listPrinters();
      } catch (error: any) {
        throw new Error(error.message);
      }
    });

    ipcMain.handle(
      "printer:test",
      async (_event: IpcMainInvokeEvent, printerName: string) => {
        try {
          // Teste de impressão é LOCAL - não depende do Supabase
          const config = this.configStore.get();
          let stationName = "Estação Local (Teste)";
          if (config.stationToken) {
            const localStation = config.stations?.find(
              (s) => s.token === config.stationToken,
            );
            if (localStation?.name) {
              stationName = localStation.name;
            } else {
              const printClient = this.printClients.get(config.stationToken);
              const station = printClient?.getStation();
              stationName = station?.name || stationName;
            }
          }
          await this.printerService.testPrint(printerName, stationName);
          this.logService.success(
            `Teste de impressão enviado para: ${printerName}`,
          );
          return { success: true };
        } catch (error: any) {
          this.logService.error(`Erro no teste de impressão: ${error.message}`);
          throw new Error(error.message);
        }
      },
    );

    ipcMain.handle(
      "printer:setDefault",
      async (_event: IpcMainInvokeEvent, printerName: string) => {
        try {
          // Salva na config local
          this.configStore.set({ selectedPrinter: printerName });

          // Se estiver conectado, atualiza no Supabase
          const config = this.configStore.get();
          if (config.stationToken) {
            const printClient = this.printClients.get(config.stationToken);
            if (printClient && printClient.getStation()) {
              await printClient.updateDefaultPrinter(printerName);
            }
          }

          return { success: true };
        } catch (error: any) {
          throw new Error(error.message);
        }
      },
    );

    // Conexão
    ipcMain.handle("connection:connect", async () => {
      try {
        const config = this.configStore.get();

        // Lê credenciais do Supabase das variáveis de ambiente
        const { url: supabaseUrl, key: supabaseKey } = getSupabaseCredentials();

        if (!supabaseUrl || !supabaseKey) {
          throw new Error(
            "Configuração do Supabase não encontrada. Verifique o arquivo .env",
          );
        }

        const stationToken = (config.stationToken || "").trim().toUpperCase();
        if (!stationToken) {
          throw new Error(
            "Token da estação não configurado. Preencha o campo de token.",
          );
        }

        if (stationToken !== config.stationToken) {
          this.configStore.set({ stationToken });
        }

        // Verifica se já existe um cliente para este token
        if (!this.printClients.has(stationToken)) {
          // Cria nova instância para esta estação
          const supabaseService = new SupabaseService();
          const printClient = new PrintClient(
            supabaseService,
            this.printerService,
            this.logService,
          );

          const localStation = config.stations?.find(
            (s) => s.token === config.stationToken,
          );
          printClient.setStationDisplayName(localStation?.name || null);

          // Configura status forwarding para este cliente
          printClient.onStatusChange((status: ConnectionStatus) => {
            const windows = BrowserWindow.getAllWindows();
            windows.forEach((window) => {
              window.webContents.send("status:changed", status);
            });
          });

          await printClient.connect(supabaseUrl, supabaseKey, stationToken);

          this.printClients.set(config.stationToken, printClient);
        } else {
          const existingClient = this.printClients.get(config.stationToken);
          const localStation = config.stations?.find(
            (s) => s.token === config.stationToken,
          );
          existingClient?.setStationDisplayName(localStation?.name || null);
        }

        return { success: true };
      } catch (error: any) {
        throw new Error(error.message);
      }
    });

    ipcMain.handle("connection:disconnect", () => {
      const config = this.configStore.get();
      const stationToken = (config.stationToken || "").trim().toUpperCase();
      if (stationToken) {
        const client = this.printClients.get(stationToken);
        if (client) {
          client.disconnect();
          this.printClients.delete(stationToken);
        }
      }
      return { success: true };
    });

    ipcMain.handle("connection:getStatus", () => {
      const config = this.configStore.get();
      const stationToken = (config.stationToken || "").trim().toUpperCase();
      if (stationToken) {
        const client = this.printClients.get(stationToken);
        if (client) {
          const station = client.getStation();
          return {
            connected: !!station,
            station: station || undefined,
          };
        }
      }
      return {
        connected: false,
        station: undefined,
      };
    });

    // Jobs handlers
    ipcMain.handle(
      "jobs:getRecent",
      async (
        _event,
        limit: number = 50,
        startDate?: string,
        endDate?: string,
      ) => {
        try {
          // Busca jobs APENAS das estações CONECTADAS nesta sessão
          // (via PrintClient, que usa RPC por token e evita RLS em print_jobs)

          if (this.printClients.size === 0) {
            return { success: true, jobs: [] };
          }

          const allJobs = [];
          for (const client of this.printClients.values()) {
            const station = client.getStation();
            if (!station) continue;
            const jobs = await client.getRecentJobs(limit, startDate, endDate);
            allJobs.push(...jobs);
          }

          // Ordena por data decrescente e limita
          const sortedJobs = allJobs
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            )
            .slice(0, limit);

          return { success: true, jobs: sortedJobs };
        } catch (error: any) {
          throw new Error(error.message);
        }
      },
    );

    ipcMain.handle(
      "jobs:updateStatus",
      async (_event, jobId: string, orderStatus: string) => {
        try {
          // Atualiza usando supabaseService
          await this.supabaseService.updateOrderStatus(
            jobId,
            orderStatus as any,
          );
          return { success: true };
        } catch (error: any) {
          throw new Error(error.message);
        }
      },
    );

    ipcMain.handle(
      "jobs:reprint",
      async (_event, jobId: string, payload: string) => {
        try {
          console.log("[IPC] jobs:reprint chamado", { jobId });
          const config = this.configStore.get();

          const stationToken = (config.stationToken || "").trim().toUpperCase();

          // Busca impressora configurada
          let printerName = config.selectedPrinter;

          console.log("[IPC] Config:", {
            stationToken: config.stationToken ? "exists" : "missing",
            selectedPrinter: printerName,
          });

          const availablePrinters = await this.printerService.listPrinters();
          const normalizePrinterName = (name: string) =>
            (name || "")
              .trim()
              .toLowerCase()
              .normalize("NFKD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/\s+/g, " ");

          const basePrinterName = (name: string) =>
            normalizePrinterName(name)
              .replace(/\((copiar|copy)\s*\d+\)$/i, "")
              .replace(/\((copiar|copy)\s*\d+\)/i, "")
              .replace(/\s+-\s+(copiar|copy)\s*\d+$/i, "")
              .replace(/\s+(copiar|copy)\s*\d+$/i, "")
              .trim();

          const resolvePrinterName = (requestedName: string) => {
            const target = normalizePrinterName(requestedName);
            const targetBase = basePrinterName(requestedName);

            const candidates = availablePrinters.map((p) => {
              const n = normalizePrinterName(p.name);
              const b = basePrinterName(p.name);

              let score = 0;
              if (n === target) score += 100;
              if (b === targetBase) score += 90;
              if (n.startsWith(target) || target.startsWith(n)) score += 70;
              if (b.startsWith(targetBase) || targetBase.startsWith(b))
                score += 65;
              if (n.includes(target) || target.includes(n)) score += 55;
              if (b.includes(targetBase) || targetBase.includes(b)) score += 50;

              // Penaliza impressoras "virtuais" quando há uma física parecida
              if (/(pdf|onenote|xps)/i.test(p.name)) score -= 10;

              return { name: p.name, score };
            });

            candidates.sort((a, b) => b.score - a.score);
            const best = candidates[0];
            if (!best || best.score < 50) {
              return null;
            }
            return best.name;
          };

          const triedCandidates: string[] = [];
          const tryResolve = (candidate?: string, source?: string) => {
            const c = (candidate || "").trim();
            if (!c) return null;
            triedCandidates.push(source ? `${source}: ${c}` : c);
            const resolved = resolvePrinterName(c);
            if (resolved) {
              console.log("[IPC] Impressora resolvida:", {
                source,
                requested: c,
                resolved,
              });
              return resolved;
            }
            return null;
          };

          // 1) Impressora salva na config local
          printerName =
            tryResolve(printerName, "config.selectedPrinter") || undefined;

          // 2) Impressora da estação do token atual
          if (!printerName && stationToken) {
            const printClient = this.printClients.get(stationToken);
            const station = printClient?.getStation();
            printerName =
              tryResolve(
                station?.default_printer_name,
                "station(token).default_printer_name",
              ) || undefined;
          }

          // 3) Impressora de QUALQUER estação conectada nesta sessão
          if (!printerName) {
            for (const [token, client] of this.printClients.entries()) {
              const station = client.getStation();
              const resolved = tryResolve(
                station?.default_printer_name,
                `station(connected:${token}).default_printer_name`,
              );
              if (resolved) {
                printerName = resolved;
                break;
              }
            }
          }

          // 4) Impressoras salvas na lista de estações do config (quando existir)
          if (!printerName && Array.isArray((config as any).stations)) {
            for (const s of (config as any).stations) {
              const resolved = tryResolve(
                s?.printer,
                "config.stations[].printer",
              );
              if (resolved) {
                printerName = resolved;
                break;
              }
            }
          }

          // 5) Fallback seguro: apenas se existir exatamente 1 impressora física
          if (!printerName) {
            const physical = availablePrinters
              .map((p) => p.name)
              .filter((n) => !/(pdf|onenote|xps)/i.test(n));
            if (physical.length === 1) {
              printerName = physical[0];
              console.warn(
                "[IPC] Fallback: única impressora física detectada:",
                printerName,
              );
            }
          }

          if (!printerName) {
            console.error("[IPC] ❌ Nenhuma impressora disponível!");
            throw new Error(
              `Impressora não encontrada. Configure uma impressora válida. Tentativas: ${triedCandidates.join(
                " | ",
              )}. Disponíveis: ${availablePrinters
                .map((p) => p.name)
                .join(", ")}`,
            );
          }

          console.log(`[IPC] Reimprimindo para impressora: ${printerName}`);

          // Se existir nome amigável local da estação atual, sobrescreve a linha ESTAÇÃO no ticket
          const localStation = config.stationToken
            ? config.stations?.find((s) => s.token === config.stationToken)
            : undefined;
          if (localStation?.name) {
            payload = payload.replace(
              /^ESTAÇÃO\s*:\s*.*$/gim,
              `ESTAÇÃO: ${localStation.name}`,
            );
            payload = payload.replace(
              /^ESTAÇAO\s*:\s*.*$/gim,
              `ESTACAO: ${localStation.name}`,
            );
          }

          // Usa printerService diretamente (não depende de printClient)
          await this.printerService.print(printerName, payload);

          this.logService.success(
            `Job ${jobId.substring(0, 8)} reimpresso com sucesso`,
          );
          console.log("[IPC] ✓ Reimpressão concluída");

          return { success: true };
        } catch (error: any) {
          console.error("[IPC] ❌ Erro ao reimprimir:", error);
          this.logService.error(`Erro ao reimprimir: ${error.message}`);
          throw new Error(error.message);
        }
      },
    );

    ipcMain.handle(
      "station:updateCategories",
      async (_event, categories: string[]) => {
        try {
          const config = this.configStore.get();
          if (config.stationToken) {
            const printClient = this.printClients.get(config.stationToken);
            if (printClient) {
              await printClient.updateStationCategories(categories);
              return { success: true };
            }
          }
          throw new Error("Estação não conectada");
        } catch (error: any) {
          throw new Error(error.message);
        }
      },
    );

    ipcMain.handle("station:updateName", async (_event, name: string) => {
      try {
        const config = this.configStore.get();
        if (config.stationToken) {
          const printClient = this.printClients.get(config.stationToken);
          if (printClient) {
            await printClient.updateStationName(name);
            return { success: true };
          }
        }
        throw new Error("Estação não conectada");
      } catch (error: any) {
        throw new Error(error.message);
      }
    });
  }

  private setupLogForwarding(): void {
    // Encaminha logs para o renderer
    this.logService.onLog((log: LogEntry) => {
      // Broadcast para todas as janelas
      const windows = BrowserWindow.getAllWindows();
      windows.forEach((window) => {
        window.webContents.send("log:new", log);
      });
    });
  }

  private setupStatusForwarding(): void {
    // Status forwarding será configurado em cada PrintClient ao conectar
    // Ver setupHandlers -> connection:connect
  }

  getLogService(): LogService {
    return this.logService;
  }
}

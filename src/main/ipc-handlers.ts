import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from "electron";
import { ConfigStore } from "../core/configStore";
import { PrinterService } from "../core/printerService";
import { SupabaseService } from "../core/supabaseClient";
import { LogService } from "../core/logService";
import { PrintClient } from "../core/printClient";
import { AppConfig, LogEntry, ConnectionStatus } from "../core/types";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../core/runtimeEnv";

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
        this.configStore.set(config);
        return { success: true };
      }
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
            const printClient = this.printClients.get(config.stationToken);
            const station = printClient?.getStation();
            stationName = station?.name || stationName;
          }
          await this.printerService.testPrint(printerName, stationName);
          this.logService.success(
            `Teste de impressão enviado para: ${printerName}`
          );
          return { success: true };
        } catch (error: any) {
          this.logService.error(`Erro no teste de impressão: ${error.message}`);
          throw new Error(error.message);
        }
      }
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
      }
    );

    // Conexão
    ipcMain.handle("connection:connect", async () => {
      try {
        const config = this.configStore.get();

        // Lê credenciais do Supabase das variáveis de ambiente
        // const supabaseUrl = process.env.SUPABASE_URL;
        // const supabaseKey = process.env.SUPABASE_ANON_KEY;
        const supabaseUrl = SUPABASE_URL;
        const supabaseKey = SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          throw new Error(
            "Configuração do Supabase não encontrada. Verifique o arquivo .env"
          );
        }

        if (!config.stationToken) {
          throw new Error(
            "Token da estação não configurado. Preencha o campo de token."
          );
        }

        // Verifica se já existe um cliente para este token
        if (!this.printClients.has(config.stationToken)) {
          // Cria nova instância para esta estação
          const supabaseService = new SupabaseService();
          const printClient = new PrintClient(
            supabaseService,
            this.printerService,
            this.logService
          );

          // Configura status forwarding para este cliente
          printClient.onStatusChange((status: ConnectionStatus) => {
            const windows = BrowserWindow.getAllWindows();
            windows.forEach((window) => {
              window.webContents.send("status:changed", status);
            });
          });

          await printClient.connect(
            supabaseUrl,
            supabaseKey,
            config.stationToken
          );

          this.printClients.set(config.stationToken, printClient);
        }

        return { success: true };
      } catch (error: any) {
        throw new Error(error.message);
      }
    });

    ipcMain.handle("connection:disconnect", () => {
      const config = this.configStore.get();
      if (config.stationToken) {
        const client = this.printClients.get(config.stationToken);
        if (client) {
          client.disconnect();
          this.printClients.delete(config.stationToken);
        }
      }
      return { success: true };
    });

    ipcMain.handle("connection:getStatus", () => {
      const config = this.configStore.get();
      if (config.stationToken) {
        const client = this.printClients.get(config.stationToken);
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
        endDate?: string
      ) => {
        try {
          // Busca jobs APENAS das estações CONECTADAS nesta sessão

          // Se não há estações conectadas, retorna vazio
          if (this.printClients.size === 0) {
            return { success: true, jobs: [] };
          }

          // Inicializa supabase se necessário
          if (!this.supabaseInitialized) {
            const supabaseUrl = SUPABASE_URL;
            const supabaseKey = SUPABASE_ANON_KEY;
            if (supabaseUrl && supabaseKey) {
              this.supabaseService.initialize(supabaseUrl, supabaseKey);
              this.supabaseInitialized = true;
            }
          }

          // Coleta IDs de todas as estações conectadas
          const connectedStationIds: string[] = [];
          this.printClients.forEach((client) => {
            const station = client.getStation();
            if (station) {
              connectedStationIds.push(station.id);
            }
          });

          // Se nenhuma estação realmente conectada, retorna vazio
          if (connectedStationIds.length === 0) {
            return { success: true, jobs: [] };
          }

          // Busca jobs de cada estação conectada e combina
          const allJobs = [];
          for (const stationId of connectedStationIds) {
            const jobs = await this.supabaseService.getRecentJobs(
              stationId,
              limit,
              startDate,
              endDate
            );
            allJobs.push(...jobs);
          }

          // Ordena por data decrescente e limita
          const sortedJobs = allJobs
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )
            .slice(0, limit);

          return { success: true, jobs: sortedJobs };
        } catch (error: any) {
          throw new Error(error.message);
        }
      }
    );

    ipcMain.handle(
      "jobs:updateStatus",
      async (_event, jobId: string, orderStatus: string) => {
        try {
          // Atualiza usando supabaseService
          await this.supabaseService.updateOrderStatus(
            jobId,
            orderStatus as any
          );
          return { success: true };
        } catch (error: any) {
          throw new Error(error.message);
        }
      }
    );

    ipcMain.handle(
      "jobs:reprint",
      async (_event, jobId: string, payload: string) => {
        try {
          console.log("[IPC] jobs:reprint chamado", { jobId });
          const config = this.configStore.get();

          // Busca impressora configurada
          let printerName = config.selectedPrinter;

          console.log("[IPC] Config:", {
            stationToken: config.stationToken ? "exists" : "missing",
            selectedPrinter: printerName,
          });

          // Se não tem impressora na config, tenta buscar de printClient conectado
          if (!printerName && config.stationToken) {
            const printClient = this.printClients.get(config.stationToken);
            if (printClient) {
              const station = printClient.getStation();
              printerName = station?.default_printer_name;
              console.log(
                "[IPC] Usando impressora da estação conectada:",
                printerName
              );
            }
          }

          // Se ainda não tem impressora, usa a padrão do sistema
          if (!printerName) {
            const defaultPrinter =
              await this.printerService.getDefaultPrinter();
            printerName = defaultPrinter || undefined;
            console.log(
              "[IPC] Usando impressora padrão do sistema:",
              printerName
            );
          }

          if (!printerName) {
            console.error("[IPC] ❌ Nenhuma impressora disponível!");
            throw new Error(
              "Nenhuma impressora configurada. Configure uma impressora antes de reimprimir."
            );
          }

          console.log(`[IPC] Reimprimindo para impressora: ${printerName}`);

          // Usa printerService diretamente (não depende de printClient)
          await this.printerService.print(printerName, payload);

          this.logService.success(
            `Job ${jobId.substring(0, 8)} reimpresso com sucesso`
          );
          console.log("[IPC] ✓ Reimpressão concluída");

          return { success: true };
        } catch (error: any) {
          console.error("[IPC] ❌ Erro ao reimprimir:", error);
          this.logService.error(`Erro ao reimprimir: ${error.message}`);
          throw new Error(error.message);
        }
      }
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
      }
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

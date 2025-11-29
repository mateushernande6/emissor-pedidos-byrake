import { SupabaseService } from "./supabaseClient";
import { PrinterService } from "./printerService";
import { LogService } from "./logService";
import { PrintStation, PrintJob, ConnectionStatus } from "./types";

export class PrintClient {
  private supabase: SupabaseService;
  private printer: PrinterService;
  private logger: LogService;
  private station: PrintStation | null = null;
  private localCategories: string[] = []; // Categorias locais da CONEXÃO (não persistem no banco)
  private unsubscribe: (() => void) | null = null;
  private isProcessing = false;
  private processingQueue: PrintJob[] = [];
  private reconnectInterval: NodeJS.Timeout | null = null;
  private statusListeners: ((status: ConnectionStatus) => void)[] = [];

  constructor(
    supabase: SupabaseService,
    printer: PrinterService,
    logger: LogService
  ) {
    this.supabase = supabase;
    this.printer = printer;
    this.logger = logger;
  }

  /**
   * Conecta ao Supabase e identifica a estação
   */
  async connect(url: string, key: string, token: string): Promise<void> {
    try {
      this.logger.info("Conectando ao Supabase...");
      this.supabase.initialize(url, key);

      this.logger.info("Buscando estação por token...");
      const station = await this.supabase.getStationByToken(token);

      if (!station) {
        this.notifyStatus({
          connected: false,
          message: "Token de estação inválido. Verifique suas configurações.",
        });
        throw new Error("Token de estação não encontrado");
      }

      this.station = station;
      this.logger.success(`Estação encontrada: ${station.name}`);

      // Atualiza last_seen_at
      await this.supabase.updateLastSeen(station.id);

      // Notifica status conectado
      this.notifyStatus({
        connected: true,
        station,
      });

      // Busca jobs pendentes
      await this.processPendingJobs();

      // Assina novos jobs
      this.subscribeToNewJobs();

      // Configura heartbeat para atualizar last_seen_at periodicamente
      this.startHeartbeat();

      this.logger.success("Cliente de impressão conectado e ativo");
    } catch (error: any) {
      this.logger.error(`Erro ao conectar: ${error.message}`);
      this.notifyStatus({
        connected: false,
        message: error.message,
      });
      throw error;
    }
  }

  /**
   * Desconecta do Supabase
   */
  disconnect(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    // Para o polling
    this.stopPolling();

    this.supabase.disconnect();
    this.station = null;

    // LIMPA as categorias locais ao desconectar
    this.localCategories = [];

    this.notifyStatus({
      connected: false,
      message: "Desconectado",
    });

    this.logger.info("Cliente desconectado e filtros limpos");
  }

  /**
   * Verifica se um job deve ser processado baseado no filtro local de categorias
   */
  private shouldProcessJob(job: PrintJob): boolean {
    // Se não há filtro local, processa tudo
    if (this.localCategories.length === 0) {
      return true;
    }

    // Se o job não tem categorias, processa (retrocompatibilidade)
    const jobCategories = job.item_categories || [];
    if (jobCategories.length === 0) {
      return true;
    }

    // Verifica se há interseção entre categorias do job e filtro local
    return jobCategories.some((cat) => this.localCategories.includes(cat));
  }

  /**
   * Processa jobs pendentes ao iniciar
   */
  private async processPendingJobs(): Promise<void> {
    if (!this.station) return;

    try {
      this.logger.info("Buscando jobs pendentes...");
      const allJobs = await this.supabase.getPendingJobs(this.station.id);

      // Aplica filtro local de categorias
      const jobs = allJobs.filter((job) => this.shouldProcessJob(job));

      if (jobs.length === 0) {
        this.logger.info("Nenhum job pendente encontrado (após filtro local)");
        return;
      }

      this.logger.info(
        `${jobs.length} job(s) pendente(s) encontrado(s) (${
          allJobs.length - jobs.length
        } filtrado(s))`
      );

      // Adiciona à fila
      this.processingQueue.push(...jobs);
      this.processQueue();
    } catch (error: any) {
      this.logger.error(`Erro ao buscar jobs pendentes: ${error.message}`);
    }
  }

  /**
   * Assina novos jobs via Realtime + Polling (fallback)
   */
  private subscribeToNewJobs(): void {
    if (!this.station) return;

    this.logger.info("Assinando canal de novos jobs...");

    // Tenta usar Realtime
    this.unsubscribe = this.supabase.subscribeToJobs(
      this.station.id,
      (job: PrintJob) => {
        // Aplica filtro local antes de adicionar à fila
        if (this.shouldProcessJob(job)) {
          this.logger.info(`Novo job recebido via Realtime: ${job.id}`);
          this.processingQueue.push(job);
          this.processQueue();
        } else {
          this.logger.info(`Job ${job.id} ignorado (filtro local)`);
        }
      }
    );

    // Polling como fallback (verifica novos jobs a cada 3 segundos)
    this.startPolling();
  }

  /**
   * Inicia polling para verificar novos jobs periodicamente
   */
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastCheckedJobId: string | null = null;

  private startPolling(): void {
    if (!this.station) return;

    this.logger.info("Iniciando polling de jobs (verifica a cada 3 segundos)");

    // Limpa interval anterior se existir
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    // Polling a cada 3 segundos
    this.pollingInterval = setInterval(async () => {
      if (!this.station) return;

      try {
        const allJobs = await this.supabase.getPendingJobs(this.station.id);

        // Aplica filtro local de categorias
        const filteredJobs = allJobs.filter((job) =>
          this.shouldProcessJob(job)
        );

        // Filtra apenas jobs que não foram processados ainda
        const newJobs = filteredJobs.filter((job) => {
          // Se é um job novo (não visto antes)
          if (!this.lastCheckedJobId) return true;

          // Compara timestamps para pegar apenas jobs mais novos
          const jobTime = new Date(job.created_at).getTime();
          const lastTime = this.lastCheckedJobId ? 0 : 0; // Simplificado

          return true; // Por enquanto processa todos pendentes
        });

        if (newJobs.length > 0) {
          this.logger.info(
            `${newJobs.length} novo(s) job(s) encontrado(s) via polling`
          );

          newJobs.forEach((job) => {
            // Evita duplicatas verificando se já está na fila
            const alreadyInQueue = this.processingQueue.some(
              (qJob) => qJob.id === job.id
            );
            if (!alreadyInQueue) {
              this.processingQueue.push(job);
            }
          });

          this.processQueue();
        }
      } catch (error: any) {
        // Erro silencioso no polling para não poluir logs
        // this.logger.error(`Erro no polling: ${error.message}`);
      }
    }, 3000); // 3 segundos
  }

  /**
   * Para o polling
   */
  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.logger.info("Polling parado");
    }
  }

  /**
   * Processa a fila de jobs
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const job = this.processingQueue.shift();
      if (job) {
        await this.processJob(job);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Processa um job individual
   */
  private async processJob(job: PrintJob): Promise<void> {
    try {
      this.logger.info(`Processando job ${job.id}...`);

      // Atualiza status para "printing"
      await this.supabase.updateJobToPrinting(job.id);

      // Obtém impressora configurada
      const printerName = await this.getPrinterName();
      if (!printerName) {
        throw new Error("Nenhuma impressora configurada");
      }

      // Envia para impressão
      await this.printer.print(printerName, job.payload);

      // Atualiza status para "printed"
      await this.supabase.updateJobToPrinted(job.id);

      this.logger.success(`Job ${job.id} impresso com sucesso`);
    } catch (error: any) {
      this.logger.error(`Erro ao processar job ${job.id}: ${error.message}`);

      try {
        await this.supabase.updateJobToError(job.id, error.message);
      } catch (updateError: any) {
        this.logger.error(
          `Erro ao atualizar status de erro: ${updateError.message}`
        );
      }
    }
  }

  /**
   * Obtém o nome da impressora configurada
   */
  private async getPrinterName(): Promise<string | null> {
    // Primeiro tenta usar a configuração local
    // (será passada via parâmetro no método de teste ou salva na config)

    // Se não houver, usa a impressora padrão da estação
    if (this.station?.default_printer_name) {
      return this.station.default_printer_name;
    }

    // Se não houver, usa a impressora padrão do sistema
    return await this.printer.getDefaultPrinter();
  }

  /**
   * Atualiza a impressora padrão da estação
   */
  async updateDefaultPrinter(printerName: string): Promise<void> {
    if (!this.station) {
      throw new Error("Estação não conectada");
    }

    await this.supabase.updateDefaultPrinter(this.station.id, printerName);
    this.station.default_printer_name = printerName;
    this.logger.success(`Impressora padrão atualizada: ${printerName}`);
  }

  /**
   * Busca jobs recentes da estação atual
   * Permite filtro opcional por período
   */
  async getRecentJobs(
    limit: number = 50,
    startDate?: string,
    endDate?: string
  ): Promise<PrintJob[]> {
    if (!this.station) {
      return [];
    }

    // Busca jobs apenas desta estação
    return await this.supabase.getRecentJobs(
      this.station.id,
      limit,
      startDate,
      endDate
    );
  }

  /**
   * Atualiza o status do pedido
   */
  async updateJobOrderStatus(
    jobId: string,
    orderStatus: "recebido" | "em_preparo" | "pronto" | "entregue"
  ): Promise<void> {
    await this.supabase.updateOrderStatus(jobId, orderStatus);
    this.logger.info(`Status do pedido atualizado: ${orderStatus}`);
  }

  /**
   * Reimprime um job
   */
  async reprintJob(payload: string): Promise<void> {
    const printerName = await this.getPrinterName();
    if (!printerName) {
      throw new Error("Nenhuma impressora configurada");
    }

    this.logger.info("Reimprimindo job...");
    await this.printer.print(printerName, payload);
    this.logger.success("Job reimpresso com sucesso");
  }

  /**
   * Atualiza as categorias LOCAIS desta conexão (não salva no banco)
   * Cada conexão pode ter filtros diferentes, mesmo sendo a mesma estação
   */
  async updateStationCategories(categories: string[]): Promise<void> {
    if (!this.station) {
      throw new Error("Nenhuma estação conectada");
    }

    // Atualiza APENAS localmente (não persiste no banco)
    this.localCategories = categories;

    this.logger.success(
      `Filtro local atualizado: ${
        categories.length > 0
          ? categories.join(", ")
          : "Nenhum (todos os itens)"
      }`
    );
  }

  /**
   * Atualiza o nome da estação atual
   */
  async updateStationName(name: string): Promise<void> {
    if (!this.station) {
      throw new Error("Nenhuma estação conectada");
    }

    await this.supabase.updateStationName(this.station.token, name);

    // Atualiza o objeto local da estação
    this.station.name = name;

    this.logger.success(`Nome da estação atualizado: ${name}`);
  }

  /**
   * Heartbeat para atualizar last_seen_at
   */
  private startHeartbeat(): void {
    // Atualiza a cada 30 segundos
    this.reconnectInterval = setInterval(async () => {
      if (this.station) {
        try {
          await this.supabase.updateLastSeen(this.station.id);
        } catch (error: any) {
          this.logger.warning(`Erro ao atualizar heartbeat: ${error.message}`);
        }
      }
    }, 30000);
  }

  /**
   * Adiciona listener de status
   */
  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notifica listeners sobre mudança de status
   */
  private notifyStatus(status: ConnectionStatus): void {
    this.statusListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.error("Erro ao notificar listener de status:", error);
      }
    });
  }

  /**
   * Obtém a estação atual
   */
  getStation(): PrintStation | null {
    return this.station;
  }

  /**
   * Obtém as categorias locais desta conexão
   */
  getLocalCategories(): string[] {
    return this.localCategories;
  }

  /**
   * Define as categorias locais (usado ao reconectar com configuração salva)
   */
  setLocalCategories(categories: string[]): void {
    this.localCategories = categories;
    this.logger.info(
      `Filtro local carregado: ${
        categories.length > 0
          ? categories.join(", ")
          : "Nenhum (todos os itens)"
      }`
    );
  }
}

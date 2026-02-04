import {
  createClient,
  SupabaseClient,
  RealtimeChannel,
} from "@supabase/supabase-js";
import { PrintStation, PrintJob } from "./types";

export class SupabaseService {
  private client: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private stationToken: string | null = null;

  /**
   * Inicializa o cliente Supabase
   */
  initialize(url: string, key: string, stationToken?: string): void {
    this.client = createClient(url, key);
    if (typeof stationToken === "string") {
      this.stationToken = stationToken;
    }
  }

  setStationToken(stationToken: string): void {
    this.stationToken = stationToken;
  }

  /**
   * Verifica se o cliente está inicializado
   */
  isInitialized(): boolean {
    return this.client !== null;
  }

  /**
   * Busca uma estação pelo token
   */
  async getStationByToken(token: string): Promise<PrintStation | null> {
    if (!this.client) {
      throw new Error("Cliente Supabase não inicializado");
    }

    const { data, error } = await this.client.rpc(
      "get_print_station_by_token",
      {
        p_token: token,
      },
    );

    if (error) {
      return null;
    }

    return data as PrintStation;
  }

  /**
   * Atualiza o last_seen_at da estação
   */
  async updateLastSeen(stationId: string): Promise<void> {
    if (!this.client) {
      throw new Error("Cliente Supabase não inicializado");
    }

    if (!this.stationToken) {
      throw new Error("Token da estação não definido");
    }

    const { error } = await this.client.rpc(
      "touch_print_station_last_seen_by_token",
      {
        p_token: this.stationToken,
      },
    );

    if (error) {
      throw new Error(`Erro ao atualizar last_seen: ${error.message}`);
    }
  }

  /**
   * Atualiza o nome da impressora padrão da estação
   */
  async updateDefaultPrinter(
    stationId: string,
    printerName: string,
  ): Promise<void> {
    if (!this.client) {
      throw new Error("Cliente Supabase não inicializado");
    }

    if (!this.stationToken) {
      throw new Error("Token da estação não definido");
    }

    const { error } = await this.client.rpc(
      "update_print_station_default_printer_by_token",
      {
        p_token: this.stationToken,
        p_default_printer_name: printerName,
      },
    );

    if (error) {
      throw new Error(`Erro ao atualizar impressora padrão: ${error.message}`);
    }
  }

  /**
   * Busca jobs pendentes de uma estação (filtrados por categoria quando aplicável)
   * RETROCOMPATÍVEL: Jobs sem categoria imprimem em todas as estações
   */
  async getPendingJobs(): Promise<PrintJob[]> {
    if (!this.client) {
      throw new Error("Cliente Supabase não inicializado");
    }

    if (!this.stationToken) {
      throw new Error("Token da estação não definido");
    }

    const { data, error } = await this.client.rpc(
      "get_pending_print_jobs_by_token",
      {
        p_token: this.stationToken,
      },
    );

    if (error) {
      throw new Error(`Erro ao buscar jobs pendentes: ${error.message}`);
    }

    return ((data as PrintJob[]) || []) as PrintJob[];
  }

  /**
   * Atualiza o status de um job para "printing"
   */
  async updateJobToPrinting(jobId: string): Promise<void> {
    await this.updateJobStatus(jobId, "printing");
  }

  /**
   * Atualiza o status de um job para "printed"
   */
  async updateJobToPrinted(jobId: string): Promise<void> {
    await this.updateJobStatus(jobId, "printed");
  }

  /**
   * Atualiza o status de um job para "error"
   */
  async updateJobToError(jobId: string, errorMessage: string): Promise<void> {
    await this.updateJobStatus(jobId, "error", errorMessage);
  }

  private async updateJobStatus(
    jobId: string,
    status: string,
    errorMessage?: string,
  ): Promise<void> {
    if (!this.client) {
      throw new Error("Cliente Supabase não inicializado");
    }

    if (!this.stationToken) {
      throw new Error("Token da estação não definido");
    }

    const { error } = await this.client.rpc(
      "update_print_job_status_by_token",
      {
        p_token: this.stationToken,
        p_job_id: jobId,
        p_status: status,
        p_error_message: errorMessage || null,
      },
    );

    if (error) {
      throw new Error(`Erro ao atualizar status do job: ${error.message}`);
    }
  }

  /**
   * Busca jobs recentes (impressos e cancelados) de TODAS as estações
   * Inclui informações da estação e permite filtro por período
   */
  async getRecentJobs(
    stationId?: string, // Opcional agora
    limit: number = 50,
    startDate?: string, // Data inicial (ISO)
    endDate?: string, // Data final (ISO)
  ): Promise<PrintJob[]> {
    if (!this.client) {
      throw new Error("Cliente Supabase não inicializado");
    }

    let query = this.client
      .from("print_jobs")
      .select(
        `
        *,
        station:print_stations(
          id,
          name,
          token
        )
      `,
      )
      .in("status", ["printed", "cancelled"]); // Inclui impressos e cancelados

    // Filtro de estação (opcional)
    if (stationId) {
      query = query.eq("station_id", stationId);
    }

    // Filtro de período (opcional)
    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    query = query.order("created_at", { ascending: false }).limit(limit);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar jobs recentes: ${error.message}`);
    }

    return (data as PrintJob[]) || [];
  }

  async getRecentJobsByToken(
    limit: number = 50,
    startDate?: string,
    endDate?: string,
  ): Promise<PrintJob[]> {
    if (!this.client) {
      throw new Error("Cliente Supabase não inicializado");
    }

    if (!this.stationToken) {
      throw new Error("Token da estação não definido");
    }

    const { data, error } = await this.client.rpc(
      "get_recent_print_jobs_by_token",
      {
        p_token: this.stationToken,
        p_limit: limit,
        p_start: startDate || null,
        p_end: endDate || null,
      },
    );

    if (error) {
      throw new Error(`Erro ao buscar jobs recentes: ${error.message}`);
    }

    return ((data as PrintJob[]) || []) as PrintJob[];
  }

  /**
   * Atualiza o status do pedido (order_status)
   */
  async updateOrderStatus(
    jobId: string,
    orderStatus: "recebido" | "em_preparo" | "pronto" | "entregue",
  ): Promise<void> {
    if (!this.client) {
      throw new Error("Cliente Supabase não inicializado");
    }

    const { error } = await this.client
      .from("print_jobs")
      .update({ order_status: orderStatus })
      .eq("id", jobId);

    if (error) {
      throw new Error(`Erro ao atualizar status do pedido: ${error.message}`);
    }
  }

  /**
   * Assina mudanças em tempo real na tabela print_jobs
   */
  subscribeToJobs(
    stationId: string,
    onInsert: (job: PrintJob) => void,
  ): () => void {
    if (!this.client) {
      throw new Error("Cliente Supabase não inicializado");
    }

    // Remove assinatura anterior se existir
    if (this.channel) {
      this.client.removeChannel(this.channel);
    }

    console.log("[DEBUG] Criando subscription para station_id:", stationId);

    // TESTE: Remover filtro temporariamente para debug
    this.channel = this.client
      .channel("print_jobs_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "print_jobs",
          // Removido filtro para testar
        },
        (payload) => {
          // Recebe TODOS os inserts, filtra manualmente
          const job = payload.new as PrintJob;
          if (job.station_id === stationId) {
            onInsert(job);
          }
        },
      )
      .subscribe((status, err) => {
        console.log("[DEBUG] Realtime subscription status:", status);
        if (err) {
          console.error("[DEBUG] Realtime subscription error:", err);
        }
      });

    // Retorna função para cancelar assinatura
    return () => {
      if (this.channel) {
        this.client?.removeChannel(this.channel);
        this.channel = null;
      }
    };
  }

  /**
   * Atualiza as categorias de uma estação
   */
  async updateStationCategories(
    stationToken: string,
    categories: string[],
  ): Promise<void> {
    if (!this.client) {
      throw new Error("Cliente Supabase não inicializado");
    }

    const { error } = await this.client
      .from("print_stations")
      .update({ categories })
      .eq("token", stationToken);

    if (error) {
      throw new Error(`Erro ao atualizar categorias: ${error.message}`);
    }
  }

  /**
   * Atualiza o nome de uma estação
   */
  async updateStationName(stationToken: string, name: string): Promise<void> {
    if (!this.client) {
      throw new Error("Cliente Supabase não inicializado");
    }

    const { error } = await this.client
      .from("print_stations")
      .update({ name })
      .eq("token", stationToken);

    if (error) {
      throw new Error(`Erro ao atualizar nome da estação: ${error.message}`);
    }
  }

  /**
   * Desconecta e limpa recursos
   */
  disconnect(): void {
    if (this.channel) {
      this.client?.removeChannel(this.channel);
      this.channel = null;
    }
    this.client = null;
  }
}

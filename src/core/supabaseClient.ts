import {
  createClient,
  SupabaseClient,
  RealtimeChannel,
} from "@supabase/supabase-js";
import { PrintStation, PrintJob } from "./types";

export class SupabaseService {
  private client: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;

  /**
   * Inicializa o cliente Supabase
   */
  initialize(url: string, key: string): void {
    this.client = createClient(url, key);
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

    const { data, error } = await this.client
      .from("print_stations")
      .select("*")
      .eq("token", token)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Nenhum registro encontrado
        return null;
      }
      throw new Error(`Erro ao buscar estação: ${error.message}`);
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

    const { error } = await this.client
      .from("print_stations")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", stationId);

    if (error) {
      throw new Error(`Erro ao atualizar last_seen: ${error.message}`);
    }
  }

  /**
   * Atualiza o nome da impressora padrão da estação
   */
  async updateDefaultPrinter(
    stationId: string,
    printerName: string
  ): Promise<void> {
    if (!this.client) {
      throw new Error("Cliente Supabase não inicializado");
    }

    const { error } = await this.client
      .from("print_stations")
      .update({ default_printer_name: printerName })
      .eq("id", stationId);

    if (error) {
      throw new Error(`Erro ao atualizar impressora padrão: ${error.message}`);
    }
  }

  /**
   * Busca jobs pendentes de uma estação (filtrados por categoria quando aplicável)
   * RETROCOMPATÍVEL: Jobs sem categoria imprimem em todas as estações
   */
  async getPendingJobs(stationId: string): Promise<PrintJob[]> {
    if (!this.client) {
      throw new Error("Cliente Supabase não inicializado");
    }

    // Primeiro busca a estação para pegar suas categorias
    const { data: station, error: stationError } = await this.client
      .from("print_stations")
      .select("categories")
      .eq("id", stationId)
      .single();

    if (stationError) {
      throw new Error(`Erro ao buscar estação: ${stationError.message}`);
    }

    // Busca todos os jobs pendentes da estação
    const { data, error } = await this.client
      .from("print_jobs")
      .select("*")
      .eq("station_id", stationId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar jobs pendentes: ${error.message}`);
    }

    const allJobs = (data as PrintJob[]) || [];

    // Filtra jobs baseado nas categorias da estação
    const stationCategories = station?.categories || [];

    // RETROCOMPATIBILIDADE: Se a estação não tem categorias, retorna todos (comportamento antigo)
    if (!stationCategories || stationCategories.length === 0) {
      return allJobs;
    }

    // Aplica filtro de categorias
    const filteredJobs = allJobs.filter((job: any) => {
      const jobCategories = job.item_categories || [];

      // RETROCOMPATIBILIDADE: Jobs SEM categoria imprimem em TODAS as estações
      // Isso mantém o comportamento antigo do sistema funcionando
      if (!jobCategories || jobCategories.length === 0) {
        return true; // Imprime (comportamento antigo)
      }

      // Jobs COM categoria: verifica se há interseção com as categorias da estação
      return stationCategories.some((cat: string) =>
        jobCategories.includes(cat)
      );
    });

    return filteredJobs;
  }

  /**
   * Atualiza o status de um job para "printing"
   */
  async updateJobToPrinting(jobId: string): Promise<void> {
    if (!this.client) {
      throw new Error("Cliente Supabase não inicializado");
    }

    const { error } = await this.client
      .from("print_jobs")
      .update({ status: "printing" })
      .eq("id", jobId);

    if (error) {
      throw new Error(`Erro ao atualizar job para printing: ${error.message}`);
    }
  }

  /**
   * Atualiza o status de um job para "printed"
   */
  async updateJobToPrinted(jobId: string): Promise<void> {
    if (!this.client) {
      throw new Error("Cliente Supabase não inicializado");
    }

    const { error } = await this.client
      .from("print_jobs")
      .update({
        status: "printed",
        printed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (error) {
      throw new Error(`Erro ao atualizar job para printed: ${error.message}`);
    }
  }

  /**
   * Atualiza o status de um job para "error"
   */
  async updateJobToError(jobId: string, errorMessage: string): Promise<void> {
    if (!this.client) {
      throw new Error("Cliente Supabase não inicializado");
    }

    const { error } = await this.client
      .from("print_jobs")
      .update({
        status: "error",
        error_message: errorMessage,
      })
      .eq("id", jobId);

    if (error) {
      throw new Error(`Erro ao atualizar job para error: ${error.message}`);
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
    endDate?: string // Data final (ISO)
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
      `
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

  /**
   * Atualiza o status do pedido (order_status)
   */
  async updateOrderStatus(
    jobId: string,
    orderStatus: "recebido" | "em_preparo" | "pronto" | "entregue"
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
    onInsert: (job: PrintJob) => void
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
        }
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
    categories: string[]
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

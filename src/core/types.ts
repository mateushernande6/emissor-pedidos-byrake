// Tipos do Supabase
export type PrintJobStatus =
  | "pending"
  | "printing"
  | "printed"
  | "error"
  | "cancelled";
export type OrderStatus = "recebido" | "em_preparo" | "pronto" | "entregue";

export interface PrintStation {
  id: string;
  name: string;
  token: string;
  default_printer_name?: string;
  categories?: string[]; // Categorias que a estação imprime
  created_at: string;
  last_seen_at?: string;
  is_active: boolean;
}

export interface PrintJob {
  id: string;
  station_id: string;
  payload: string;
  status: PrintJobStatus;
  error_message?: string;
  created_at: string;
  printed_at?: string;
  order_status: OrderStatus;
  order_status_updated_at?: string;
  item_categories?: string[]; // Categorias dos itens do pedido
  station?: {
    id: string;
    name: string;
    token: string;
  };
}

// Configuração local
export interface AppConfig {
  stationToken: string;
  selectedPrinter?: string;
  stations?: StationConfig[]; // Array de estações configuradas
}

// Configuração de estação individual
export interface StationConfig {
  id: string; // ID local único
  name: string; // Nome amigável
  token: string; // Token da estação
  printer?: string; // Impressora associada
  categories?: string[]; // Categorias filtradas
  isActive: boolean; // Se está ativa
  isConnected?: boolean; // Status de conexão
}

// Logs
export interface LogEntry {
  timestamp: Date;
  level: "info" | "warning" | "error" | "success";
  message: string;
}

// Informação de impressora
export interface PrinterInfo {
  name: string;
  isDefault: boolean;
}

// Status de conexão
export interface ConnectionStatus {
  connected: boolean;
  station?: PrintStation;
  message?: string;
}

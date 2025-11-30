import React, { useState, useEffect } from "react";
import {
  AppConfig,
  StationConfig,
  LogEntry,
  PrinterInfo,
  ConnectionStatus,
  PrintJob,
  OrderStatus,
} from "../core/types";
import "./styles.css";

const App: React.FC = () => {
  // Estado da configuração
  const [config, setConfig] = useState<Partial<AppConfig>>({});
  const [stationToken, setStationToken] = useState("");

  // Estado das impressoras
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");

  // Estado de conexão
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
  });

  // Jobs/Pedidos
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [selectedTab, setSelectedTab] = useState<
    "all" | OrderStatus | "cancelado"
  >("all");

  // Filtro de período
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Categorias
  const [availableCategories] = useState<string[]>([
    "Comidas",
    "Bebidas",
    "Outros",
  ]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Multi-Estações
  const [stations, setStations] = useState<StationConfig[]>([]);
  const [editingStationId, setEditingStationId] = useState<string | null>(null);
  const [showStationForm, setShowStationForm] = useState(false);
  const [newStation, setNewStation] = useState<Partial<StationConfig>>({
    name: "",
    token: "",
    printer: "",
    categories: [],
    isActive: true,
  });

  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Pedidos expandidos
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // Mensagens de feedback
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Carrega configuração ao iniciar
  useEffect(() => {
    loadConfig();
    loadPrinters();
    loadConnectionStatus();

    // Escuta logs
    const unsubscribeLogs = window.electronAPI.onLog((log: LogEntry) => {
      setLogs((prev) => [...prev, log].slice(-100)); // Mantém últimos 100 logs
    });

    // Escuta mudanças de status
    const unsubscribeStatus = window.electronAPI.onStatusChange(
      (status: ConnectionStatus) => {
        setConnectionStatus(status);
      }
    );

    return () => {
      unsubscribeLogs();
      unsubscribeStatus();
    };
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await window.electronAPI.config.get();
      setConfig(cfg);
      setStationToken(cfg.stationToken || "");
      setSelectedPrinter(cfg.selectedPrinter || "");

      // Carregar estações (todas como desconectadas)
      if (cfg.stations) {
        const stationsDisconnected = cfg.stations.map(
          (station: StationConfig) => ({
            ...station,
            isConnected: false,
          })
        );
        setStations(stationsDisconnected);
      }
    } catch (error: any) {
      showMessage("error", `Erro ao carregar configuração: ${error.message}`);
    }
  };

  const loadPrinters = async () => {
    try {
      const printerList = await window.electronAPI.printer.list();
      setPrinters(printerList);
    } catch (error: any) {
      showMessage("error", `Erro ao carregar impressoras: ${error.message}`);
    }
  };

  const loadConnectionStatus = async () => {
    try {
      const status = await window.electronAPI.connection.getStatus();
      setConnectionStatus(status);
    } catch (error: any) {
      console.error("Erro ao carregar status:", error);
    }
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSaveConfig = async () => {
    try {
      await window.electronAPI.config.set({
        stationToken,
      });
      showMessage("success", "Configuração salva com sucesso!");
    } catch (error: any) {
      showMessage("error", `Erro ao salvar configuração: ${error.message}`);
    }
  };

  const handleConnect = async () => {
    try {
      // Salva config primeiro
      await window.electronAPI.config.set({
        stationToken,
      });

      // Conecta
      await window.electronAPI.connection.connect();
      showMessage("success", "Conectado com sucesso!");
    } catch (error: any) {
      showMessage("error", `Erro ao conectar: ${error.message}`);
    }
  };

  const handleDisconnect = async () => {
    try {
      await window.electronAPI.connection.disconnect();
      showMessage("success", "Desconectado com sucesso!");
    } catch (error: any) {
      showMessage("error", `Erro ao desconectar: ${error.message}`);
    }
  };

  const handleRefreshPrinters = async () => {
    await loadPrinters();
    showMessage("success", "Lista de impressoras atualizada!");
  };

  const handleSavePrinter = async () => {
    try {
      await window.electronAPI.printer.setDefault(selectedPrinter);
      showMessage("success", "Impressora padrão salva com sucesso!");
    } catch (error: any) {
      showMessage("error", `Erro ao salvar impressora: ${error.message}`);
    }
  };

  const handleTestPrint = async () => {
    if (!selectedPrinter) {
      showMessage("error", "Selecione uma impressora primeiro");
      return;
    }

    try {
      await window.electronAPI.printer.test(selectedPrinter);
      showMessage("success", "Teste de impressão enviado com sucesso!");
    } catch (error: any) {
      showMessage("error", `Erro ao testar impressão: ${error.message}`);
    }
  };

  // Funções de Jobs/Pedidos
  const loadJobs = async () => {
    try {
      // Busca de TODAS as estações (não apenas da conectada)
      // Com filtros de período opcionais
      const start = startDate ? new Date(startDate).toISOString() : undefined;
      const end = endDate
        ? new Date(endDate + "T23:59:59").toISOString()
        : undefined;

      const result = await window.electronAPI.jobs.getRecent(200, start, end);
      setJobs(result.jobs || []);
    } catch (error: any) {
      console.error("Erro ao carregar jobs:", error);
    }
  };

  const handleUpdateOrderStatus = async (
    jobId: string,
    newStatus: OrderStatus
  ) => {
    try {
      await window.electronAPI.jobs.updateStatus(jobId, newStatus);
      showMessage(
        "success",
        `Status atualizado para: ${getStatusLabel(newStatus)}`
      );
      // Recarrega jobs
      await loadJobs();
    } catch (error: any) {
      showMessage("error", `Erro ao atualizar status: ${error.message}`);
    }
  };

  const handleReprint = async (job: PrintJob) => {
    try {
      await window.electronAPI.jobs.reprint(job.id, job.payload);
      showMessage("success", "Pedido reimpresso com sucesso!");
    } catch (error: any) {
      showMessage("error", `Erro ao reimprimir: ${error.message}`);
    }
  };

  const getStatusLabel = (status: OrderStatus): string => {
    const labels = {
      recebido: "Recebido",
      em_preparo: "Em Preparo",
      pronto: "Pronto",
      entregue: "Entregue",
    };
    return labels[status];
  };

  const getStatusColor = (status: OrderStatus): string => {
    const colors = {
      recebido: "#3b82f6",
      em_preparo: "#f59e0b",
      pronto: "#22c55e",
      entregue: "#6b7280",
    };
    return colors[status];
  };

  // Carrega jobs sempre (não precisa estar conectado para ver pedidos)
  // Recarrega quando filtros de período mudarem
  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 10000);
    return () => clearInterval(interval);
  }, [startDate, endDate]); // Recarrega quando mudar filtros

  // Limpa categorias quando desconectar
  useEffect(() => {
    if (!connectionStatus.connected) {
      setSelectedCategories([]);
    }
  }, [connectionStatus.connected]);

  // Handler para aplicar filtro local de categorias (não salva no banco)
  const handleSaveCategories = async () => {
    try {
      await window.electronAPI.station.updateCategories(selectedCategories);
      showMessage(
        "success",
        "Filtro local aplicado! (Válido apenas nesta conexão)"
      );
    } catch (error: any) {
      showMessage("error", `Erro ao aplicar filtro: ${error.message}`);
    }
  };

  const formatLogLevel = (level: string) => {
    const colors: Record<string, string> = {
      info: "#3b82f6",
      success: "#22c55e",
      warning: "#f59e0b",
      error: "#ef4444",
    };
    return colors[level] || "#6b7280";
  };

  // === Handlers de Conexão por Estação ===

  const handleConnectStation = async (station: StationConfig) => {
    try {
      // Salva o token da estação (para esta conexão específica)
      await window.electronAPI.config.set({
        stationToken: station.token,
        selectedPrinter: station.printer,
      });

      // Conecta esta estação (backend agora suporta múltiplas conexões)
      await window.electronAPI.connection.connect();

      // Atualiza status APENAS desta estação (não desconecta outras)
      const updatedStations = stations.map((s) =>
        s.id === station.id ? { ...s, isConnected: true } : s
      );
      setStations(updatedStations);
      // Salva config (sem isConnected)
      saveStationsToConfig(updatedStations);

      // Recarrega jobs de TODAS as estações
      await loadJobs();

      showMessage("success", `Estação "${station.name}" conectada!`);
    } catch (error: any) {
      showMessage("error", `Erro ao conectar: ${error.message}`);
    }
  };

  const handleDisconnectStation = async (station: StationConfig) => {
    try {
      await window.electronAPI.connection.disconnect();

      // Atualiza status
      const updatedStations = stations.map((s) =>
        s.id === station.id ? { ...s, isConnected: false } : s
      );
      setStations(updatedStations);
      // Salva config (sem isConnected)
      saveStationsToConfig(updatedStations);

      showMessage("success", `Estação "${station.name}" desconectada!`);
    } catch (error: any) {
      showMessage("error", `Erro ao desconectar: ${error.message}`);
    }
  };

  const handleTestPrintStation = async (station: StationConfig) => {
    if (!station.printer) {
      showMessage(
        "error",
        "Configure uma impressora para esta estação primeiro"
      );
      return;
    }

    try {
      await window.electronAPI.printer.test(station.printer);
      showMessage(
        "success",
        `Teste de impressão enviado para ${station.printer}!`
      );
    } catch (error: any) {
      showMessage("error", `Erro ao testar impressão: ${error.message}`);
    }
  };

  const handleAddStation = () => {
    if (!newStation.name || !newStation.token) {
      showMessage("error", "Nome e Token são obrigatórios");
      return;
    }

    const station: StationConfig = {
      id: Date.now().toString(),
      name: newStation.name,
      token: newStation.token,
      printer: newStation.printer || "",
      categories: newStation.categories || [],
      isActive: newStation.isActive !== false,
      isConnected: false,
    };

    const updatedStations = [...stations, station];
    setStations(updatedStations);

    // Salvar no config
    saveStationsToConfig(updatedStations);

    // Resetar formulário
    setNewStation({
      name: "",
      token: "",
      printer: "",
      categories: [],
      isActive: true,
    });
    setShowStationForm(false);
    showMessage("success", "Estação adicionada com sucesso!");
  };

  const handleRemoveStation = (id: string) => {
    if (confirm("Deseja realmente remover esta estação?")) {
      const updatedStations = stations.filter((s) => s.id !== id);
      setStations(updatedStations);
      saveStationsToConfig(updatedStations);
      showMessage("success", "Estação removida!");
    }
  };

  const handleToggleStation = (id: string) => {
    const updatedStations = stations.map((s) =>
      s.id === id ? { ...s, isActive: !s.isActive } : s
    );
    setStations(updatedStations);
    saveStationsToConfig(updatedStations);
  };

  const saveStationsToConfig = async (stationsList: StationConfig[]) => {
    try {
      // NÃO salvar isConnected no config (é estado de runtime)
      const stationsToSave = stationsList.map(
        ({ isConnected, ...station }) => station
      );

      const newConfig = {
        ...config,
        stations: stationsToSave,
      };
      await window.electronAPI.config.set(newConfig);
      // NÃO chamar setConfig aqui para evitar re-trigger do useEffect
    } catch (error: any) {
      showMessage("error", `Erro ao salvar estações: ${error.message}`);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Emissor ByRake</h1>
        <div className="status-bar">
          <span className="status-label">Estação:</span>
          <span className="status-value">
            {connectionStatus.station?.name || "Não conectado"}
          </span>
          <span className="status-separator">|</span>
          <span className="status-label">Status:</span>
          <span
            className={`status-indicator ${
              connectionStatus.connected ? "connected" : "disconnected"
            }`}
          >
            {connectionStatus.connected ? "Conectado" : "Desconectado"}
          </span>
        </div>
      </header>

      {message && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      <div className="content">
        <div className="main-content">
          <div className="left-panel">
            <section className="config-section">
              <div className="section-header">
                <h2>Estações de Impressão</h2>
                <button
                  onClick={() => setShowStationForm(!showStationForm)}
                  className="btn btn-primary btn-sm"
                >
                  {showStationForm ? "Cancelar" : "+ Nova Estação"}
                </button>
              </div>

              {showStationForm && (
                <div className="station-form">
                  <h3>Adicionar Nova Estação</h3>
                  <div className="form-group">
                    <label>Nome da Estação</label>
                    <input
                      type="text"
                      value={newStation.name || ""}
                      onChange={(e) =>
                        setNewStation({ ...newStation, name: e.target.value })
                      }
                      placeholder="Ex: Cozinha Principal"
                    />
                  </div>
                  <div className="form-group">
                    <label>Token</label>
                    <input
                      type="text"
                      value={newStation.token || ""}
                      onChange={(e) =>
                        setNewStation({ ...newStation, token: e.target.value })
                      }
                      placeholder="token-da-estacao"
                    />
                  </div>
                  <div className="form-group">
                    <label>Impressora</label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <select
                        value={newStation.printer || ""}
                        onChange={(e) =>
                          setNewStation({
                            ...newStation,
                            printer: e.target.value,
                          })
                        }
                        style={{ flex: 1 }}
                      >
                        <option value="">Selecione uma impressora</option>
                        {printers.map((printer) => (
                          <option key={printer.name} value={printer.name}>
                            {printer.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleRefreshPrinters}
                        className="btn btn-secondary"
                        style={{ padding: "0.5rem 1rem" }}
                        title="Atualizar lista de impressoras"
                      >
                        🔄
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Categorias</label>
                    <select
                      multiple
                      value={newStation.categories || []}
                      onChange={(e) => {
                        const options = Array.from(e.target.selectedOptions);
                        setNewStation({
                          ...newStation,
                          categories: options.map((opt) => opt.value),
                        });
                      }}
                      className="category-select"
                      size={3}
                    >
                      {availableCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <small className="info">
                      Segure Ctrl/Cmd para múltiplas. Vazio = imprime tudo
                    </small>
                  </div>
                  <div className="button-group">
                    <button
                      onClick={handleAddStation}
                      className="btn btn-primary"
                    >
                      Adicionar Estação
                    </button>
                  </div>
                </div>
              )}

              <div className="stations-list">
                {stations.length === 0 ? (
                  <div className="empty-state">
                    <p>📋 Nenhuma estação configurada</p>
                    <p className="info">
                      Clique em "+ Nova Estação" para começar
                    </p>
                  </div>
                ) : (
                  stations.map((station) => (
                    <div
                      key={station.id}
                      className={`station-card ${
                        station.isConnected ? "connected" : ""
                      }`}
                    >
                      <div className="station-header">
                        <div className="station-title">
                          <h3>{station.name}</h3>
                          <span
                            className={`connection-badge ${
                              station.isConnected ? "connected" : "disconnected"
                            }`}
                          >
                            {station.isConnected
                              ? "● Conectado"
                              : "○ Desconectado"}
                          </span>
                        </div>
                        <div className="station-actions">
                          <button
                            onClick={() => handleToggleStation(station.id)}
                            className={`btn-toggle ${
                              station.isActive ? "active" : ""
                            }`}
                            title={station.isActive ? "Desativar" : "Ativar"}
                          >
                            {station.isActive ? "✓" : "○"}
                          </button>
                          <button
                            onClick={() => handleRemoveStation(station.id)}
                            className="btn-remove"
                            title="Remover"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className="station-details">
                        <div className="detail-row">
                          <span className="detail-label">Token:</span>
                          <span className="detail-value">
                            {station.token.substring(0, 8)}...
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Impressora:</span>
                          <span className="detail-value">
                            {station.printer || "Não definida"}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Categorias:</span>
                          <span className="detail-value">
                            {station.categories && station.categories.length > 0
                              ? station.categories.join(", ")
                              : "Todas"}
                          </span>
                        </div>
                      </div>
                      <div className="station-buttons">
                        <button
                          onClick={() => handleRefreshPrinters()}
                          className="btn btn-secondary btn-sm"
                        >
                          🔄 Atualizar Impressoras
                        </button>
                        <button
                          onClick={() => handleTestPrintStation(station)}
                          className="btn btn-secondary btn-sm"
                          disabled={!station.printer}
                        >
                          🖨️ Testar Impressão
                        </button>
                        {station.isConnected ? (
                          <button
                            onClick={() => handleDisconnectStation(station)}
                            className="btn btn-danger btn-sm"
                          >
                            Desconectar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleConnectStation(station)}
                            className="btn btn-primary btn-sm"
                            disabled={!station.isActive || !station.printer}
                          >
                            Conectar
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="logs-section">
              <h2>Logs de Atividade</h2>
              <div className="logs-container">
                {logs.length === 0 ? (
                  <p className="no-logs">Nenhum log ainda</p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="log-entry">
                      <span className="log-time">
                        {new Date(log.timestamp).toLocaleTimeString("pt-BR")}
                      </span>
                      <span
                        className="log-level"
                        style={{ color: formatLogLevel(log.level) }}
                      >
                        [{log.level.toUpperCase()}]
                      </span>
                      <span className="log-message">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>

        <div className="orders-sidebar">
          <section className="orders-section">
            <h2>Pedidos</h2>

            <div className="period-filter">
              <div className="filter-group">
                <label>Data Início:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="date-input"
                />
              </div>
              <div className="filter-group">
                <label>Data Fim:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="date-input"
                />
              </div>
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="btn-clear-filter"
              >
                Limpar
              </button>
            </div>

            <>
              <div className="orders-tabs">
                <button
                  className={`tab ${selectedTab === "all" ? "active" : ""}`}
                  onClick={() => setSelectedTab("all")}
                >
                  Todos ({jobs.length})
                </button>
                <button
                  className={`tab ${
                    selectedTab === "recebido" ? "active" : ""
                  }`}
                  onClick={() => setSelectedTab("recebido")}
                >
                  Recebido (
                  {jobs.filter((j) => j.order_status === "recebido").length})
                </button>
                <button
                  className={`tab ${
                    selectedTab === "em_preparo" ? "active" : ""
                  }`}
                  onClick={() => setSelectedTab("em_preparo")}
                >
                  Em Preparo (
                  {jobs.filter((j) => j.order_status === "em_preparo").length})
                </button>
                <button
                  className={`tab ${selectedTab === "pronto" ? "active" : ""}`}
                  onClick={() => setSelectedTab("pronto")}
                >
                  Pronto (
                  {jobs.filter((j) => j.order_status === "pronto").length})
                </button>
                <button
                  className={`tab ${
                    selectedTab === "entregue" ? "active" : ""
                  }`}
                  onClick={() => setSelectedTab("entregue")}
                >
                  Entregue (
                  {jobs.filter((j) => j.order_status === "entregue").length})
                </button>
                <button
                  className={`tab ${
                    selectedTab === "cancelado" ? "active" : ""
                  }`}
                  onClick={() => setSelectedTab("cancelado")}
                >
                  Cancelado (
                  {jobs.filter((j) => j.status === "cancelled").length})
                </button>
              </div>

              <div className="orders-list">
                {jobs
                  .filter((job) => {
                    // Pedidos cancelados só aparecem em "Todos" ou "Cancelado"
                    if (job.status === "cancelled") {
                      return (
                        selectedTab === "all" || selectedTab === "cancelado"
                      );
                    }

                    // Pedidos normais seguem lógica de order_status
                    return (
                      selectedTab === "all" || job.order_status === selectedTab
                    );
                  })
                  .map((job) => (
                    <div
                      key={job.id}
                      className={`order-card ${
                        job.status === "cancelled"
                          ? "status-cancelado"
                          : `status-${job.order_status}`
                      }`}
                    >
                      <div className="order-header">
                        <span className="order-time">
                          {new Date(job.created_at).toLocaleString("pt-BR")}
                        </span>
                        <span
                          className="order-status-badge"
                          style={{
                            backgroundColor:
                              job.status === "cancelled"
                                ? "#ef4444"
                                : getStatusColor(job.order_status),
                          }}
                        >
                          {job.status === "cancelled"
                            ? "Cancelado"
                            : getStatusLabel(job.order_status)}
                        </span>
                      </div>
                      {job.station && (
                        <div className="order-station">
                          <span className="station-label">Estação:</span>
                          <span className="station-name">
                            {job.station.name}
                          </span>
                        </div>
                      )}
                      <div className="order-content">
                        <pre>
                          {expandedOrders.has(job.id)
                            ? job.payload
                            : job.payload.substring(0, 200)}
                          {!expandedOrders.has(job.id) &&
                          job.payload.length > 200
                            ? "..."
                            : ""}
                        </pre>
                        {job.payload.length > 200 && (
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedOrders);
                              if (expandedOrders.has(job.id)) {
                                newExpanded.delete(job.id);
                              } else {
                                newExpanded.add(job.id);
                              }
                              setExpandedOrders(newExpanded);
                            }}
                            className="btn btn-small expand-btn"
                            style={{ marginTop: "0.5rem" }}
                          >
                            {expandedOrders.has(job.id)
                              ? "▲ Recolher"
                              : "▼ Expandir"}
                          </button>
                        )}
                      </div>
                      <div className="order-actions">
                        {job.status === "cancelled" ? (
                          <div
                            className="status-select"
                            style={{
                              opacity: 0.5,
                              cursor: "not-allowed",
                              padding: "0.5rem",
                            }}
                          >
                            Cancelado (Status Travado)
                          </div>
                        ) : (
                          <select
                            value={job.order_status}
                            onChange={(e) =>
                              handleUpdateOrderStatus(
                                job.id,
                                e.target.value as OrderStatus
                              )
                            }
                            className="status-select"
                          >
                            <option value="recebido">Recebido</option>
                            <option value="em_preparo">Em Preparo</option>
                            <option value="pronto">Pronto</option>
                            <option value="entregue">Entregue</option>
                          </select>
                        )}
                        <button
                          onClick={() => handleReprint(job)}
                          className="btn btn-small"
                        >
                          🖨️ Reimprimir
                        </button>
                      </div>
                    </div>
                  ))}
                {jobs.filter((job) => {
                  if (job.status === "cancelled") {
                    return selectedTab === "all" || selectedTab === "cancelado";
                  }
                  return (
                    selectedTab === "all" || job.order_status === selectedTab
                  );
                }).length === 0 && (
                  <p className="no-orders">
                    Nenhum pedido{" "}
                    {selectedTab !== "all"
                      ? `com status "${
                          selectedTab === "cancelado"
                            ? "Cancelado"
                            : getStatusLabel(selectedTab as OrderStatus)
                        }"`
                      : ""}
                  </p>
                )}
              </div>
            </>
          </section>
        </div>
      </div>
    </div>
  );
};

export default App;

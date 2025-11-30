import { BrowserWindow } from "electron";
import { spawn } from "child_process";
import { PrinterInfo } from "./types";

export class PrinterService {
  /**
   * Lista todas as impressoras disponíveis no sistema
   */
  async listPrinters(): Promise<PrinterInfo[]> {
    try {
      // Cria uma janela oculta temporária para acessar a API de impressão
      const win = new BrowserWindow({ show: false });
      const printers = await win.webContents.getPrintersAsync();
      win.close();

      return printers.map((p) => ({
        name: p.name,
        isDefault: p.isDefault || false,
      }));
    } catch (error) {
      console.error("Erro ao listar impressoras:", error);
      throw new Error("Não foi possível listar as impressoras do sistema");
    }
  }

  private sanitizeForPrinter(content: string): string {
    const withoutDiacritics = content
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "");

    const sanitized = withoutDiacritics.replace(
      /[^\x09\x0A\x0D\x1B\x1D\x20-\x7E]/g,
      ""
    );

    // Adiciona linhas em branco no final para facilitar o corte
    const feedLines = "\n\n\n\n\n\n\n\n"; // 8 linhas em branco

    // Comando ESC/POS para corte automático do papel
    // \x1D\x56\x01 = GS V 1 (corte parcial - deixa uma pequena parte ligada)
    // \x1D\x56\x00 = GS V 0 (corte total)
    const cutCommand = "\x1D\x56\x01"; // Corte parcial

    return sanitized + feedLines + cutCommand;
  }

  /**
   * Obtém a impressora padrão do sistema
   */
  async getDefaultPrinter(): Promise<string | null> {
    try {
      const printers = await this.listPrinters();
      const defaultPrinter = printers.find((p) => p.isDefault);
      return defaultPrinter?.name || null;
    } catch (error) {
      console.error("Erro ao obter impressora padrão:", error);
      return null;
    }
  }

  /**
   * Envia um texto simples para impressão usando Electron API
   */
  async print(printerName: string, content: string): Promise<void> {
    const sanitizedContent = this.sanitizeForPrinter(content);

    if (process.platform === "win32") {
      return this.printWithBrowserWindow(printerName, sanitizedContent);
    }

    // Em sistemas baseados em Unix (macOS/Linux), usa o comando lp para enviar texto puro
    return this.printWithLp(printerName, sanitizedContent);
  }

  private printWithLp(printerName: string, content: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Conteúdo já vem sanitizado com feed lines e comando de corte
      const normalizedContent = content;
      const lp = spawn("lp", ["-d", printerName, "-o", "raw"]);

      let stderr = "";

      lp.stdin.write(normalizedContent, (err) => {
        if (err) {
          reject(
            new Error(`Falha ao enviar dados para a impressora: ${err.message}`)
          );
        }
        lp.stdin.end();
      });

      lp.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      lp.on("error", (error) => {
        reject(
          new Error(`Erro ao executar comando de impressão: ${error.message}`)
        );
      });

      lp.on("close", (code) => {
        if (code === 0) {
          console.log(`Impressão enviada com sucesso para ${printerName}`);
          resolve();
        } else {
          reject(
            new Error(
              `Falha ao imprimir (código ${code}): ${
                stderr.trim() || "Erro desconhecido"
              }`
            )
          );
        }
      });
    });
  }

  private printWithBrowserWindow(
    printerName: string,
    content: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let isPrinting = false;
      let printWindow: BrowserWindow | null = null;
      let finished = false;

      try {
        printWindow = new BrowserWindow({
          show: false,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        });

        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              @page {
                margin: 10mm;
              }
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                margin: 0;
                padding: 10px;
                white-space: pre-wrap;
              }
            </style>
          </head>
          <body>${content
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br>")}</body>
          </html>
        `;

        const finalize = (error?: Error) => {
          if (finished) {
            return;
          }
          finished = true;

          if (printWindow && !printWindow.isDestroyed()) {
            printWindow.close();
          }

          if (error) {
            reject(error);
          } else {
            resolve();
          }
        };

        const timeoutId = setTimeout(() => {
          finalize(new Error("Timeout ao carregar conteúdo para impressão"));
        }, 10000);

        printWindow.webContents.once("did-finish-load", () => {
          if (isPrinting || !printWindow || printWindow.isDestroyed()) {
            return;
          }

          // CRÍTICO: No Windows, aguardar 500ms antes de imprimir
          // para garantir que o renderizador esteja completamente pronto
          setTimeout(() => {
            if (isPrinting || !printWindow || printWindow.isDestroyed()) {
              return;
            }

            isPrinting = true;
            clearTimeout(timeoutId);

            printWindow.webContents.print(
              {
                silent: true,
                printBackground: false,
                deviceName: printerName,
                margins: {
                  marginType: "custom",
                  top: 10,
                  bottom: 10,
                  left: 10,
                  right: 10,
                },
              },
              (success, errorType) => {
                if (!success) {
                  console.error("Erro ao imprimir:", errorType);
                  finalize(
                    new Error(
                      `Falha ao imprimir: ${errorType || "Erro desconhecido"}`
                    )
                  );
                  return;
                }

                console.log(
                  `Impressão enviada com sucesso para ${printerName}`
                );

                // CRÍTICO: No Windows, o callback retorna ANTES que o job
                // seja realmente processado pela fila da impressora.
                // Manter a janela aberta por 2 segundos para garantir que
                // o Windows processe completamente o job de impressão.
                console.log(
                  "[PRINT] Aguardando 2s para Windows processar job..."
                );
                setTimeout(() => {
                  console.log("[PRINT] Delay concluído, finalizando.");
                  finalize();
                }, 2000); // 2 segundos críticos para Windows processar
              }
            );
          }, 500); // 500ms de delay crítico para Windows
        });

        printWindow.on("closed", () => {
          printWindow = null;
        });

        printWindow.loadURL(
          `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
        );
      } catch (error: any) {
        if (!finished) {
          finished = true;
          if (printWindow && !printWindow.isDestroyed()) {
            printWindow.close();
          }
          reject(new Error(`Erro ao preparar impressão: ${error.message}`));
        }
      }
    });
  }

  /**
   * Teste de impressão com conteúdo simples
   */
  async testPrint(printerName: string, stationName: string): Promise<void> {
    const testContent = `
========================================
        TESTE DE IMPRESSÃO
========================================

Estação: ${stationName}
Data/Hora: ${new Date().toLocaleString("pt-BR")}
Impressora: ${printerName}

Este é um teste de impressão do 
Emissor de pedidos ByRake.

Se você está lendo isto, a impressão
está funcionando corretamente!

========================================







`;

    return this.print(printerName, testContent);
  }
}

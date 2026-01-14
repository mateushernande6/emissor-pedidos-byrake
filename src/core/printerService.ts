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

  private sanitizeForRawPrinter(content: string): string {
    const withoutDiacritics = content
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "");

    const sanitized = withoutDiacritics.replace(
      /[^\x09\x0A\x0D\x1B\x1D\x20-\x7E]/g,
      ""
    );

    const feedLines = "\n\n\n\n\n\n\n\n";
    const cutCommand = "\x1D\x56\x01";
    return sanitized + feedLines + cutCommand;
  }

  private sanitizeForBrowserPrint(content: string): string {
    const withoutDiacritics = content
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "");

    // Para impressão via Chromium/GDI (Windows), NÃO enviar bytes ESC/POS.
    // Mantém apenas TAB/LF/CR e caracteres imprimíveis.
    return withoutDiacritics.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
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
    if (process.platform === "win32") {
      const browserContent = this.sanitizeForBrowserPrint(content);
      try {
        return await this.printWithPowerShell(printerName, browserContent);
      } catch (error) {
        console.error(
          "[PRINT] Falha no PowerShell print, tentando fallback via BrowserWindow...",
          error
        );
        return this.printWithBrowserWindow(printerName, browserContent);
      }
    }

    const rawContent = this.sanitizeForRawPrinter(content);

    // Em sistemas baseados em Unix (macOS/Linux), usa o comando lp para enviar texto puro
    return this.printWithLp(printerName, rawContent);
  }

  private printWithPowerShell(
    printerName: string,
    content: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Evita problemas de quoting passando o texto em Base64
      const b64 = Buffer.from(content, "utf8").toString("base64");

      // Imprime texto usando .NET (GDI). É mais confiável no Windows do que
      // webContents.print para impressoras térmicas/ESC-POS.
      const psScript = [
        "$ErrorActionPreference = 'Stop'",
        `$printerName = ${JSON.stringify(printerName)}`,
        `$text = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String(${JSON.stringify(
          b64
        )}))`,
        "",
        "Add-Type -AssemblyName System.Drawing",
        "",
        "$doc = New-Object System.Drawing.Printing.PrintDocument",
        "$doc.PrinterSettings.PrinterName = $printerName",
        "",
        "if (-not $doc.PrinterSettings.IsValid) {",
        '  throw "Impressora inválida ou não encontrada: $printerName"',
        "}",
        "",
        "$font = New-Object System.Drawing.Font('Consolas', 9)",
        '$lines = $text -split "`n"',
        "$lineIndex = 0",
        "",
        "$doc.add_PrintPage({",
        "  param($sender, $e)",
        "  $x = 5",
        "  $y = 5",
        "  $lineHeight = $font.GetHeight($e.Graphics)",
        "  $maxY = $e.MarginBounds.Bottom",
        "  while ($lineIndex -lt $lines.Length) {",
        "    $line = $lines[$lineIndex]",
        "    $e.Graphics.DrawString($line, $font, [System.Drawing.Brushes]::Black, $x, $y)",
        "    $y += $lineHeight",
        "    $lineIndex++",
        "    if ($y + $lineHeight -gt $maxY) {",
        "      $e.HasMorePages = $true",
        "      return",
        "    }",
        "  }",
        "  $e.HasMorePages = $false",
        "})",
        "",
        "$doc.Print()",
      ].join("\r\n");

      const ps = spawn(
        "powershell.exe",
        ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript],
        { windowsHide: true }
      );

      let stderr = "";
      ps.stderr.on("data", (d) => {
        stderr += d.toString();
      });

      ps.on("error", (err) => {
        reject(new Error(`Falha ao executar PowerShell: ${err.message}`));
      });

      ps.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(
              `PowerShell retornou código ${code}: ${
                stderr.trim() || "Erro desconhecido"
              }`
            )
          );
        }
      });
    });
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
                margin: 0;
              }
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                margin: 0;
                padding: 0;
              }
              pre {
                margin: 0;
                padding: 10px;
                white-space: pre;
              }
            </style>
          </head>
          <body><pre>${content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")}</pre></body>
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

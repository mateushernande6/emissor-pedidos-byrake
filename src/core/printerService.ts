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

<<<<<<< HEAD
  private sanitizeForRawPrinter(content: string): string {
    const withoutDiacritics = content
=======
  private sanitizeTextContent(content: string): string {
    const normalized = content
      .replace(/[\u2010-\u2015]/g, "-")
      .replace(/\u2026/g, "...")
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\u00BA/g, "o")
      .replace(/\u00AA/g, "a")
      .replace(/\u00A0/g, " ");

    const withoutDiacritics = normalized
>>>>>>> 46b5bdd (fix: fixed print)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "");

    return withoutDiacritics.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
  }

<<<<<<< HEAD
    const feedLines = "\n\n\n\n\n\n\n\n";
    const cutCommand = "\x1D\x56\x01";
    return sanitized + feedLines + cutCommand;
=======
  private wrapLines(content: string, maxCharsPerLine: number): string[] {
    const lines = content.split("\n");
    const wrapped: string[] = [];

    for (const line of lines) {
      if (line.length <= maxCharsPerLine) {
        wrapped.push(line);
        continue;
      }

      let rest = line;
      while (rest.length > maxCharsPerLine) {
        let cut = rest.lastIndexOf(" ", maxCharsPerLine);
        if (cut < 10) {
          cut = maxCharsPerLine;
        }
        wrapped.push(rest.slice(0, cut));
        rest = rest.slice(cut).trimStart();
      }
      if (rest.length > 0) {
        wrapped.push(rest);
      }
    }

    return wrapped;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  private classifyLine(line: string): "title" | "separator" | "content" {
    const trimmed = line.trim();
    if (!trimmed) {
      return "content";
    }

    const isSeparator = /^[-_=*#]{6,}$/.test(trimmed);
    if (isSeparator) {
      return "separator";
    }

    const upper = trimmed.toUpperCase();
    const titleKeywords = [
      "BYRAKE",
      "TESTE DE IMPRESSAO",
      "PEDIDO",
      "COMANDA",
      "TOTAL",
      "ESTACAO",
      "ITENS",
    ];

    if (
      titleKeywords.some((k) => upper.startsWith(k)) ||
      (upper === trimmed && trimmed.length >= 6 && trimmed.length <= 32)
    ) {
      return "title";
    }

    return "content";
  }

  private buildBrowserHtml(content: string): string {
    const sanitized = this.sanitizeTextContent(content);

    // Adiciona linhas em branco no final para facilitar o corte manual
    const feedLines = "\n\n\n\n\n\n\n\n";
    const withFeed = sanitized + feedLines;

    // Força um limite mais conservador para nunca vazar em 58mm
    const wrappedLines = this.wrapLines(withFeed, 38);
    const linesHtml = wrappedLines
      .map((line) => {
        const cls = this.classifyLine(line);
        return `<div class="line ${cls}">${this.escapeHtml(line)}</div>`;
      })
      .join("");

    return `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              @page {
                margin: 2mm;
              }
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                font-weight: 600;
                color: #000;
                margin: 0;
                padding: 0;
              }
              .line {
                white-space: pre;
                line-height: 1.1;
                word-break: break-word;
                overflow-wrap: anywhere;
              }
              .line.title {
                font-weight: 900;
              }
              .line.separator {
                font-weight: 700;
              }
            </style>
          </head>
          <body>${linesHtml}</body>
          </html>
        `;
>>>>>>> 46b5bdd (fix: fixed print)
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
<<<<<<< HEAD
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
=======
    if (process.platform === "win32" || process.platform === "darwin") {
      const html = this.buildBrowserHtml(content);
      return this.printWithBrowserWindow(printerName, html);
    }

    // Linux: mantém caminho raw (quando suportado)
    const feedLines = "\n\n\n\n\n\n\n\n";
    const cutCommand = "\x1D\x56\x01";
    const sanitizedContent =
      this.sanitizeTextContent(content) + feedLines + cutCommand;
    return this.printWithLp(printerName, sanitizedContent);
>>>>>>> 46b5bdd (fix: fixed print)
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
            new Error(
              `Falha ao enviar dados para a impressora: ${err.message}`,
            ),
          );
        }
        lp.stdin.end();
      });

      lp.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      lp.on("error", (error) => {
        reject(
          new Error(`Erro ao executar comando de impressão: ${error.message}`),
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
              }`,
            ),
          );
        }
      });
    });
  }

  private printWithBrowserWindow(
    printerName: string,
    content: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let isPrinting = false;
      let printWindow: BrowserWindow | null = null;
      let finished = false;

      console.log(`[WINDOWS-PRINT] Iniciando impressão para: ${printerName}`);

      try {
        // IMPORTANTE: No Windows, criar janela com webSecurity desabilitada
        // para evitar problemas com o pipeline de impressão
        printWindow = new BrowserWindow({
          show: false,
          width: 800,
          height: 600,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false, // Permite impressão sem restrições
          },
        });

<<<<<<< HEAD
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
=======
        console.log("[WINDOWS-PRINT] BrowserWindow criada");

        const htmlContent = content;
>>>>>>> 46b5bdd (fix: fixed print)

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
          console.log(
            "[WINDOWS-PRINT] Conteúdo carregado, aguardando 500ms...",
          );

          setTimeout(async () => {
            if (isPrinting || !printWindow || printWindow.isDestroyed()) {
              console.log(
                "[WINDOWS-PRINT] CANCELADO: janela destruída ou já imprimindo",
              );
              return;
            }

            isPrinting = true;
            clearTimeout(timeoutId);

            // Verificar se a impressora existe antes de imprimir
            const printers = await printWindow.webContents.getPrintersAsync();
            const printerExists = printers.some((p) => p.name === printerName);

            console.log(
              `[WINDOWS-PRINT] Impressoras disponíveis: ${printers
                .map((p) => p.name)
                .join(", ")}`,
            );
            console.log(
              `[WINDOWS-PRINT] Impressora alvo: "${printerName}" - Existe: ${printerExists}`,
            );

            if (!printerExists) {
              console.error(
                `[WINDOWS-PRINT] ❌ IMPRESSORA NÃO ENCONTRADA: ${printerName}`,
              );
              finalize(
                new Error(
                  `Impressora "${printerName}" não encontrada no sistema`,
                ),
              );
              return;
            }

            console.log(
              `[WINDOWS-PRINT] 🖨️ Enviando para impressora: ${printerName}`,
            );
            console.log(
              `[WINDOWS-PRINT] Parâmetros: silent=true, deviceName="${printerName}"`,
            );

            printWindow.webContents.print(
              {
                silent: true,
                printBackground: true, // Mudado para true
                deviceName: printerName,
                margins: {
                  marginType: "default", // Mudado para default
                },
              },
              (success, errorType) => {
                console.log(
                  `[WINDOWS-PRINT] Callback recebido: success=${success}, errorType=${errorType}`,
                );

                if (!success) {
                  console.error(
                    "[WINDOWS-PRINT] ❌ Erro ao imprimir:",
                    errorType,
                  );
                  finalize(
                    new Error(
                      `Falha ao imprimir: ${errorType || "Erro desconhecido"}`,
                    ),
                  );
                  return;
                }

                console.log(
                  `[WINDOWS-PRINT] ✓ Callback retornou SUCCESS para ${printerName}`,
                );

                // CRÍTICO: No Windows, o callback retorna ANTES que o job
                // seja realmente processado pela fila da impressora.
                // Manter a janela aberta por 5 SEGUNDOS para garantir que
                // o Windows processe completamente o job de impressão.
                //
                // Alguns drivers de impressora (como ELGIN) precisam de mais
                // tempo para processar o job corretamente.
                console.log(
                  "[WINDOWS-PRINT] ⏳ Aguardando 5 SEGUNDOS para Windows processar job...",
                );
                console.log("[WINDOWS-PRINT] (NÃO feche a janela, aguarde...)");

                setTimeout(() => {
                  console.log("[WINDOWS-PRINT] ✓ Delay de 5s concluído!");
                  console.log(
                    "[WINDOWS-PRINT] Finalizando e fechando janela...",
                  );
                  finalize();
                }, 5000); // 5 SEGUNDOS - tempo extra para drivers lentos como ELGIN
              },
            );
          }, 500); // 500ms de delay crítico para Windows
        });

        printWindow.on("closed", () => {
          printWindow = null;
        });

        printWindow.loadURL(
          `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`,
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
======================================
        TESTE DE IMPRESSÃO
======================================

Estação: ${stationName}
Data/Hora: ${new Date().toLocaleString("pt-BR")}
Impressora: ${printerName}

Este é um teste de impressão do 
Emissor de pedidos ByRake.

Se você está lendo isto, a impressão
está funcionando corretamente!

======================================







`;

    return this.print(printerName, testContent);
  }
}

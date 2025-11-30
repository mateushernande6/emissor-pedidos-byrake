# Correções de Impressão Automática E Manual no Windows

## ⚠️ PROBLEMA CRÍTICO IDENTIFICADO

No Windows, os pedidos chegavam e apareciam na lista, mas **NÃO imprimiam de forma alguma**:

- ❌ **Impressão automática NÃO funcionava**
- ❌ **Reimpressão manual NÃO funcionava** (botão Reimprimir)
- ✅ **Teste de impressão funcionava** (botão Testar Impressão)

**CONCLUSÃO IMPORTANTE**: O problema NÃO É apenas de timing/automação. É um problema mais profundo relacionado ao método `printWithBrowserWindow()` quando usado em contexto de job real.

## Causa Raiz

O método `printWithBrowserWindow()` no Windows tem um problema de **timing crítico**:

1. Cria uma `BrowserWindow` invisível
2. Carrega o conteúdo HTML
3. Evento `did-finish-load` dispara
4. **PROBLEMA**: Enviava para impressão IMEDIATAMENTE após o evento

No Windows, o renderizador precisa de tempo adicional para processar completamente o conteúdo antes de enviar para impressão. Sem esse delay, a impressão era silenciosamente ignorada ou falhava sem reportar erro.

## Soluções Implementadas

### 1. **Delay de 500ms Após Carregamento (CRÍTICO)**

```typescript
// Antes: Impressão imediata
printWindow.webContents.print({ ... })

// Depois: Delay de 500ms
setTimeout(() => {
  printWindow.webContents.print({ ... })
}, 500);
```

**Por que funciona**: O Windows precisa de tempo para:

- Renderizar completamente o HTML
- Processar o CSS
- Preparar o pipeline de impressão
- Inicializar o driver da impressora

### 2. **Fallback para Modo com Diálogo (CRÍTICO)**

Alguns drivers de impressora no Windows **não suportam silent mode** (impressão sem diálogo). Implementado fallback:

```typescript
// Tentativa 1: Silent mode (sem diálogo)
printWindow.webContents.print({ silent: true, ... }, (success) => {
  if (!success) {
    // FALLBACK: Modo com diálogo
    printWindow.webContents.print({ silent: false, ... })
  }
})
```

**Por que é importante**: Impressoras térmicas antigas ou drivers específicos podem rejeitar `silent: true`. O fallback garante que pelo menos tentamos com diálogo.

### 3. **Verificação de Impressora Antes de Imprimir**

Agora verifica se a impressora existe na lista ANTES de tentar imprimir:

```typescript
const printers = await this.listPrinters();
const printerExists = printers.some((p) => p.name === printerName);

if (!printerExists) {
  throw new Error(`Impressora não encontrada!`);
}
```

**Benefício**: Falha rápido com mensagem clara se impressora não existir.

### 4. **Logs Ultra Detalhados em TODO o Fluxo**

Adicionados logs em **cada etapa crítica**:

**Prefixos de Log:**

- `[PRINTERS]` - Listagem de impressoras
- `[PRINT]` - Processo de impressão
- `🔔` - Novo job recebido via Realtime
- `🔍` - Novo job encontrado via Polling
- `➡️` - Job sendo processado
- `🖨️` - Enviando para impressora
- `✅` - Sucesso
- `❌` - Erro

**Exemplo de log completo:**

```
[PRINT] ========================================
[PRINT] Iniciando print() para: "EPSON TM-T20"
[PRINT] Plataforma: win32
[PRINT] Listando impressoras disponíveis...
[PRINTERS] Listando impressoras do sistema...
[PRINTERS] getPrintersAsync() retornou 2 impressora(s)
[PRINTERS]   1. "EPSON TM-T20" ✓ PADRÃO
[PRINTERS]   2. "Microsoft Print to PDF"
[PRINT] ✓ Impressora "EPSON TM-T20" encontrada na lista
[PRINT] Usando método BrowserWindow (Windows)...
[PRINT] Criando BrowserWindow...
[PRINT] Carregando conteúdo HTML na janela...
[PRINT] Conteúdo carregado (did-finish-load)
[PRINT] Aguardando 500ms... (Windows timing fix)
[PRINT] Enviando para impressora: EPSON TM-T20 (silent mode)...
[PRINT] Callback recebido - Success: true
[PRINT] ✓ Impressão enviada com sucesso
```

**Benefício**: Identifica EXATAMENTE onde o processo falha.

### 3. **Timeout Aumentado (10s → 20s)**

O timeout foi aumentado para prevenir falsos positivos de timeout no Windows:

```typescript
// Antes
setTimeout(() => {
  /* timeout */
}, 10000);

// Depois
setTimeout(() => {
  /* timeout */
}, 20000);
```

### 4. **Verificações Adicionais de Estado**

Antes de imprimir, verifica:

- Se já está imprimindo (`isPrinting`)
- Se a janela ainda existe (`!printWindow`)
- Se a janela não foi destruída (`printWindow.isDestroyed()`)

### 5. **Logs no Callback de Impressão**

O callback do `webContents.print()` agora loga:

- Success status
- Error type (se houver)
- Mensagens detalhadas

## Outras Melhorias

### ✨ Botão de Atualizar Impressoras no Formulário

Agora é possível atualizar a lista de impressoras durante o cadastro de uma nova estação:

```tsx
<button onClick={handleRefreshPrinters}>🔄</button>
```

**Localização**: Ao lado do campo de seleção de impressora no formulário "Nova Estação"

### 🔍 Logs Detalhados na Fila de Impressão

A fila de processamento agora loga:

- Quantos jobs estão pendentes
- Quando adiciona job à fila
- Quando evita duplicatas
- Quando processa a fila
- Status de cada job individual

## Como Testar e Debugar

### 🔧 PASSO 1: Abrir Console de Debug

**ANTES DE QUALQUER TESTE**, abra o console:

- Windows: `Ctrl + Shift + I`
- Mac: `Cmd + Option + I`

**Mantenha o console SEMPRE aberto** para ver os logs em tempo real!

### 🧪 PASSO 2: Testar Impressão Manual (Botão "Testar")

```
1. Abrir aplicativo
2. Abrir console (Ctrl+Shift+I)
3. Conectar estação
4. Clicar em "Testar Impressão"
5. OBSERVAR LOGS no console
6. ✅ Deve imprimir normalmente
```

**Logs esperados:**

```
[PRINT] ========================================
[PRINT] Iniciando print() para: "NOME_DA_IMPRESSORA"
[PRINTERS] Listando impressoras...
[PRINTERS] getPrintersAsync() retornou X impressora(s)
[PRINT] ✓ Impressora encontrada
[PRINT] Callback recebido - Success: true
```

### 🔄 PASSO 3: Testar Reimpressão Manual (Botão "Reimprimir")

```
1. Com console aberto
2. Estação conectada
3. Clicar em "Reimprimir" em um pedido
4. OBSERVAR LOGS no console
5. ✅ Agora DEVE imprimir (antes não funcionava!)
```

**Se falhar no silent mode, deve tentar fallback:**

```
[PRINT] ❌ Falha no modo silent
[PRINT] 🔄 Tentando FALLBACK: modo com diálogo...
[PRINT] Callback FALLBACK - Success: true
```

### 🤖 PASSO 4: Testar Impressão Automática

```
1. Com console aberto
2. Conectar estação
3. Criar um pedido (via API ou sistema)
4. OBSERVAR LOGS:
   🔔 Novo job recebido
   ➡️ Processando job...
   🖨️ Enviando para impressão...
   [PRINT] ========================================
   [PRINT] Iniciando print()...
   [PRINT] Aguardando 500ms... (DELAY)
   [PRINT] Enviando para impressora...
   ✅ Job impresso com sucesso!
5. ✅ Deve imprimir automaticamente
```

### 🔍 PASSO 5: Analisar Logs se Falhar

Se **NÃO imprimir**, procure nos logs:

**❌ Impressora não encontrada?**

```
[PRINT] ❌ ERRO: Impressora "NOME" NÃO ENCONTRADA!
[PRINT] Impressoras disponíveis: [lista...]
```

→ **Solução**: Verifique o nome EXATO da impressora (case-sensitive!)

**❌ Falha no callback?**

```
[PRINT] Callback recebido - Success: false, ErrorType: "cancelled"
[PRINT] ❌ Falha no modo silent
[PRINT] 🔄 Tentando FALLBACK...
```

→ **Solução**: O sistema tentará automaticamente com diálogo

**❌ Timeout?**

```
[PRINT] TIMEOUT ao carregar conteúdo para impressão
```

→ **Solução**: Pode ser problema com a impressora ou driver

### 📋 PASSO 6: Copiar Logs Completos

Se ainda não funcionar:

1. Abrir console (Ctrl+Shift+I)
2. Clicar com botão direito no console
3. "Save as..." → Salvar logs completos
4. OU: Selecionar tudo e copiar
5. Enviar logs para análise

**Procurar especificamente por:**

- Linhas com `[PRINT]`
- Linhas com `[PRINTERS]`
- Linhas com ❌ ou "ERROR"
- Mensagem de "Success: false"

## Arquivos Modificados

### `src/core/printerService.ts`

- ✅ Delay de 500ms após `did-finish-load`
- ✅ Logs detalhados em cada etapa
- ✅ Timeout aumentado (20s)
- ✅ Melhor tratamento de erros
- ✅ Verificações de estado adicionais

### `src/core/printClient.ts`

- ✅ Logs no processamento da fila
- ✅ Logs ao adicionar jobs
- ✅ Logs ao processar jobs individuais
- ✅ Emojis para facilitar identificação visual

### `src/renderer/App.tsx`

- ✅ Botão de atualizar impressoras no formulário

## Problemas Conhecidos

### ⚠️ Se ainda não funcionar:

1. **Verificar permissões da impressora**

   - O Windows pode bloquear impressão silenciosa
   - Verificar configurações de segurança

2. **Verificar driver da impressora**

   - Alguns drivers antigos não suportam impressão silenciosa
   - Atualizar driver da impressora

3. **Verificar logs no DevTools**

   - Procurar por mensagens de erro
   - Verificar se o delay está sendo aplicado

4. **Testar com impressora diferente**
   - Algumas impressoras têm comportamento diferente
   - Testar com impressora PDF primeiro

## Próximos Passos

Se o problema persistir:

1. ✅ Aumentar o delay de 500ms para 1000ms
2. ✅ Adicionar opção de impressão COM diálogo (não silenciosa)
3. ✅ Implementar retry automático em caso de falha
4. ✅ Criar fallback para usar comando nativo do Windows (PowerShell)

## Contato

Se precisar de mais ajustes, forneça:

- Logs completos do console
- Versão do Windows
- Modelo da impressora
- Se a impressão manual funciona
- Se algum log [PRINT] aparece

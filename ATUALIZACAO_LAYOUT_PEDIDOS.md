# ✅ ATUALIZAÇÃO: Layout e Filtro de Pedidos

## 🎯 Problemas Resolvidos

### 1. ✅ Pedidos Agora Aparecem na Interface

**Problema:** Pedidos eram impressos mas não apareciam na lista  
**Solução:** Migration aplicada adicionando campo `order_status` à tabela `print_jobs`

### 2. ✅ Apenas Pedidos de Hoje

**Problema:** Mostrava pedidos de todos os dias  
**Solução:** Filtro automático para exibir apenas pedidos criados hoje (após 00:00:00)

### 3. ✅ Layout Reorganizado

**Problema:** Lista de pedidos estava espremida entre outras seções  
**Solução:** Sidebar dedicada na lateral direita ocupando toda a altura da tela

---

## 🆕 Novo Layout

### Estrutura de 3 Colunas

```
┌─────────────────────────────────────────────────────────────┐
│                   HEADER (Status/Conexão)                   │
├────────────┬───────────────────────┬────────────────────────┤
│            │                       │                        │
│  CONFIG    │   INFO ESTAÇÃO       │    PEDIDOS DE HOJE    │
│  (380px)   │   + LOGS             │    (Sidebar 420px)    │
│            │   (flex 1)           │                        │
│            │                       │ [ Todos (5) ]...       │
│            │                       │                        │
│            │                       │ ╭──────────────────╮  │
│            │                       │ │ Pedido #123      │  │
│            │                       │ │ [Recebido]       │  │
│            │                       │ ╰──────────────────╯  │
│            │                       │                        │
│            │                       │ ╭──────────────────╮  │
│            │                       │ │ Pedido #124      │  │
│            │                       │ │ [Em Preparo]     │  │
│            │                       │ ╰──────────────────╯  │
│            │                       │                        │
│            │                       │      (Scroll...)       │
│            │                       │                        │
└────────────┴───────────────────────┴────────────────────────┘
```

### Vantagens do Novo Layout

- ✅ **Sidebar dedicada** - Pedidos têm espaço próprio
- ✅ **Altura total** - Usa 100% da altura disponível
- ✅ **Mais visibilidade** - Cards maiores e mais legíveis
- ✅ **Scroll independente** - Rola apenas a lista de pedidos
- ✅ **Design limpo** - Separação visual clara

---

## 🔧 Alterações Técnicas

### 1. Banco de Dados (Migration Aplicada)

```sql
-- Campos adicionados
ALTER TABLE print_jobs
ADD COLUMN order_status order_status DEFAULT 'recebido';

ALTER TABLE print_jobs
ADD COLUMN order_status_updated_at TIMESTAMPTZ;

-- ENUM criado
CREATE TYPE order_status AS ENUM (
  'recebido',
  'em_preparo',
  'pronto',
  'entregue'
);
```

**Status:** ✅ Migration aplicada com sucesso via MCP

### 2. Filtro de Data (Apenas Hoje)

**Arquivo:** `src/core/supabaseClient.ts`

```typescript
async getRecentJobs(stationId: string, limit: number = 50): Promise<PrintJob[]> {
  // Pega início do dia de hoje (00:00:00)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const { data, error } = await this.client
    .from("print_jobs")
    .select("*")
    .eq("station_id", stationId)
    .eq("status", "printed")
    .gte("created_at", todayISO) // ← FILTRO DE HOJE
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data as PrintJob[]) || [];
}
```

**Resultado:** Apenas pedidos criados após 00:00:00 de hoje aparecem

### 3. Layout CSS Atualizado

**Arquivo:** `src/renderer/styles.css`

```css
/* Nova estrutura de 3 colunas */
.content {
  display: flex;
  gap: 1rem;
}

.main-content {
  display: flex;
  flex: 1;
  gap: 1rem;
}

.left-panel {
  flex: 0 0 380px; /* Configuração */
}

.right-panel {
  flex: 1; /* Info + Logs */
}

.orders-sidebar {
  flex: 0 0 420px; /* Pedidos - Lateral direita */
  height: 100%;
}

.orders-list {
  flex: 1;
  overflow-y: auto; /* Scroll apenas na lista */
}
```

### 4. Componente React Reorganizado

**Arquivo:** `src/renderer/App.tsx`

Estrutura anterior:

```
content
  ├── left-panel (config)
  └── right-panel (info + pedidos + logs)
```

Estrutura nova:

```
content
  ├── main-content
  │   ├── left-panel (config)
  │   └── right-panel (info + logs)
  └── orders-sidebar (pedidos - altura total)
```

---

## 🚀 Como Testar

### 1. Rebuild e Iniciar

```bash
cd electron-printer-client
yarn dev
```

### 2. Conectar

1. Token: `estacao-bar-001`
2. Clicar em "Conectar"
3. Aguardar status verde

### 3. Criar Pedido de Teste HOJE

```sql
-- No Supabase SQL Editor
INSERT INTO print_jobs (station_id, payload, status)
VALUES (
  '5766dc3e-14a3-41e9-9eaf-710c6d10777b',
  'PEDIDO TESTE #' || FLOOR(RANDOM() * 1000) || '

Mesa: ' || FLOOR(RANDOM() * 20 + 1) || '
Garçom: João

2x Cerveja - R$ 24,00
1x Batata - R$ 35,00

TOTAL: R$ 59,00

' || NOW()::TEXT,
  'pending'
);
```

### 4. Verificar

- ✅ Pedido imprime automaticamente (em até 3s)
- ✅ Aparece na sidebar direita "Pedidos de Hoje"
- ✅ Card azul com status "Recebido"
- ✅ Pode atualizar status
- ✅ Pode reimprimir

---

## 📊 Comportamento por Horário

### Meia-noite (00:00:00)

- Lista de pedidos **limpa automaticamente**
- Pedidos de ontem não aparecem mais
- Apenas pedidos criados hoje são exibidos

### Durante o Dia

- Todos os pedidos impressos hoje aparecem
- Lista atualiza a cada 10 segundos
- Ordenação: mais recente primeiro

### Exemplo

**Dia 21/11/2024 às 14:00:**

- ✅ Mostra pedidos de 21/11/2024 00:00 até agora
- ❌ NÃO mostra pedidos de 20/11/2024

**Dia 22/11/2024 às 00:01:**

- ✅ Lista zerada
- ✅ Apenas novos pedidos de 22/11 aparecem

---

## 🎨 Visual Atualizado

### Sidebar de Pedidos

- **Largura:** 420px (fixa)
- **Altura:** 100% da tela (menos header)
- **Background:** Branco
- **Scroll:** Apenas na lista interna
- **Cards:** Mais espaçosos e legíveis

### Cores dos Status

| Status     | Cor               | Visual          |
| ---------- | ----------------- | --------------- |
| Recebido   | Azul (#3b82f6)    | 🔵 Card azul    |
| Em Preparo | Laranja (#f59e0b) | 🟠 Card laranja |
| Pronto     | Verde (#22c55e)   | 🟢 Card verde   |
| Entregue   | Cinza (#6b7280)   | ⚪ Card cinza   |

### Tabs de Filtro

```
[ Todos (8) ] [ Recebido (3) ] [ Em Preparo (3) ] [ Pronto (2) ] [ Entregue (0) ]
```

- Tabs compactas (0.4rem padding)
- Ativa: azul
- Inativa: cinza claro
- Contador atualiza automaticamente

---

## 🔍 Troubleshooting

### Pedidos Não Aparecem

**Possível causa:** Jobs antigos sem `order_status`

**Solução:** Atualizar jobs antigos:

```sql
UPDATE print_jobs
SET order_status = 'recebido'
WHERE order_status IS NULL;
```

### Pedidos de Ontem Aparecem

**Possível causa:** Cache do navegador

**Solução:**

1. Desconectar e reconectar
2. Ou recarregar a página (Cmd+R / Ctrl+R)

### Layout Quebrado

**Possível causa:** Build antigo

**Solução:**

```bash
yarn build
yarn dev
```

---

## 📝 Consultas SQL Úteis

### Ver Todos os Pedidos de Hoje

```sql
SELECT
  id,
  created_at,
  order_status,
  LEFT(payload, 50) as preview
FROM print_jobs
WHERE DATE(created_at) = CURRENT_DATE
  AND status = 'printed'
ORDER BY created_at DESC;
```

### Estatísticas de Hoje

```sql
SELECT
  order_status,
  COUNT(*) as total,
  MIN(created_at) as primeiro,
  MAX(created_at) as ultimo
FROM print_jobs
WHERE DATE(created_at) = CURRENT_DATE
  AND status = 'printed'
GROUP BY order_status
ORDER BY total DESC;
```

### Limpar Pedidos Antigos (Opcional)

```sql
-- CUIDADO: Remove pedidos de mais de 30 dias
DELETE FROM print_jobs
WHERE created_at < NOW() - INTERVAL '30 days';
```

---

## ✅ Checklist de Funcionamento

- [x] Migration aplicada no banco
- [x] Campo `order_status` existe em `print_jobs`
- [x] Filtro de data implementado (apenas hoje)
- [x] Layout reorganizado (sidebar direita)
- [x] Lista ocupa altura total
- [x] Scroll independente
- [x] Atualização automática (10s)
- [x] Build compilado com sucesso

---

## 🎉 RESUMO

### Antes ❌

- Pedidos não apareciam (sem `order_status`)
- Mostrava pedidos de todos os dias
- Layout apertado entre outras seções
- Pouca visibilidade

### Depois ✅

- Pedidos aparecem corretamente
- Apenas pedidos de **hoje**
- Sidebar dedicada na **lateral direita**
- **Altura total** da tela
- Visual limpo e organizado

---

**Sistema totalmente funcional! Execute `yarn dev` e teste! 🚀**

# 🔴 STATUS CANCELADO (CORRIGIDO) - Documentação

## ✅ CORREÇÃO IMPORTANTE

O status "cancelado" **NÃO é um `order_status`**, mas sim um valor do campo **`status`** (PrintJobStatus) na tabela `print_jobs`.

### Campo Correto: `status` (não `order_status`)

```sql
-- ENUM: print_job_status
'pending' | 'printing' | 'printed' | 'error' | 'cancelled'
                                                  ^^^^^^^^
                                                  Usar este!
```

---

## 🎯 Como Funciona

### 1. Dois Campos Diferentes

| Campo          | Tipo               | Valores                                          | Uso                         |
| -------------- | ------------------ | ------------------------------------------------ | --------------------------- |
| `status`       | `print_job_status` | pending, printing, printed, error, **cancelled** | Status do JOB de impressão  |
| `order_status` | `order_status`     | recebido, em_preparo, pronto, entregue           | Status do PEDIDO na cozinha |

### 2. Pedidos Cancelados

Um pedido cancelado tem:

- ✅ `status = 'cancelled'`
- ✅ `order_status` = qualquer valor (recebido, em_preparo, etc.)
- ✅ Não é processado pela impressora
- ✅ Não pode ter o order_status alterado

---

## 🎨 Visual do Card Cancelado

### Card Vermelho com Status Travado

```
┌──────────────────────────────┐
│ 🔴 CARD VERMELHO CLARO       │
│ ▌ Borda vermelha             │
│                              │
│ 21/11/2024 15:30  [Cancelado]│
│                              │
│ ┌──────────────────────────┐ │
│ │ PEDIDO #999              │ │
│ │ Mesa: 10                 │ │
│ │ Cliente cancelou         │ │
│ └──────────────────────────┘ │
│                              │
│ Cancelado (Status Travado) 🚫│
│ (Sem dropdown)               │
│                              │
│ [🖨️ Reimprimir] (ativo)      │
└──────────────────────────────┘
```

---

## 🔧 Implementação Técnica

### 1. TypeScript Types

**Arquivo:** `src/core/types.ts`

```typescript
// Status do JOB (impressão física)
export type PrintJobStatus =
  | "pending" // Aguardando impressão
  | "printing" // Imprimindo
  | "printed" // Impresso com sucesso
  | "error" // Erro na impressão
  | "cancelled"; // ← CANCELADO

// Status do PEDIDO (fluxo da cozinha)
export type OrderStatus = "recebido" | "em_preparo" | "pronto" | "entregue";
```

### 2. Consulta no Banco

**Buscar pedidos impressos E cancelados:**

```typescript
// src/core/supabaseClient.ts
const { data } = await this.client
  .from("print_jobs")
  .select("*")
  .eq("station_id", stationId)
  .in("status", ["printed", "cancelled"]) // ← Inclui ambos
  .gte("created_at", todayISO)
  .order("created_at", { ascending: false });
```

### 3. Renderização Condicional

**Arquivo:** `src/renderer/App.tsx`

```tsx
// Classe CSS dinâmica
<div
  className={`order-card ${
    job.status === "cancelled"
      ? "status-cancelado"           // ← Card vermelho
      : `status-${job.order_status}` // ← Cor normal
  }`}
>

// Badge condicional
<span
  className="order-status-badge"
  style={{
    backgroundColor: job.status === "cancelled"
      ? "#ef4444"                      // ← Vermelho
      : getStatusColor(job.order_status) // ← Cor normal
  }}
>
  {job.status === "cancelled"
    ? "Cancelado"                      // ← Mostra "Cancelado"
    : getStatusLabel(job.order_status) // ← Mostra status normal
  }
</span>

// Dropdown travado ou ativo
{job.status === "cancelled" ? (
  // Se cancelado: mostra texto fixo (não editável)
  <div style={{ opacity: 0.5, cursor: "not-allowed" }}>
    Cancelado (Status Travado)
  </div>
) : (
  // Se não cancelado: dropdown normal
  <select value={job.order_status} onChange={...}>
    <option value="recebido">Recebido</option>
    <option value="em_preparo">Em Preparo</option>
    <option value="pronto">Pronto</option>
    <option value="entregue">Entregue</option>
  </select>
)}
```

### 4. Tab "Cancelado"

```tsx
// Contador
<button onClick={() => setSelectedTab("cancelado")}>
  Cancelado ({jobs.filter((j) => j.status === "cancelled").length})
</button>;

// Filtro
{
  jobs.filter(
    (job) =>
      selectedTab === "all" ||
      (selectedTab === "cancelado" && job.status === "cancelled") ||
      job.order_status === selectedTab
  );
}
```

---

## 📊 Fluxo Completo

### Cenário 1: Pedido Normal

```
1. INSERT status='pending', order_status='recebido'
   ↓
2. Cliente imprime → status='printed'
   ↓
3. Card AZUL aparece (order_status='recebido')
   ↓
4. Usuário muda para order_status='em_preparo'
   ↓
5. Card muda para LARANJA
   ↓
6. ... até 'entregue' (CINZA)
```

### Cenário 2: Pedido Cancelado

```
1. INSERT status='pending', order_status='recebido'
   ↓
2. Cliente cancela antes de imprimir
   ↓
3. UPDATE status='cancelled'
   ↓
4. Card VERMELHO aparece
   ↓
5. Dropdown DESABILITADO (não pode mudar order_status)
   ↓
6. Fica na tab "Cancelado" permanentemente
```

### Cenário 3: Cancelar Pedido Em Preparo

```
1. Pedido criado → status='printed', order_status='em_preparo'
   ↓
2. Card LARANJA na lista
   ↓
3. Problema na cozinha → cancela manualmente:
   UPDATE print_jobs SET status='cancelled' WHERE id=...
   ↓
4. Card muda de LARANJA → VERMELHO
   ↓
5. Dropdown desaparece (travado como "Cancelado")
   ↓
6. order_status continua 'em_preparo' (mas não importa mais)
```

---

## 🧪 Como Testar

### 1. Criar Pedido Cancelado

```sql
-- No Supabase SQL Editor
INSERT INTO print_jobs (station_id, payload, status, order_status)
VALUES (
  (SELECT id FROM print_stations WHERE token = 'estacao-bar-teste-001'),
  'PEDIDO CANCELADO #999

Mesa: 10
Cliente solicitou cancelamento

1x Pizza - R$ 45,00

TOTAL: R$ 45,00',
  'cancelled',  -- ← Status = cancelled
  'recebido'    -- ← order_status qualquer (não importa)
);
```

### 2. Resultado Esperado

- 🔴 **Card vermelho** aparece na lista
- 🏷️ **Badge "Cancelado"** em vermelho
- 🚫 **Sem dropdown** (mostra "Cancelado (Status Travado)")
- 📊 **Tab "Cancelado"** contador aumenta
- 🖨️ **Botão reimprimir** ainda funciona

### 3. Cancelar Pedido Existente

```sql
-- Cancelar um pedido que já foi impresso
UPDATE print_jobs
SET status = 'cancelled'
WHERE id = '<job-id>';
```

**Resultado:**

- Card muda cor imediatamente (ex: de azul → vermelho)
- Dropdown desaparece
- Vai para tab "Cancelado"

---

## 📝 SQL Queries Úteis

### Ver Todos os Cancelados de Hoje

```sql
SELECT
  id,
  created_at,
  status,        -- ← Deve ser 'cancelled'
  order_status,  -- ← Pode ser qualquer um
  LEFT(payload, 50) as preview
FROM print_jobs
WHERE DATE(created_at) = CURRENT_DATE
  AND status = 'cancelled'  -- ← Filtrar por status, não order_status
ORDER BY created_at DESC;
```

### Estatísticas de Cancelamento

```sql
SELECT
  DATE(created_at) as data,
  COUNT(*) as total_cancelados,
  COUNT(*) FILTER (WHERE order_status = 'recebido') as cancelados_recebido,
  COUNT(*) FILTER (WHERE order_status = 'em_preparo') as cancelados_preparo,
  COUNT(*) FILTER (WHERE order_status = 'pronto') as cancelados_pronto
FROM print_jobs
WHERE status = 'cancelled'
GROUP BY DATE(created_at)
ORDER BY data DESC
LIMIT 7;
```

### Pedidos por Status (Hoje)

```sql
SELECT
  CASE
    WHEN status = 'cancelled' THEN 'Cancelado'
    ELSE order_status
  END as status_final,
  COUNT(*) as total
FROM print_jobs
WHERE DATE(created_at) = CURRENT_DATE
  AND status IN ('printed', 'cancelled')
GROUP BY status_final
ORDER BY total DESC;
```

### Cancelar Pedido Manualmente

```sql
-- Cancelar um pedido específico
UPDATE print_jobs
SET status = 'cancelled'
WHERE id = '<job-id>';

-- Não precisa mudar order_status
-- Ele fica travado automaticamente
```

---

## ✅ Diferenças: ANTES vs DEPOIS

### ❌ ANTES (ERRADO)

```typescript
// ERRADO: Tentava adicionar ao order_status
export type OrderStatus =
  | "recebido"
  | "em_preparo"
  | "pronto"
  | "entregue"
  | "cancelado"; // ← ERRADO!

// Verificava order_status
if (job.order_status === "cancelado") // ← ERRADO!
```

### ✅ DEPOIS (CORRETO)

```typescript
// CORRETO: Usa o campo status
export type PrintJobStatus =
  | "pending"
  | "printing"
  | "printed"
  | "error"
  | "cancelled"; // ← CORRETO!

// Verifica status (não order_status)
if (job.status === "cancelled") // ← CORRETO!
```

---

## 🎯 Regras de Negócio

### Quando `status === 'cancelled'`:

1. ✅ Card fica **vermelho claro** (#fee2e2)
2. ✅ Badge mostra **"Cancelado"** em vermelho
3. ✅ Dropdown é **substituído por texto** "Cancelado (Status Travado)"
4. ✅ **Não pode alterar** order_status
5. ✅ Aparece na **tab "Cancelado"**
6. ✅ Contador da tab atualiza
7. ✅ **Botão reimprimir** continua funcionando
8. ✅ `order_status` fica **congelado** (qualquer valor que estava)

### Quando `status !== 'cancelled'`:

1. ✅ Card usa cor de `order_status` (azul, laranja, verde, cinza)
2. ✅ Badge mostra label do `order_status`
3. ✅ Dropdown **ativo** para alterar order_status
4. ✅ Pode mudar livremente entre status
5. ✅ Aparece nas tabs normais (Recebido, Em Preparo, etc.)

---

## 📦 Arquivos Alterados

1. **`src/core/types.ts`**

   - `PrintJobStatus` + "cancelled"
   - `OrderStatus` sem "cancelado"

2. **`src/core/supabaseClient.ts`**

   - `getRecentJobs()` com `.in("status", ["printed", "cancelled"])`

3. **`src/renderer/App.tsx`**

   - `selectedTab` aceita "cancelado"
   - Filtro por `job.status === "cancelled"`
   - Classe CSS condicional
   - Badge condicional
   - Dropdown condicional (removido quando cancelado)

4. **`src/renderer/styles.css`**
   - `.status-cancelado` (vermelho)
   - Estilos já estavam corretos

---

## ✅ Checklist Final

- [x] Tipo `PrintJobStatus` inclui "cancelled"
- [x] Tipo `OrderStatus` NÃO inclui "cancelado"
- [x] Query busca `status IN ('printed', 'cancelled')`
- [x] Tab "Cancelado" filtra por `job.status === "cancelled"`
- [x] Card usa classe `status-cancelado` quando cancelado
- [x] Badge mostra "Cancelado" quando `status === "cancelled"`
- [x] Dropdown substituído por texto quando cancelado
- [x] Build compilado com sucesso

---

## 🚀 PRONTO PARA USAR!

### Teste Rápido

```sql
-- 1. Criar pedido cancelado
INSERT INTO print_jobs (station_id, payload, status, order_status)
VALUES (
  (SELECT id FROM print_stations WHERE token = 'estacao-bar-teste-001'),
  'TESTE CANCELADO\nMesa: 10',
  'cancelled',  -- ← Chave: usar status
  'recebido'
);

-- 2. Ver resultado
-- ✅ Card vermelho
-- ✅ Badge "Cancelado"
-- ✅ Sem dropdown (travado)
-- ✅ Na tab "Cancelado"
```

---

## 🎉 RESUMO

### Campo Correto

- ✅ Usar `status = 'cancelled'`
- ❌ NÃO usar `order_status = 'cancelado'`

### Onde Verificar

- ✅ `job.status === "cancelled"`
- ❌ NÃO `job.order_status === "cancelado"`

### Enum Correto

- ✅ `print_job_status` (status da impressão)
- ❌ NÃO `order_status` (status da cozinha)

---

**Sistema 100% funcional com campo correto! 🔴✅**

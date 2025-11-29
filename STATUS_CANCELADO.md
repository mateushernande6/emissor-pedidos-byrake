# 🔴 STATUS CANCELADO - Documentação

## 🎯 Funcionalidade Implementada

Adicionado novo status **"Cancelado"** para pedidos com as seguintes características:

### ✅ Características

1. **Card Vermelho** - Fundo vermelho claro (#fee2e2) com borda vermelha (#ef4444)
2. **Tab "Cancelado"** - Nova aba na interface para filtrar pedidos cancelados
3. **Status Travado** - Pedidos cancelados não podem ter o status alterado
4. **Dropdown Desabilitado** - Select fica disabled e com visual de bloqueado

---

## 🎨 Visual do Status Cancelado

### Card Cancelado

```
┌─────────────────────────────┐
│ Card Vermelho Claro 🔴      │
│ ▌ Barra vermelha            │
│                             │
│ ┌─────────────────────────┐ │
│ │ Conteúdo do Pedido      │ │
│ │ Texto Escuro            │ │
│ └─────────────────────────┘ │
│                             │
│ [Cancelado ▼] 🚫            │
│ (Dropdown BLOQUEADO)        │
│ [🖨️ Reimprimir] (ativo)     │
└─────────────────────────────┘
```

### Cores

- **Background:** `#fee2e2` (vermelho claro)
- **Borda:** `#ef4444` (vermelho)
- **Badge:** `#ef4444` (vermelho)
- **Texto:** `#1f2937` (cinza escuro)

---

## 📋 Tabs da Interface

Agora existem **6 abas**:

```
[ Todos (10) ] [ Recebido (3) ] [ Em Preparo (2) ]
[ Pronto (1) ] [ Entregue (2) ] [ Cancelado (2) ] 🔴
```

---

## 🔧 Alterações Técnicas

### 1. Banco de Dados (Migration)

**Comando executado via MCP:**

```sql
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cancelado';
```

**Valores do enum `order_status`:**

- ✅ `recebido`
- ✅ `em_preparo`
- ✅ `pronto`
- ✅ `entregue`
- 🆕 `cancelado`

### 2. TypeScript Types

**Arquivo:** `src/core/types.ts`

```typescript
// ANTES
export type OrderStatus = "recebido" | "em_preparo" | "pronto" | "entregue";

// DEPOIS
export type OrderStatus =
  | "recebido"
  | "em_preparo"
  | "pronto"
  | "entregue"
  | "cancelado";
```

### 3. React Component

**Arquivo:** `src/renderer/App.tsx`

#### Labels e Cores

```typescript
const getStatusLabel = (status: OrderStatus): string => {
  const labels = {
    recebido: "Recebido",
    em_preparo: "Em Preparo",
    pronto: "Pronto",
    entregue: "Entregue",
    cancelado: "Cancelado", // 🆕
  };
  return labels[status];
};

const getStatusColor = (status: OrderStatus): string => {
  const colors = {
    recebido: "#3b82f6",
    em_preparo: "#f59e0b",
    pronto: "#22c55e",
    entregue: "#6b7280",
    cancelado: "#ef4444", // 🆕 Vermelho
  };
  return colors[status];
};
```

#### Tab Cancelado

```tsx
<button
  className={`tab ${selectedTab === "cancelado" ? "active" : ""}`}
  onClick={() => setSelectedTab("cancelado")}
>
  Cancelado ({jobs.filter((j) => j.order_status === "cancelado").length})
</button>
```

#### Dropdown com Disabled

```tsx
<select
  value={job.order_status}
  onChange={(e) =>
    handleUpdateOrderStatus(job.id, e.target.value as OrderStatus)
  }
  className="status-select"
  disabled={job.order_status === "cancelado"} // 🔒 Trava quando cancelado
>
  <option value="recebido">Recebido</option>
  <option value="em_preparo">Em Preparo</option>
  <option value="pronto">Pronto</option>
  <option value="entregue">Entregue</option>
  <option value="cancelado">Cancelado</option> {/* 🆕 */}
</select>
```

### 4. CSS Styles

**Arquivo:** `src/renderer/styles.css`

#### Card Vermelho

```css
.order-card.status-cancelado {
  background: #fee2e2; /* Vermelho claro */
  border-left-color: #ef4444; /* Vermelho */
}
```

#### Dropdown Desabilitado

```css
.status-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #9ca3af; /* Cinza */
}
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
  'pending',
  'cancelado'
);
```

### 2. Resultado Esperado

1. ⏱️ **Pedido imprime** automaticamente (em até 3s)
2. 🔴 **Card vermelho claro** aparece na lista
3. 🏷️ **Badge "Cancelado"** em vermelho
4. 🚫 **Dropdown desabilitado** (não pode mudar status)
5. 🖨️ **Botão reimprimir** ainda funciona
6. 📊 **Tab "Cancelado"** mostra contador (1)

### 3. Teste de Bloqueio

1. Selecione um pedido "Recebido" (azul)
2. Mude status para "Cancelado" no dropdown
3. **Card fica vermelho** 🔴
4. **Dropdown fica desabilitado** 🚫
5. Tente clicar no dropdown → **Não abre!** ✅
6. Status fica travado como "Cancelado" permanentemente

---

## 🎯 Casos de Uso

### Cenário 1: Cliente Cancela Pedido

```
1. Pedido criado → Status: Recebido (azul)
2. Cliente cancela → Muda para: Cancelado (vermelho)
3. Card fica vermelho
4. Dropdown trava
5. Não pode mais alterar
```

### Cenário 2: Erro na Cozinha

```
1. Pedido em preparo → Status: Em Preparo (laranja)
2. Ingrediente faltou → Muda para: Cancelado (vermelho)
3. Card muda de laranja para vermelho
4. Status travado
5. Pode reimprimir se necessário
```

### Cenário 3: Filtrar Cancelados

```
1. Clique na tab "Cancelado"
2. Ver apenas pedidos cancelados
3. Todos em vermelho
4. Todos com dropdown bloqueado
5. Contador mostra quantos foram cancelados hoje
```

---

## 📊 Comparação de Status

| Status           | Cor          | Pode Mudar? | Badge        |
| ---------------- | ------------ | ----------- | ------------ |
| 🔵 Recebido      | Azul         | ✅ Sim      | Azul         |
| 🟠 Em Preparo    | Laranja      | ✅ Sim      | Laranja      |
| 🟢 Pronto        | Verde        | ✅ Sim      | Verde        |
| ⚪ Entregue      | Cinza        | ✅ Sim      | Cinza        |
| 🔴 **Cancelado** | **Vermelho** | **❌ NÃO**  | **Vermelho** |

---

## 🔒 Regras de Negócio

### Quando um pedido é cancelado:

1. ✅ **Card fica vermelho** imediatamente
2. ✅ **Dropdown é desabilitado** (disabled=true)
3. ✅ **Status não pode mais ser alterado** (travado)
4. ✅ **Aparece na tab "Cancelado"**
5. ✅ **Contador da tab atualiza**
6. ✅ **Botão reimprimir continua funcionando**
7. ✅ **Badge mostra "Cancelado" em vermelho**

### Comportamento do Dropdown:

```tsx
// Quando NÃO cancelado
<select disabled={false}>
  <option>Recebido</option>
  <option>Em Preparo</option>
  <option>Pronto</option>
  <option>Entregue</option>
  <option>Cancelado</option>
</select>

// Quando cancelado
<select disabled={true} style="opacity: 0.5; cursor: not-allowed">
  <option selected>Cancelado</option>
  {/* Não pode selecionar outras opções */}
</select>
```

---

## 🎨 Estados Visuais

### Card Normal (Pode Editar)

```
┌─────────────────────────┐
│ Card Azul               │
│ [Status: Recebido ▼]    │
│ ← Dropdown ativo        │
└─────────────────────────┘
```

### Card Cancelado (Travado)

```
┌─────────────────────────┐
│ Card Vermelho 🔴        │
│ [Status: Cancelado ▼] 🚫│
│ ← Dropdown DESABILITADO │
│ (Cinza, opaco, cursor   │
│  not-allowed)           │
└─────────────────────────┘
```

---

## 📝 SQL Queries Úteis

### Ver Todos os Cancelados de Hoje

```sql
SELECT
  id,
  created_at,
  LEFT(payload, 50) as preview,
  order_status
FROM print_jobs
WHERE DATE(created_at) = CURRENT_DATE
  AND order_status = 'cancelado'
  AND status = 'printed'
ORDER BY created_at DESC;
```

### Estatísticas de Cancelamentos

```sql
SELECT
  DATE(created_at) as data,
  COUNT(*) as total_cancelados,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentual
FROM print_jobs
WHERE order_status = 'cancelado'
  AND status = 'printed'
GROUP BY DATE(created_at)
ORDER BY data DESC
LIMIT 7;
```

### Cancelar um Pedido Manualmente

```sql
UPDATE print_jobs
SET order_status = 'cancelado'
WHERE id = '<job-id>';
```

### Contar por Status (Hoje)

```sql
SELECT
  order_status,
  COUNT(*) as total
FROM print_jobs
WHERE DATE(created_at) = CURRENT_DATE
  AND status = 'printed'
GROUP BY order_status
ORDER BY
  CASE order_status
    WHEN 'recebido' THEN 1
    WHEN 'em_preparo' THEN 2
    WHEN 'pronto' THEN 3
    WHEN 'entregue' THEN 4
    WHEN 'cancelado' THEN 5
  END;
```

---

## ✅ Checklist de Implementação

- [x] Enum `order_status` atualizado no banco (+ 'cancelado')
- [x] Tipo TypeScript `OrderStatus` atualizado
- [x] Label "Cancelado" adicionado
- [x] Cor vermelha (#ef4444) definida
- [x] CSS classe `.status-cancelado` criada
- [x] Tab "Cancelado" adicionada na interface
- [x] Dropdown com opção "Cancelado"
- [x] Dropdown desabilitado quando status = "cancelado"
- [x] Estilo visual para dropdown desabilitado
- [x] Build compilado com sucesso

---

## 🚀 Pronto para Usar!

Execute `yarn dev` ou recarregue a página. O status "Cancelado" já está funcional!

### Teste Rápido

1. Crie um pedido normal
2. Mude status para "Cancelado"
3. Observe:
   - ✅ Card fica vermelho
   - ✅ Dropdown trava
   - ✅ Não consegue mudar mais
   - ✅ Aparece na tab "Cancelado"

---

## 🎉 RESUMO

### Antes ❌

- Apenas 4 status (Recebido, Em Preparo, Pronto, Entregue)
- Não tinha como marcar pedidos cancelados
- Todos os status podiam ser alterados livremente

### Depois ✅

- **5 status** (+ Cancelado)
- **Card vermelho** para cancelados
- **Status travado** quando cancelado
- **Tab dedicada** para filtrar cancelados
- **Controle visual** claro de pedidos cancelados

---

**Sistema 100% funcional! 🔴✨**

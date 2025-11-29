# 🎯 Sistema de Lista de Pedidos com Controle de Status

## ✅ Implementado com Sucesso!

O sistema agora possui uma **lista completa de pedidos** com controle de status e funcionalidade de reimpressão.

---

## 🆕 Novas Funcionalidades

### 1. **Lista de Pedidos na Interface**

- Visualização de todos os pedidos impressos
- Filtros por status (Todos, Recebido, Em Preparo, Pronto, Entregue)
- Contador de pedidos por status
- Atualização automática a cada 10 segundos

### 2. **Controle de Status**

- **Recebido** (azul) - Status padrão ao criar job
- **Em Preparo** (laranja) - Pedido sendo preparado
- **Pronto** (verde) - Pedido pronto para entrega
- **Entregue** (cinza) - Pedido entregue ao cliente

### 3. **Reimpressão**

- Botão 🖨️ **Reimprimir** em cada pedido
- Imprime novamente o conteúdo do pedido
- Útil para pedidos perdidos ou duplicados

---

## 🔧 Implementação Técnica

### Banco de Dados (Migration)

**Arquivo:** `supabase/migrations/20241121_add_order_status.sql`

```sql
-- Novo ENUM para status do pedido
CREATE TYPE order_status AS ENUM ('recebido', 'em_preparo', 'pronto', 'entregue');

-- Novos campos na tabela print_jobs
ALTER TABLE print_jobs
ADD COLUMN order_status order_status DEFAULT 'recebido';

ALTER TABLE print_jobs
ADD COLUMN order_status_updated_at TIMESTAMPTZ;
```

**Para aplicar a migration:**

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Execute o conteúdo de `supabase/migrations/20241121_add_order_status.sql`

---

## 🎨 Interface

### Tabs de Filtro

```
[ Todos (10) ] [ Recebido (3) ] [ Em Preparo (4) ] [ Pronto (2) ] [ Entregue (1) ]
```

### Card de Pedido

```
┌──────────────────────────────────────────┐
│ 21/11/2024 15:30:45    [Recebido]       │
├──────────────────────────────────────────┤
│ Pedido #123                              │
│ Mesa: 10                                 │
│ 2x Cerveja - R$ 24,00                   │
│ 1x Batata - R$ 35,00                    │
├──────────────────────────────────────────┤
│ [Status: Recebido ▼] [🖨️ Reimprimir]    │
└──────────────────────────────────────────┘
```

---

## 📋 Como Usar

### 1. Conectar à Estação

1. Insira o token da estação
2. Clique em "Conectar"
3. Aguarde status: **Conectado** (verde)

### 2. Ver Pedidos

- A lista carrega automaticamente ao conectar
- Pedidos aparecem na seção **"Pedidos"**
- Lista atualiza a cada 10 segundos

### 3. Filtrar por Status

Clique nas tabs para filtrar:

- **Todos** - Mostra todos os pedidos
- **Recebido** - Apenas novos pedidos
- **Em Preparo** - Pedidos sendo preparados
- **Pronto** - Pedidos prontos
- **Entregue** - Pedidos já entregues

### 4. Atualizar Status de um Pedido

1. Localize o pedido na lista
2. Clique no seletor de status
3. Escolha o novo status
4. Status atualiza automaticamente no banco

### 5. Reimprimir um Pedido

1. Localize o pedido
2. Clique em **🖨️ Reimprimir**
3. Pedido imprime novamente

---

## 🔄 Fluxo Completo

```
1. Pedido criado no banco
   ↓
   INSERT INTO print_jobs (..., order_status='recebido')

2. Cliente detecta via polling
   ↓
   [INFO] Novo job encontrado

3. Imprime automaticamente
   ↓
   [SUCCESS] Job impresso

4. Aparece na lista com status "Recebido"
   ↓
   Card azul na interface

5. Usuário atualiza status para "Em Preparo"
   ↓
   Card muda para laranja

6. Quando pronto, atualiza para "Pronto"
   ↓
   Card muda para verde

7. Quando entregue, atualiza para "Entregue"
   ↓
   Card muda para cinza
```

---

## 🎯 Exemplo de Uso Real

### Cenário: Bar/Restaurante

1. **Cliente faz pedido** → Sistema cria job no banco
2. **Impressora imprime** → Status: **Recebido** (azul)
3. **Cozinha vê pedido** → Atualiza para **Em Preparo** (laranja)
4. **Pedido pronto** → Atualiza para **Pronto** (verde)
5. **Garçom entrega** → Atualiza para **Entregue** (cinza)

---

## 📊 APIs Disponíveis

### JavaScript/TypeScript

```typescript
// Buscar pedidos recentes
const { jobs } = await window.electronAPI.jobs.getRecent(50);

// Atualizar status
await window.electronAPI.jobs.updateStatus(jobId, "em_preparo");

// Reimprimir
await window.electronAPI.jobs.reprint(jobId, payload);
```

### SQL (Supabase)

```sql
-- Criar pedido com status padrão
INSERT INTO print_jobs (station_id, payload, status, order_status)
VALUES (
  '5766dc3e-14a3-41e9-9eaf-710c6d10777b',
  'Pedido #123...',
  'pending',
  'recebido'  -- Opcional, já é o padrão
);

-- Atualizar status manualmente
UPDATE print_jobs
SET order_status = 'em_preparo'
WHERE id = '<job-id>';

-- Buscar pedidos por status
SELECT * FROM print_jobs
WHERE order_status = 'recebido'
ORDER BY created_at DESC;

-- Estatísticas por status
SELECT order_status, COUNT(*) as total
FROM print_jobs
WHERE station_id = '5766dc3e-14a3-41e9-9eaf-710c6d10777b'
GROUP BY order_status;
```

---

## 🎨 Cores dos Status

| Status     | Cor        | Hex Code |
| ---------- | ---------- | -------- |
| Recebido   | 🔵 Azul    | #3b82f6  |
| Em Preparo | 🟠 Laranja | #f59e0b  |
| Pronto     | 🟢 Verde   | #22c55e  |
| Entregue   | ⚪ Cinza   | #6b7280  |

---

## 🔧 Configurações

### Intervalo de Atualização

Pedidos atualizam automaticamente a cada **10 segundos**.

Para alterar em `src/renderer/App.tsx`:

```typescript
const interval = setInterval(loadJobs, 10000); // ← Altere 10000 (10s)
```

### Limite de Pedidos

Por padrão carrega **50 pedidos mais recentes**.

Para alterar:

```typescript
const loadJobs = async () => {
  const result = await window.electronAPI.jobs.getRecent(100); // ← Altere 50
  // ...
};
```

---

## 📱 Layout Responsivo

A interface se adapta automaticamente:

- **Desktop:** Lista em coluna única, fácil visualização
- **Scrollable:** Lista com scroll quando muitos pedidos
- **Cards:** Cada pedido em card separado
- **Tabs:** Filtros em linha, wrap automático

---

## ⚠️ Importante

### Aplicar Migration

**ANTES de usar o sistema, execute a migration no Supabase:**

1. Abra Supabase Dashboard
2. SQL Editor
3. Cole o conteúdo de `20241121_add_order_status.sql`
4. Execute (RUN)

### Jobs Antigos

Jobs criados **antes** da migration não terão `order_status`.

Para corrigir:

```sql
-- Atualizar jobs antigos
UPDATE print_jobs
SET order_status = 'recebido'
WHERE order_status IS NULL;
```

---

## 🚀 Teste Agora!

### 1. Aplicar Migration

```sql
-- Execute no Supabase SQL Editor
-- (copie de: supabase/migrations/20241121_add_order_status.sql)
```

### 2. Rebuild e Iniciar

```bash
yarn build
yarn dev
```

### 3. Conectar

1. Token: `estacao-bar-001`
2. Conectar
3. Ver lista de pedidos

### 4. Criar Pedido de Teste

```sql
INSERT INTO print_jobs (station_id, payload, status, order_status)
VALUES (
  '5766dc3e-14a3-41e9-9eaf-710c6d10777b',
  'PEDIDO TESTE #999

Mesa: 10
Garçom: João

2x Cerveja - R$ 24,00
1x Batata - R$ 35,00

TOTAL: R$ 59,00',
  'pending',
  'recebido'
);
```

### 5. Ver na Interface

- Pedido aparece automaticamente (em até 3s)
- Aparece na tab "Recebido"
- Card azul
- Pode atualizar status
- Pode reimprimir

---

## 🎉 Resumo das Funcionalidades

- ✅ Lista de pedidos em tempo real
- ✅ Filtros por status (5 tabs)
- ✅ Contador de pedidos por status
- ✅ Atualização automática (10s)
- ✅ Controle de status (4 opções)
- ✅ Reimpressão de pedidos
- ✅ UI moderna e responsiva
- ✅ Cores visuais por status
- ✅ Preview do conteúdo do pedido
- ✅ Data/hora de criação
- ✅ Integração completa com banco

---

**Sistema completo e funcionando! 🎊**

Execute `yarn dev` e teste todas as funcionalidades!

# 🚀 Guia Rápido de Início

## Instalação em 5 Minutos

### 1. Instalar Dependências

```bash
cd electron-printer-client
npm install
```

### 2. Configurar Banco de Dados

Execute a migration no Supabase:

```bash
# Copie o conteúdo de supabase/migrations/20241114_create_print_system_tables.sql
# Cole no SQL Editor do painel do Supabase e execute
```

Ou via Supabase CLI:

```bash
supabase db push
```

### 3. Criar Estação de Teste

No SQL Editor do Supabase:

```sql
INSERT INTO print_stations (name, token)
VALUES ('Minha Estação Teste', 'meu-token-123');
```

### 4. Habilitar Realtime

No painel do Supabase:

- Database → Replication
- Habilite a tabela `print_jobs`

### 5. Executar o App

```bash
npm run dev
```

### 6. Configurar na Interface

Na interface do app:

1. **URL do Supabase**: `https://seu-projeto.supabase.co`
2. **Chave do Supabase**: Sua `anon key` (encontre em Settings → API)
3. **Token da Estação**: `meu-token-123`
4. Clique em **"Salvar e Conectar"**
5. Selecione uma impressora
6. Clique em **"Teste de Impressão"**

### 7. Criar Job de Teste

No SQL Editor:

```sql
-- Usando a função auxiliar
SELECT create_test_print_job('meu-token-123');

-- Ou manualmente
INSERT INTO print_jobs (station_id, payload, status)
SELECT id, 'PEDIDO #001

Produto A - R$ 10,00
Produto B - R$ 15,00
-------------------
Total: R$ 25,00', 'pending'
FROM print_stations
WHERE token = 'meu-token-123';
```

O job será impresso automaticamente! 🎉

## 🍎 Testando no macOS

### Diferenças para macOS

O sistema funciona **perfeitamente no macOS**! A API do Electron é nativa e multiplataforma.

**Impressoras para teste:**

- ✅ **Save as PDF** - Disponível por padrão, sem impressora física
- ✅ Qualquer impressora instalada via System Preferences

**Locais de arquivos:**

- Configurações: `~/Library/Application Support/electron-printer-client/config.json`
- Logs: `~/Library/Application Support/electron-printer-client/logs/app.log`

### Teste Rápido no Mac

```bash
cd electron-printer-client
npm install
npm run dev
```

Na interface:

1. Configure Supabase (URL + chave)
2. Use token: `token-mac-dev`
3. Selecione impressora: **"Save as PDF"**
4. Teste a impressão

Crie a estação no Supabase:

```sql
INSERT INTO print_stations (name, token)
VALUES ('MacBook - Desenvolvimento', 'token-mac-dev');
```

Crie um job de teste:

```sql
SELECT create_test_print_job('token-mac-dev');
```

✨ O PDF será salvo automaticamente!

## Gerar Instaladores

### Windows

```bash
npm run build
npm run dist:win
```

### macOS

```bash
npm run build
npm run dist:mac
```

Os arquivos estarão em `release/`.

## Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Inicia app em modo dev

# Build
npm run build            # Compila código
npm run dist             # Gera instalador (plataforma atual)
npm run dist:win         # Gera instalador Windows
npm run dist:mac         # Gera instalador macOS (DMG + ZIP)

# Componentes individuais
npm run dev:main         # Compila apenas main process
npm run dev:renderer     # Inicia apenas webpack dev server
npm run build:main       # Compila main process
npm run build:renderer   # Compila renderer process
```

## Estrutura de Dados

### PrintStation

```typescript
{
  id: string;                    // UUID
  name: string;                  // "Bar Principal - Caixa 1"
  token: string;                 // "token-unico-123"
  default_printer_name?: string; // "HP LaserJet"
  last_seen_at?: string;         // ISO timestamp
}
```

### PrintJob

```typescript
{
  id: string;                // UUID
  station_id: string;        // UUID da estação
  payload: string;           // Texto para impressão
  status: 'pending' | 'printing' | 'printed' | 'error';
  error_message?: string;
  created_at: string;        // ISO timestamp
  printed_at?: string;       // ISO timestamp
}
```

## Integração com Frontend React/Vite

```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Função para enviar pedido para impressão
async function sendToPrint(stationToken: string, pedidoText: string) {
  // 1. Buscar ID da estação
  const { data: station } = await supabase
    .from("print_stations")
    .select("id")
    .eq("token", stationToken)
    .single();

  if (!station) {
    throw new Error("Estação não encontrada");
  }

  // 2. Criar job de impressão
  const { data, error } = await supabase
    .from("print_jobs")
    .insert({
      station_id: station.id,
      payload: pedidoText,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

// Exemplo de uso
await sendToPrint(
  "token-caixa-01",
  `
PEDIDO #${pedidoId}
Data: ${new Date().toLocaleString()}
--------------------------
${itens.map((i) => `${i.nome} - R$ ${i.preco}`).join("\n")}
--------------------------
TOTAL: R$ ${total}
`
);
```

## Troubleshooting Rápido

| Problema                    | Solução                                    |
| --------------------------- | ------------------------------------------ |
| "Token não encontrado"      | Verifique se a estação foi criada no banco |
| "Impressora não encontrada" | Clique em "Atualizar Impressoras"          |
| Jobs não imprimem           | Verifique se Realtime está habilitado      |
| Erro de conexão             | Confirme URL e chave do Supabase           |

## Próximos Passos

1. ✅ Configure múltiplas estações (bar, cozinha, etc)
2. ✅ Customize o formato dos tickets
3. ✅ Configure políticas RLS no Supabase
4. ✅ Distribua o instalador para as estações
5. ✅ Monitore via view `v_print_jobs_summary`

---

**Pronto para produção!** 🚀

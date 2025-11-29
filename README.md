# Cliente de Impressão - Electron Desktop App

Cliente de impressão desktop desenvolvido em Electron para integração com sistema de bar via Supabase.

## 📋 Características

- 🖨️ **Impressão Automática**: Monitora jobs de impressão em tempo real via Supabase
- 🔄 **Sincronização Real-Time**: Utiliza Supabase Realtime para receber novos pedidos instantaneamente
- 🖥️ **Interface Intuitiva**: UI simples e funcional em português do Brasil
- 📊 **Sistema de Logs**: Acompanhe todas as atividades em tempo real
- ⚙️ **Configuração Flexível**: Configure URL do Supabase, chaves e impressoras localmente
- 🔐 **Identificação por Token**: Cada estação tem seu próprio token de identificação

## 🛠️ Tecnologias Utilizadas

- **Electron** - Framework para aplicativos desktop
- **TypeScript** - Linguagem de programação
- **React** - Biblioteca UI
- **Supabase JS SDK** - Integração com Supabase
- **Node Printer** - Controle de impressoras locais
- **Webpack** - Bundler para o renderer process

## 📦 Pré-requisitos

- **Node.js** 18+ (recomendado)
- **npm** ou **yarn**
- **Sistema Operacional**: Windows 10+ (64 bits) ou macOS 10.13+ (High Sierra)
- Impressora instalada e configurada no sistema (ou "Save as PDF" no macOS para testes)

## 🚀 Instalação

### 1. Clonar e Instalar Dependências

```bash
cd electron-printer-client
npm install
```

Ou usando yarn:

```bash
cd electron-printer-client
yarn install
```

### 2. Configurar Supabase

Antes de usar o aplicativo, você precisa configurar as tabelas no Supabase:

#### Tabela `print_stations`

```sql
CREATE TABLE print_stations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  default_printer_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ
);

-- Criar índice para otimizar busca por token
CREATE INDEX idx_print_stations_token ON print_stations(token);
```

#### Tipo Enum `print_job_status`

```sql
CREATE TYPE print_job_status AS ENUM ('pending', 'printing', 'printed', 'error');
```

#### Tabela `print_jobs`

```sql
CREATE TABLE print_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id UUID NOT NULL REFERENCES print_stations(id),
  payload TEXT NOT NULL,
  status print_job_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  printed_at TIMESTAMPTZ
);

-- Criar índices para otimizar queries
CREATE INDEX idx_print_jobs_station_status ON print_jobs(station_id, status);
CREATE INDEX idx_print_jobs_created_at ON print_jobs(created_at);
```

#### Inserir Estação de Teste

```sql
INSERT INTO print_stations (name, token)
VALUES ('Estação Teste - Bar Principal', 'token-teste-123');
```

### 3. Habilitar Realtime no Supabase

No painel do Supabase:

1. Vá em **Database** → **Replication**
2. Habilite a replicação para a tabela `print_jobs`
3. Certifique-se de que o schema `public` está habilitado

## 💻 Desenvolvimento

### Executar em Modo de Desenvolvimento

```bash
npm run dev
```

Ou usando yarn:

```bash
yarn dev
```

Isto irá:

- Compilar o processo main
- Iniciar o webpack dev server na porta 3000
- Abrir a aplicação Electron com hot-reload

### Estrutura do Projeto

```
electron-printer-client/
├── src/
│   ├── main/           # Processo principal do Electron
│   │   ├── main.ts     # Entry point
│   │   ├── ipc-handlers.ts  # Handlers IPC
│   │   └── preload.ts  # Script de preload
│   ├── renderer/       # Interface do usuário
│   │   ├── App.tsx     # Componente principal
│   │   ├── index.tsx   # Entry point do React
│   │   ├── index.html  # HTML template
│   │   ├── styles.css  # Estilos
│   │   └── types.d.ts  # Tipos TypeScript
│   └── core/           # Lógica de negócio
│       ├── types.ts           # Tipos compartilhados
│       ├── configStore.ts     # Gerenciamento de config
│       ├── logService.ts      # Sistema de logs
│       ├── printerService.ts  # Controle de impressoras
│       ├── supabaseClient.ts  # Cliente Supabase
│       └── printClient.ts     # Orquestrador de impressão
├── package.json
├── tsconfig.json
├── webpack.renderer.config.js
└── README.md
```

## 🔧 Configuração do Aplicativo

Na primeira execução, você precisará configurar:

### 1. **URL do Supabase**

- Exemplo: `https://seu-projeto.supabase.co`
- Encontre em: Painel do Supabase → Settings → API → Project URL

### 2. **Chave do Supabase**

- Use a chave `anon` (pública) ou `service_role` (privada)
- Encontre em: Painel do Supabase → Settings → API → Project API keys
- ⚠️ **Atenção**: Para ambientes de produção, considere usar Row Level Security (RLS)

### 3. **Token da Estação**

- Token único que identifica esta estação no banco de dados
- Deve corresponder a um registro na tabela `print_stations`
- Exemplo: `token-teste-123`

### 4. **Impressora**

- Selecione a impressora local que será utilizada
- Você pode atualizar a lista de impressoras a qualquer momento
- Teste a impressão antes de começar a usar

## 📝 Como Usar

### 1. Configurar e Conectar

1. Preencha as configurações do Supabase e Token da Estação
2. Clique em **"Salvar e Conectar"**
3. Aguarde a confirmação de conexão
4. A interface mostrará o nome da estação e status "Conectado"

### 2. Configurar Impressora

1. Selecione uma impressora no dropdown
2. Clique em **"Salvar Impressora Padrão"**
3. Clique em **"Teste de Impressão"** para verificar

### 3. Processar Jobs

O aplicativo irá automaticamente:

1. Buscar todos os jobs pendentes ao conectar
2. Processar os jobs na ordem de criação
3. Escutar novos jobs via Realtime
4. Atualizar o status no Supabase após cada impressão

### 4. Monitorar Logs

- Acompanhe todas as atividades no painel de logs
- Logs são salvos em: `%APPDATA%/electron-printer-client/logs/app.log`
- Cores indicam o tipo de log:
  - 🔵 **INFO**: Informações gerais
  - 🟢 **SUCCESS**: Operações bem-sucedidas
  - 🟠 **WARNING**: Avisos
  - 🔴 **ERROR**: Erros

## 🏗️ Build para Produção

### Compilar o Código

```bash
npm run build
```

### Gerar Instalador para Windows

```bash
npm run dist:win
```

Isto irá gerar:

- **Instalador NSIS**: `release/Emissor ByRake Setup X.X.X.exe`
- **Versão Portable**: `release/Emissor ByRake X.X.X.exe`

### Gerar Instalador para macOS

```bash
npm run dist:mac
```

Isto irá gerar:

- **Imagem de Disco**: `release/Emissor ByRake-X.X.X.dmg`
- **Arquivo ZIP**: `release/Emissor ByRake-X.X.X-mac.zip`

### Build Universal (Todas as Plataformas)

```bash
npm run dist
```

Os arquivos estarão na pasta `release/`.

### Configurações do Build

O build é configurado no `package.json` na seção `build`:

```json
{
  "build": {
    "appId": "com.byrake.printer.client",
    "productName": "Emissor ByRake",
    "win": {
      "target": ["nsis", "portable"],
      "icon": "assets/icon.ico"
    }
  }
}
```

## 🎨 Personalização

### Ícone da Aplicação

1. Crie uma pasta `assets/` na raiz do projeto
2. Adicione os ícones:
   - **Windows**: `icon.ico` (256x256 recomendado)
   - **macOS**: `icon.icns` (512x512@2x recomendado)
3. Os ícones serão incluídos automaticamente no build

### Textos e Labels

Todos os textos da interface estão em `src/renderer/App.tsx` e podem ser facilmente personalizados.

### Estilos

Os estilos CSS estão em `src/renderer/styles.css` e seguem uma estrutura modular fácil de modificar.

## 🧪 Testando a Integração

### 1. Criar um Job de Teste via SQL

```sql
-- Buscar o ID da sua estação
SELECT id, name FROM print_stations WHERE token = 'token-teste-123';

-- Criar um job de teste (substitua o station_id)
INSERT INTO print_jobs (station_id, payload, status)
VALUES (
  'SEU-STATION-ID-AQUI',
  'TESTE DE IMPRESSÃO

Este é um pedido de teste!

Item 1: Refrigerante
Item 2: Hambúrguer
Total: R$ 25,00
',
  'pending'
);
```

### 2. Criar um Job via API (exemplo JavaScript)

```javascript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient("SUA_URL", "SUA_KEY");

// Buscar estação
const { data: station } = await supabase
  .from("print_stations")
  .select("id")
  .eq("token", "token-teste-123")
  .single();

// Criar job
const { data, error } = await supabase.from("print_jobs").insert({
  station_id: station.id,
  payload: "Pedido #123\n\nProduto A - R$ 10,00\nProduto B - R$ 15,00",
  status: "pending",
});
```

## 🐛 Troubleshooting

### Impressora não encontrada

- Verifique se a impressora está instalada e ligada
- Clique em "Atualizar Impressoras" para recarregar a lista
- Em alguns casos, reiniciar o app pode resolver

### Erro ao conectar no Supabase

- Verifique se a URL e chave estão corretas
- Teste a conexão acessando o painel do Supabase
- Verifique se as tabelas foram criadas corretamente
- Confirme que o token da estação existe na tabela

### Jobs não são processados

- Verifique se o status está "Conectado"
- Confirme que o `station_id` do job corresponde à estação
- Veja os logs para identificar erros específicos
- Verifique se o Realtime está habilitado no Supabase

### Logs não aparecem

- Verifique se o aplicativo tem permissão de escrita
- Logs ficam em:
  - **Windows**: `%APPDATA%/electron-printer-client/logs/`
  - **macOS**: `~/Library/Application Support/electron-printer-client/logs/`
- Tente reiniciar o aplicativo

## 🍎 Testando no macOS

### Impressoras Virtuais para Teste

No macOS, você pode usar impressoras virtuais sem uma impressora física:

1. **Save as PDF** - Disponível por padrão no macOS
2. Selecione esta impressora no app para fazer testes
3. Os documentos serão salvos como PDF ao invés de imprimir

### Diferenças no macOS

- Localização dos logs: `~/Library/Application Support/electron-printer-client/logs/`
- Configurações salvas em: `~/Library/Application Support/electron-printer-client/config.json`
- Suporte nativo para impressoras do sistema via CUPS

## 📄 Licença

MIT

## 🤝 Suporte

Para dúvidas ou problemas:

1. Verifique os logs em `%APPDATA%/electron-printer-client/logs/app.log`
2. Consulte a documentação do Supabase
3. Revise as configurações de rede e firewall

---

**Desenvolvido para sistemas de bar com integração Supabase** 🍔🍺

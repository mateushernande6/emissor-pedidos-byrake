# Configuração do Cliente de Impressão

Este documento explica como configurar o Cliente de Impressão para funcionar com o Supabase.

## 📋 Pré-requisitos

- Node.js (v16 ou superior)
- npm ou yarn
- Conta no Supabase com o projeto ByRake configurado

## 🔧 Configuração do Ambiente

### 1. Configurar o arquivo `.env`

Na raiz do projeto `electron-printer-client`, crie um arquivo `.env` baseado no `.env.example`:

```bash
cp .env.example .env
```

### 2. Editar o arquivo `.env`

Abra o arquivo `.env` e configure as seguintes variáveis:

```env
# URL do projeto Supabase
SUPABASE_URL=https://lyzfisipvpyrqnstqgwm.supabase.co

# Chave anônima (anon key) do Supabase
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5emZpc2lwdnB5cnFuc3RxZ3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMTg4MDcsImV4cCI6MjA3MTg5NDgwN30.DArTn7vAKn6FHzT7GvbD6gXB9xWTr5QDwPZMzE1xSyQ

# Ambiente de desenvolvimento
NODE_ENV=development
```

> ⚠️ **IMPORTANTE**: O arquivo `.env` contém informações sensíveis e **NÃO deve ser versionado no Git**. Ele já está incluído no `.gitignore`.

### 3. Obter as credenciais do Supabase

As credenciais já estão configuradas para o projeto ByRake. Se precisar alterá-las:

1. Acesse o painel do Supabase: https://app.supabase.com
2. Selecione o projeto ByRake
3. Vá em **Settings** > **API**
4. Copie a **URL** e a **anon/public key**

## 🗄️ Estrutura do Banco de Dados

O sistema utiliza as seguintes tabelas no Supabase:

### Tabela: `print_stations`

Armazena as estações de impressão cadastradas no sistema.

```sql
CREATE TABLE print_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  default_printer_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true
);
```

### Tabela: `print_jobs`

Armazena os jobs de impressão pendentes ou processados.

```sql
CREATE TABLE print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES print_stations(id) ON DELETE CASCADE,
  payload TEXT NOT NULL,
  status print_job_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  printed_at TIMESTAMPTZ
);
```

## 🚀 Instalação e Execução

### 1. Instalar dependências

```bash
npm install
```

### 2. Executar em modo de desenvolvimento

```bash
npm run dev
```

Este comando irá:

- Compilar o código TypeScript do processo principal
- Iniciar o servidor de desenvolvimento do React (porta 3000)
- Abrir a aplicação Electron

### 3. Build para produção

```bash
# Build geral (cria arquivos compilados)
npm run build

# Criar instalador para Windows
npm run dist:win

# Criar instalador para macOS
npm run dist:mac
```

## 🎯 Configuração da Estação

Após iniciar a aplicação:

1. **Token da Estação**: Digite o token da estação que você deseja conectar

   - Solicite o token ao administrador do sistema
   - O token identifica univocamente esta estação no sistema

2. **Salvar Configurações**: Clique em "Salvar Configurações" para persistir o token

3. **Conectar**: Clique em "Conectar" para iniciar a conexão com o Supabase

   - O sistema buscará a estação pelo token
   - Iniciará o monitoramento de novos jobs de impressão

4. **Configurar Impressora**: Selecione a impressora padrão desta estação
   - A lista mostra todas as impressoras disponíveis no sistema
   - Clique em "Teste de Impressão" para validar

## 📝 Como Funciona

### Fluxo de Impressão

1. **Conexão**: A estação se conecta ao Supabase usando o token
2. **Heartbeat**: A cada 30 segundos, atualiza o campo `last_seen_at`
3. **Monitoramento**: Escuta novos registros na tabela `print_jobs` via Realtime
4. **Processamento**: Quando um novo job chega:
   - Status muda para `printing`
   - Envia o conteúdo para a impressora local
   - Status muda para `printed` (sucesso) ou `error` (falha)

### Envio de Jobs

Para enviar um job de impressão para uma estação:

```sql
INSERT INTO print_jobs (station_id, payload, status)
VALUES (
  'uuid-da-estacao',
  'Conteúdo do texto a ser impresso',
  'pending'
);
```

O sistema detectará automaticamente e processará a impressão.

## 🔒 Segurança

- **Credenciais do Supabase**: Armazenadas no arquivo `.env` (não versionado)
- **Token da Estação**: Armazenado localmente em `config.json` no diretório de dados do usuário
- **RLS (Row Level Security)**: Habilitado nas tabelas do Supabase
- **Comunicação**: Toda comunicação com o Supabase é feita via HTTPS

## 🐛 Troubleshooting

### Erro: "Configuração do Supabase não encontrada"

- Verifique se o arquivo `.env` existe na raiz do projeto
- Confirme que as variáveis `SUPABASE_URL` e `SUPABASE_ANON_KEY` estão definidas

### Erro: "Token de estação não encontrado"

- Verifique se o token digitado está correto
- Confirme que a estação existe na tabela `print_stations`
- Execute no Supabase:
  ```sql
  SELECT * FROM print_stations WHERE token = 'seu-token-aqui';
  ```

### Impressora não imprime

- Verifique se a impressora está ligada e conectada
- Teste a impressora fora do sistema
- No macOS/Linux, verifique se o comando `lp` está disponível
- Verifique os logs no painel "Logs de Atividade"

## 📚 Documentação Adicional

- [README.md](./README.md) - Visão geral do projeto
- [START_HERE.md](./START_HERE.md) - Guia de início rápido
- [INSTALLATION.md](./INSTALLATION.md) - Instruções de instalação detalhadas

## 🆘 Suporte

Para suporte ou dúvidas, entre em contato com o administrador do sistema ByRake.

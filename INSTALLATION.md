# 📦 Guia de Instalação Completo

## Para Desenvolvimento

### 1. Requisitos do Sistema

- **Sistema Operacional**: Windows 10+ (64-bit), macOS, ou Linux
- **Node.js**: Versão 18.x ou superior
- **npm**: Versão 8.x ou superior (incluído com Node.js)
- **Impressora**: Instalada e configurada no sistema operacional

### 2. Verificar Instalações

```bash
node --version   # Deve mostrar v18.x.x ou superior
npm --version    # Deve mostrar 8.x.x ou superior
```

### 3. Clonar/Acessar o Projeto

```bash
cd electron-printer-client
```

### 4. Instalar Dependências

```bash
npm install
```

Este comando irá instalar:
- Electron
- TypeScript
- React e React DOM
- Supabase JS SDK
- Node Printer (biblioteca de impressão)
- Webpack e ferramentas de build
- Todas as type definitions necessárias

**Tempo estimado**: 2-5 minutos dependendo da conexão

### 5. Configurar Supabase

#### 5.1. Criar Projeto no Supabase (se ainda não tiver)

1. Acesse https://supabase.com
2. Crie uma conta ou faça login
3. Crie um novo projeto
4. Anote a **URL do projeto** e a **anon key**

#### 5.2. Executar Migration

**Opção A - Via Supabase CLI (recomendado)**:

```bash
# Instalar Supabase CLI (se não tiver)
npm install -g supabase

# Login
supabase login

# Link com seu projeto
supabase link --project-ref seu-projeto-ref

# Executar migration
supabase db push
```

**Opção B - Via SQL Editor**:

1. Acesse o painel do Supabase
2. Vá em **SQL Editor**
3. Abra o arquivo `supabase/migrations/20241114_create_print_system_tables.sql`
4. Copie todo o conteúdo
5. Cole no SQL Editor
6. Clique em **Run**

#### 5.3. Habilitar Realtime

1. No painel do Supabase, vá em **Database → Replication**
2. Encontre a tabela `print_jobs`
3. Habilite a replicação clicando no switch

#### 5.4. Criar Primeira Estação

Execute no SQL Editor:

```sql
INSERT INTO print_stations (name, token)
VALUES ('Estação Desenvolvimento', 'dev-token-123')
RETURNING *;
```

### 6. Executar em Desenvolvimento

```bash
npm run dev
```

Isso irá:
1. Compilar o processo main do Electron
2. Iniciar o webpack dev server na porta 3000
3. Abrir a aplicação Electron automaticamente
4. Habilitar hot-reload para desenvolvimento

**Janela do app deve abrir automaticamente!**

### 7. Configurar o App pela Primeira Vez

Na interface do aplicativo:

1. **URL do Supabase**: Cole a URL do seu projeto
   - Formato: `https://xxxxx.supabase.co`
   - Encontre em: Supabase → Settings → API → Project URL

2. **Chave do Supabase**: Cole sua anon key
   - Encontre em: Supabase → Settings → API → Project API keys → anon public
   - ⚠️ Para produção, considere usar service_role com RLS configurado

3. **Token da Estação**: Digite `dev-token-123`

4. Clique em **"Salvar e Conectar"**

5. Se conectar com sucesso, você verá:
   - Status: **Conectado** (verde)
   - Nome da estação: **Estação Desenvolvimento**

### 8. Configurar Impressora

1. No dropdown "Impressora", selecione uma impressora instalada
2. Clique em **"Salvar Impressora Padrão"**
3. Clique em **"Teste de Impressão"**
4. Verifique se o teste foi impresso corretamente

### 9. Testar Job de Impressão

Abra o SQL Editor do Supabase e execute:

```sql
-- Cria um job de teste
SELECT create_test_print_job('dev-token-123', 
'TESTE DE IMPRESSÃO

Este é um teste do sistema!

Data: ' || NOW()::TEXT || '

Itens:
- Item 1 .......... R$ 10,00
- Item 2 .......... R$ 15,00
------------------------
Total: R$ 25,00
');
```

O job deve aparecer nos logs e ser impresso automaticamente! 🎉

---

## Para Produção

### 1. Build do Código

```bash
npm run build
```

Este comando:
- Compila o código TypeScript
- Otimiza os assets
- Prepara para empacotamento

### 2. Gerar Instalador Windows

```bash
npm run dist:win
```

Isso irá gerar:
- **Instalador NSIS**: `release/Cliente de Impressão Bar Setup X.X.X.exe`
  - Instalador tradicional do Windows
  - Permite escolher diretório de instalação
  - Cria atalhos no menu iniciar e desktop
  
- **Versão Portable**: `release/Cliente de Impressão Bar X.X.X.exe`
  - Executável único
  - Não requer instalação
  - Pode rodar de pen drive

**Tempo estimado**: 2-5 minutos

### 3. Distribuir para Estações

1. Copie o instalador gerado para cada computador
2. Execute o instalador
3. Configure cada estação com:
   - Mesma URL e Key do Supabase
   - **Token único** para cada estação

**Exemplo de tokens**:
```sql
INSERT INTO print_stations (name, token) VALUES
  ('Caixa 1', 'caixa-01'),
  ('Caixa 2', 'caixa-02'),
  ('Cozinha', 'cozinha-01'),
  ('Bar', 'bar-01');
```

### 4. Criar Ícone Personalizado (Opcional)

1. Crie uma pasta `assets/` na raiz do projeto
2. Adicione um arquivo `icon.ico` (Windows, 256x256px)
3. O ícone será incluído automaticamente no próximo build

---

## Troubleshooting de Instalação

### Erro: "Cannot find module 'printer'"

**Causa**: A biblioteca `printer` não foi instalada corretamente

**Solução**:
```bash
npm install printer --save
npm rebuild printer
```

### Erro: "Python not found"

**Causa**: A biblioteca `printer` precisa de Python para compilar no Windows

**Solução**:
1. Instale Python 3.x de https://www.python.org/
2. Durante instalação, marque "Add Python to PATH"
3. Reinstale as dependências: `npm install`

### Erro: "EPERM: operation not permitted"

**Causa**: Permissões insuficientes ou antivírus bloqueando

**Solução**:
- Execute o terminal como Administrador
- Adicione exceção no antivírus para a pasta do projeto
- Desabilite temporariamente o antivírus

### Build falha: "electron-builder error"

**Causa**: electron-builder precisa de dependências nativas

**Solução Windows**:
```bash
npm install --global windows-build-tools
npm install
```

**Solução macOS**:
```bash
xcode-select --install
```

### Impressora não detectada

**Causa**: Drivers não instalados ou impressora desligada

**Solução**:
1. Verifique se a impressora está instalada no Windows (Configurações → Impressoras)
2. Imprima uma página de teste do Windows
3. Reinicie o aplicativo
4. Clique em "Atualizar Impressoras"

### Erro ao conectar no Supabase

**Causa**: URL ou chave incorretas, ou firewall bloqueando

**Solução**:
1. Verifique se a URL termina com `.supabase.co`
2. Confirme que está usando a chave correta
3. Teste a conexão abrindo a URL no navegador
4. Verifique configurações de firewall/proxy

---

## Estrutura de Pastas Após Instalação

```
electron-printer-client/
├── node_modules/           # Dependências (não commitar)
├── dist/                   # Código compilado
│   ├── main/              # Processo principal
│   └── renderer/          # Interface compilada
├── release/               # Instaladores gerados
├── src/                   # Código fonte
├── supabase/              # Migrations
├── examples/              # Exemplos de integração
└── logs/                  # Logs de desenvolvimento (criado automaticamente)
```

## Dados do Usuário

Após instalação, o app cria:

**Windows**:
- Config: `%APPDATA%\electron-printer-client\config.json`
- Logs: `%APPDATA%\electron-printer-client\logs\app.log`

**macOS**:
- Config: `~/Library/Application Support/electron-printer-client/config.json`
- Logs: `~/Library/Application Support/electron-printer-client/logs/app.log`

**Linux**:
- Config: `~/.config/electron-printer-client/config.json`
- Logs: `~/.config/electron-printer-client/logs/app.log`

---

## Próximos Passos

✅ **Instalação completa!**

Agora você pode:
1. Consultar o [README.md](README.md) para uso detalhado
2. Ver [QUICK_START.md](QUICK_START.md) para guia rápido
3. Explorar [examples/](examples/) para integração com frontend
4. Configurar múltiplas estações
5. Distribuir para produção

**Suporte**: Consulte os logs em caso de problemas

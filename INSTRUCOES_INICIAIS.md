# 🚀 Instruções Iniciais - Cliente de Impressão

## Passos para Começar

### 1️⃣ Copiar o arquivo de configuração

```bash
cp .env.example .env
```

O arquivo `.env.example` já contém as credenciais corretas do Supabase ByRake. Você só precisa copiá-lo.

### 2️⃣ Instalar dependências

```bash
npm install
```

### 3️⃣ Criar uma estação de impressão no banco

Acesse o console SQL do Supabase e execute:

```sql
INSERT INTO print_stations (name, token, is_active)
VALUES (
  'Minha Estação',           -- Nome descritivo
  'estacao-001',             -- Token único (guarde este valor!)
  true
)
RETURNING *;
```

**IMPORTANTE**: Anote o `token` que você definiu, pois ele será usado na aplicação.

### 4️⃣ Executar a aplicação

```bash
npm run dev
```

### 5️⃣ Configurar na interface

1. Digite o **token da estação** que você criou
2. Clique em **"Salvar Configurações"**
3. Clique em **"Conectar"**
4. Selecione uma **impressora** da lista
5. Clique em **"Teste de Impressão"**

## ✅ Pronto!

Se tudo funcionou corretamente:

- O status mostrará "Conectado"
- O teste de impressão será executado
- A estação estará pronta para receber jobs

## 📖 Documentação Completa

Para informações detalhadas, consulte:

- [CONFIGURACAO.md](./CONFIGURACAO.md) - Guia completo de configuração
- [README.md](./README.md) - Visão geral do projeto

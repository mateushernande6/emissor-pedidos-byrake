# 🎯 Próximos Passos - Comece Agora!

## ⚡ Início Rápido (5 comandos)

Execute estes comandos na ordem:

```bash
# 1. Entre na pasta do projeto
cd electron-printer-client

# 2. Instale as dependências (2-5 minutos)
npm install

# 3. Execute o app em desenvolvimento
npm run dev
```

**A janela do aplicativo deve abrir automaticamente!** 🎉

---

## 🗄️ Configure o Supabase (Antes de usar o app)

### Opção A: Via SQL Editor (mais rápido)

1. Acesse https://supabase.com e faça login
2. Abra seu projeto
3. Vá em **SQL Editor** (menu lateral esquerdo)
4. Clique em **New Query**
5. Abra o arquivo:
   ```
   supabase/migrations/20241114_create_print_system_tables.sql
   ```
6. Copie TODO o conteúdo
7. Cole no SQL Editor
8. Clique em **Run** (ou pressione Ctrl+Enter)
9. Aguarde a mensagem "Success"

### Opção B: Via Supabase CLI

```bash
# Instalar CLI (se não tiver)
npm install -g supabase

# Login
supabase login

# Link com projeto
supabase link --project-ref SEU_PROJECT_ID

# Executar migration
supabase db push
```

### Criar Estação de Teste

No SQL Editor, execute:

```sql
INSERT INTO print_stations (name, token)
VALUES ('Minha Estação Teste', 'meu-token-123')
RETURNING *;
```

Guarde o token: `meu-token-123`

### Habilitar Realtime

1. No painel do Supabase, vá em **Database** → **Replication**
2. Encontre a tabela `print_jobs`
3. Clique no botão de toggle para habilitar

✅ Supabase configurado!

---

## 🖥️ Configure o App

Com o app aberto (`npm run dev`):

### 1. Configurações do Supabase

**URL do Supabase**:
- Encontre em: Settings → API → Project URL
- Formato: `https://xxxxx.supabase.co`

**Chave do Supabase**:
- Encontre em: Settings → API → Project API keys
- Use a chave `anon` (public)

**Token da Estação**:
- Digite: `meu-token-123` (criado acima)

Clique em **"Salvar e Conectar"**

### 2. Configuração de Impressora

1. Selecione uma impressora no dropdown
2. Clique em **"Salvar Impressora Padrão"**
3. Clique em **"Teste de Impressão"**
4. Verifique se imprimiu corretamente

✅ App configurado!

---

## 🧪 Teste o Sistema

### Teste 1: Impressão Manual

Já feito! O botão "Teste de Impressão" já validou que funciona.

### Teste 2: Job Automático

No SQL Editor do Supabase:

```sql
-- Cria um job de teste usando a função auxiliar
SELECT create_test_print_job('meu-token-123');
```

Ou manualmente:

```sql
INSERT INTO print_jobs (station_id, payload, status)
SELECT id, 
'========================================
PEDIDO DE TESTE #001
========================================

Data: ' || NOW()::TEXT || '

Itens:
1x Hambúrguer ........... R$ 15,00
1x Refrigerante ......... R$ 5,00
1x Batata Frita ......... R$ 8,00
----------------------------------------
TOTAL: R$ 28,00

========================================
', 'pending'
FROM print_stations
WHERE token = 'meu-token-123';
```

**O job deve ser impresso automaticamente em segundos!** 🎉

Verifique:
- ✅ Apareceu nos logs do app
- ✅ Status mudou para "printed" no banco
- ✅ Documento foi impresso

---

## 🚀 Próximos Passos

### Para Desenvolvimento

✅ **Está tudo pronto!** Agora você pode:

1. **Integrar com seu frontend React/Vite**
   - Veja exemplos em: `examples/frontend-integration.example.tsx`
   - Use a classe `PrintService` fornecida
   - Formate tickets com `TicketFormatter`

2. **Criar múltiplas estações**
   ```sql
   INSERT INTO print_stations (name, token) VALUES
     ('Caixa Principal', 'caixa-01'),
     ('Cozinha', 'cozinha-01'),
     ('Bar', 'bar-01');
   ```

3. **Customizar formato de tickets**
   - Edite `TicketFormatter` no exemplo
   - Ajuste largura, fontes, separadores

### Para Produção

Quando estiver pronto para distribuir:

```bash
# 1. Build do código
npm run build

# 2. Gerar instalador Windows
npm run dist:win
```

Resultado em: `release/Cliente de Impressão Bar Setup X.X.X.exe`

**Distribua este instalador** para cada computador que terá impressora.

---

## 📚 Recursos Disponíveis

| Arquivo | Descrição |
|---------|-----------|
| `README.md` | Documentação completa |
| `INSTALLATION.md` | Guia de instalação detalhado |
| `QUICK_START.md` | Início rápido (este arquivo) |
| `PROJECT_SUMMARY.md` | Resumo técnico do projeto |
| `examples/` | Exemplos de integração |

---

## 🎯 Checklist de Implementação

### Banco de Dados
- [ ] Migration executada
- [ ] Estação de teste criada
- [ ] Realtime habilitado
- [ ] Job de teste criado e impresso

### Aplicativo
- [ ] `npm install` executado
- [ ] `npm run dev` funcionando
- [ ] Conexão com Supabase OK
- [ ] Impressora configurada
- [ ] Teste de impressão OK
- [ ] Job automático impresso

### Integração Frontend
- [ ] Exemplo de código revisado
- [ ] `PrintService` implementado
- [ ] Teste de envio de job
- [ ] Formatação de ticket definida

### Produção
- [ ] Build testado
- [ ] Instalador gerado
- [ ] Múltiplas estações configuradas
- [ ] Tokens únicos criados
- [ ] RLS configurado (opcional)

---

## 💡 Dicas Importantes

### 1. Tokens Únicos
Cada estação deve ter seu próprio token:
```sql
-- ❌ Errado: mesmo token
INSERT INTO print_stations VALUES 
  ('Caixa 1', 'token-123'),
  ('Caixa 2', 'token-123');  -- ERRO!

-- ✅ Correto: tokens únicos
INSERT INTO print_stations VALUES 
  ('Caixa 1', 'token-caixa-01'),
  ('Caixa 2', 'token-caixa-02');
```

### 2. Formato do Payload
O campo `payload` aceita qualquer texto. Use quebras de linha para formatação:

```javascript
const payload = `
PEDIDO #${numero}
Mesa: ${mesa}
-------------------
${itens}
-------------------
Total: R$ ${total}
`;
```

### 3. Monitoramento
Use a view criada para monitorar:

```sql
SELECT * FROM v_print_jobs_summary;
```

### 4. Logs
Em caso de problemas, consulte os logs:
- Windows: `%APPDATA%\electron-printer-client\logs\app.log`
- No app: Painel de logs em tempo real

---

## 🆘 Problemas Comuns

### "Cannot find module"
**Solução**: Execute `npm install`

### "Estação não encontrada"
**Solução**: Verifique se o token no app = token no banco

### "Jobs não imprimem"
**Solução**: 
1. Verifique se Realtime está habilitado
2. Confirme que `station_id` do job está correto
3. Veja os logs no app

### "Impressora não detectada"
**Solução**:
1. Instale os drivers da impressora
2. Imprima algo direto do Windows (teste)
3. Clique em "Atualizar Impressoras" no app

---

## 🎉 Tudo Pronto!

Você agora tem:

✅ Um sistema completo de impressão  
✅ Integração com Supabase  
✅ Aplicativo desktop profissional  
✅ Documentação completa  
✅ Exemplos de código  

**Comece a desenvolver!** 🚀

---

## 📞 Suporte

Consulte os arquivos de documentação:

1. **Instalação**: `INSTALLATION.md`
2. **Uso**: `README.md`
3. **Resumo**: `PROJECT_SUMMARY.md`
4. **Exemplos**: `examples/frontend-integration.example.tsx`

**Logs do app**: `%APPDATA%/electron-printer-client/logs/app.log`

---

**Pronto para começar? Execute:** `npm install && npm run dev` 🚀

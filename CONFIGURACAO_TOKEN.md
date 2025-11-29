# 🔐 Configuração do Token da Estação

## ✅ Estação Criada no Banco de Dados

Acabei de criar uma estação de impressão no Supabase para você testar:

```
ID: 5766dc3e-14a3-41e9-9eaf-710c6d10777b
Nome: Estação Bar Principal
Token: estacao-bar-001
Impressora Padrão: _USB_Receipt_Printer
Status: Ativa ✅
```

---

## 🚀 Como Configurar AGORA

### Passo 1: Copiar o Token

```
estacao-bar-001
```

### Passo 2: Na Interface do Electron

1. **Apague** o token antigo: `dcasdcasdcasd`
2. **Cole** o novo token: `estacao-bar-001`
3. Clique em **"Salvar Configurações"**
4. Clique em **"Conectar"**

### Passo 3: Aguardar Conexão

Você verá:

- Status mudar de **"Desconectado"** (vermelho) para **"Conectado"** (verde)
- Nome da Estação: **"Estação Bar Principal"**
- Mensagem: **"Conectado com sucesso!"**

### Passo 4: Verificar Impressora

A impressora **\_USB_Receipt_Printer (Padrão do sistema)** já deve estar selecionada.

Se necessário:

1. Clique em **"Atualizar Impressoras"**
2. Selecione **\_USB_Receipt_Printer**
3. Clique em **"Salvar Impressora Padrão"**

### Passo 5: Testar Impressão

1. Clique em **"Teste de Impressão"**
2. Deve aparecer: **"Teste de impressão enviado com sucesso!"**
3. A impressora deve imprimir um ticket de teste

---

## 🔍 Por Que Não Funcionava Antes?

### ❌ Antes:

```
Token: dcasdcasdcasd
Status no Banco: NÃO EXISTE ❌
Resultado: Desconectado
Impressão: Não funciona
```

### ✅ Agora:

```
Token: estacao-bar-001
Status no Banco: EXISTE ✅
Resultado: Conectado
Impressão: Funciona! 🎉
```

---

## 📊 Como o Sistema Funciona

```
1. Você digita o token na interface
   ↓
2. Clica em "Conectar"
   ↓
3. Sistema busca estação no Supabase
   ↓
4. Se encontrar: Status = Conectado ✅
   Se não encontrar: Status = Desconectado ❌
   ↓
5. Com status conectado:
   - Pode imprimir
   - Recebe jobs de impressão em tempo real
   - Envia heartbeat a cada 30s
```

---

## 🎯 Teste Completo (Passo a Passo)

### 1. Configure o Token

```
Campo: Token da Estação
Valor: estacao-bar-001
Botão: "Salvar Configurações"
```

### 2. Conecte

```
Botão: "Conectar"
Resultado esperado: "Conectado com sucesso!"
Status: Conectado (verde)
```

### 3. Verifique a Estação

```
Informações da Estação:
- Estação: "Estação Bar Principal"
- Status: "Conectado"
```

### 4. Configure a Impressora

```
Dropdown: Selecione "_USB_Receipt_Printer"
Botão: "Salvar Impressora Padrão"
```

### 5. Teste a Impressão

```
Botão: "Teste de Impressão"
Mensagem: "Teste de impressão enviado com sucesso!"
Impressora: Deve imprimir um ticket
```

---

## 🐛 Troubleshooting

### Se o Status continuar "Desconectado":

#### Verificar 1: Token está correto?

```bash
# Verificar no banco
SELECT * FROM print_stations WHERE token = 'estacao-bar-001';
# Deve retornar 1 linha
```

#### Verificar 2: Arquivo .env está correto?

```bash
cat /Users/mateushernandes/Desktop/emissor-pedidos-byrake/electron-printer-client/.env

# Deve ter:
SUPABASE_URL=https://lyzfisipvpyrqnstqgwm.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Verificar 3: Ver logs no terminal

```
# Procure por erros como:
# ❌ "Token de estação não encontrado"
# ❌ "Erro ao conectar ao Supabase"
```

#### Verificar 4: Abrir DevTools (Cmd+Option+I)

```
# Ver console e procurar erros vermelhos
```

### Se a Impressão não Funcionar:

#### Verificar 1: Status está "Conectado"?

- ✅ Verde = Pode imprimir
- ❌ Vermelho = NÃO pode imprimir

#### Verificar 2: Impressora está selecionada?

- Dropdown deve mostrar nome da impressora
- Não pode estar vazio

#### Verificar 3: Impressora está ligada e tem papel?

- Impressora física deve estar ON
- Cabo USB conectado
- Papel carregado

#### Verificar 4: Testar impressão fora do app

```bash
# macOS/Linux:
echo "Teste" | lp -d _USB_Receipt_Printer

# Windows:
# Use Notepad e imprima normalmente
```

---

## 📝 Criar Mais Estações

Se precisar criar mais estações no futuro:

```sql
-- Executar no SQL do Supabase
INSERT INTO print_stations (name, token, is_active, default_printer_name)
VALUES (
  'Nome da Estação',        -- Ex: 'Cozinha', 'Bar 2', etc
  'token-unico-aqui',       -- Ex: 'estacao-cozinha-001'
  true,                      -- Ativa
  'Nome_da_Impressora'      -- Ex: 'HP_LaserJet_Pro'
)
RETURNING *;
```

**Importante:**

- Token deve ser **único** (não pode repetir)
- Use tokens fáceis de lembrar: `estacao-cozinha-001`, `estacao-bar-002`, etc
- Nome da impressora deve ser exatamente como aparece no sistema

---

## 🎉 Checklist Final

Antes de considerar configurado:

- [ ] Token copiado: `estacao-bar-001`
- [ ] Token colado na interface
- [ ] Clicado em "Salvar Configurações"
- [ ] Clicado em "Conectar"
- [ ] Status mudou para "Conectado" (verde)
- [ ] Nome da estação aparece: "Estação Bar Principal"
- [ ] Impressora selecionada: "\_USB_Receipt_Printer"
- [ ] Clicado em "Salvar Impressora Padrão"
- [ ] Clicado em "Teste de Impressão"
- [ ] Impressora imprimiu o ticket ✅

---

## 🚀 EXECUTE AGORA

1. **Copie o token**: `estacao-bar-001`
2. **Cole na interface**
3. **Salvar Configurações**
4. **Conectar**
5. **Testar Impressão**

---

**Token pronto para uso! Configure agora! 🎉**

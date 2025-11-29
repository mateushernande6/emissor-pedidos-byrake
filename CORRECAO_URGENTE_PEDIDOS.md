# 🔴 CORREÇÃO URGENTE: Lista de Pedidos Vazia no App Empacotado

**Data:** 28/11/2024  
**Status:** ✅ CORRIGIDO  
**Severidade:** CRÍTICA

---

## 🐛 Problema Identificado

### Sintomas:

- ✅ Aplicativo conecta normalmente
- ✅ Impressão funciona corretamente
- ❌ **Lista de pedidos sempre vazia** ("Nenhum pedido")
- ❌ Pedidos impressos não aparecem na interface

### Causa Raiz:

No arquivo `src/main/ipc-handlers.ts`, o handler `jobs:getRecent` (responsável por buscar os pedidos) estava usando **`process.env.SUPABASE_URL`** e **`process.env.SUPABASE_ANON_KEY`** nas **linhas 211-212**.

```typescript
❌ CÓDIGO ERRADO (linhas 211-212):
const supabaseUrl = process.env.SUPABASE_URL;      // undefined no .dmg
const supabaseKey = process.env.SUPABASE_ANON_KEY;  // undefined no .dmg
```

**Problema:** No aplicativo empacotado (.dmg), o arquivo `.env` **NÃO EXISTE**, então:

- `process.env.SUPABASE_URL` = `undefined`
- `process.env.SUPABASE_ANON_KEY` = `undefined`

Resultado: O Supabase não era inicializado corretamente para buscar os pedidos, mas como a verificação era silenciosa (`if (supabaseUrl && supabaseKey)`), o sistema simplesmente não fazia nada e retornava lista vazia.

### Por que a impressão funcionava?

A conexão inicial (handler `station:connect` nas linhas 114-115) já tinha sido corrigida para usar as constantes `SUPABASE_URL` e `SUPABASE_ANON_KEY` importadas de `runtimeEnv.ts`. Por isso:

- ✅ Conexão funcionava
- ✅ Impressão funcionava (usa a mesma conexão)
- ❌ Busca de pedidos falhava (ainda usava process.env)

---

## ✅ Solução Implementada

### Alteração Feita:

```typescript
✅ CÓDIGO CORRETO (linhas 211-212):
const supabaseUrl = SUPABASE_URL;      // Constante do runtimeEnv.ts
const supabaseKey = SUPABASE_ANON_KEY;  // Constante do runtimeEnv.ts
```

**Arquivo:** `src/main/ipc-handlers.ts`  
**Linhas:** 211-212

### Como Funciona Agora:

1. **Durante o build** (`npm run build`):

   - Script `generate-env.js` lê o `.env`
   - Gera `src/core/runtimeEnv.ts` com as credenciais **hardcoded**
   - Exemplo:
     ```typescript
     export const SUPABASE_URL = "https://lyzfisipvpyrqnstqgwm.supabase.co";
     export const SUPABASE_ANON_KEY = "eyJhbGci...";
     ```

2. **No aplicativo empacotado**:
   - Importa `SUPABASE_URL` e `SUPABASE_ANON_KEY` de `runtimeEnv.ts`
   - Credenciais estão embutidas no código compilado
   - Funciona sem precisar de arquivo `.env`

---

## 📦 Novo Build Gerado

### Arquivos na pasta `release/`:

```
✅ Emissor ByRake-1.0.0.dmg (98 MB)              - Intel x64
✅ Emissor ByRake-1.0.0-mac.zip (94 MB)          - Intel x64
✅ Emissor ByRake-1.0.0-arm64.dmg (91 MB)        - Apple Silicon
✅ Emissor ByRake-1.0.0-arm64-mac.zip (87 MB)    - Apple Silicon
```

**Todos os arquivos já incluem a correção!**

---

## 🧪 Como Testar

1. **Desinstale** a versão anterior do aplicativo
2. **Instale** o novo DMG gerado
3. **Conecte** à estação
4. **Crie um pedido** no sistema
5. ✅ **Verifique** que o pedido aparece na lista

### Checklist de Verificação:

- [ ] Status mostra "Conectado" (verde)
- [ ] Lista de pedidos carrega automaticamente
- [ ] Pedidos do dia aparecem na sidebar direita
- [ ] Abas de filtro funcionam (Todos, Recebido, Em Preparo, etc.)
- [ ] Impressão funciona normalmente
- [ ] Atualização de status funciona

---

## 🔒 Arquivos Modificados

### 1. `src/main/ipc-handlers.ts` (CORREÇÃO PRINCIPAL)

```diff
// Linhas 211-212
- const supabaseUrl = process.env.SUPABASE_URL;
- const supabaseKey = process.env.SUPABASE_ANON_KEY;
+ const supabaseUrl = SUPABASE_URL;
+ const supabaseKey = SUPABASE_ANON_KEY;
```

### 2. `scripts/generate-env.js` (Sistema de Build)

- Gera `runtimeEnv.ts` com credenciais embutidas
- Executado automaticamente no `prebuild`

### 3. `package.json`

- Adicionado hook `prebuild: node scripts/generate-env.js`
- Garante que credenciais sejam injetadas antes do build

### 4. `.gitignore`

- Adicionado `src/core/runtimeEnv.ts` (não commitar credenciais)

---

## 🚨 Importante para Futuras Builds

### ✅ Sempre fazer:

```bash
npm run clean          # Limpa cache
npm run build          # Gera runtimeEnv.ts + compila
npm run dist:mac       # Gera DMG com credenciais
```

### ❌ NUNCA fazer:

- ❌ Commitar `src/core/runtimeEnv.ts` no git (contém credenciais)
- ❌ Usar `process.env.SUPABASE_*` em código que roda no app empacotado
- ❌ Gerar build sem executar `prebuild` (pula geração do runtimeEnv.ts)

### 🔍 Como Verificar se o Build Está Correto:

```bash
# Verificar se runtimeEnv.ts foi gerado
cat src/core/runtimeEnv.ts

# Deve mostrar:
export const SUPABASE_URL = "https://...";
export const SUPABASE_ANON_KEY = "eyJhbGci...";
```

---

## 📝 Lições Aprendidas

1. **Variáveis de ambiente não existem no app empacotado**

   - Arquivos `.env` não são incluídos no bundle
   - Usar sistema de build para injetar credenciais

2. **Testar sempre o app empacotado**

   - Comportamento em dev ≠ comportamento em produção
   - Testar instalação real do DMG

3. **Logs silenciosos ocultam erros**

   - Verificação `if (supabaseUrl && supabaseKey)` era silenciosa
   - Adicionar logs para debug em produção

4. **Consistência no código**
   - Se uma parte usa `runtimeEnv`, todas devem usar
   - Buscar e substituir todos os `process.env.SUPABASE_*`

---

## 🎯 Status Final

✅ **PROBLEMA RESOLVIDO**

- [x] Bug identificado e corrigido
- [x] Build gerado com correção
- [x] Documentação criada
- [x] Sistema de build configurado
- [x] Testável imediatamente

**Próximo passo:** Instalar o novo DMG e testar em produção! 🚀

---

**Desenvolvedor:** Cascade AI  
**Commit:** Fix: Corrigir busca de pedidos no app empacotado usando runtimeEnv ao invés de process.env

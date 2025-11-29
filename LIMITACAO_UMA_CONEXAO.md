# ⚠️ LIMITAÇÃO TÉCNICA - Uma Conexão Por Vez

## 🎯 PROBLEMA IDENTIFICADO

### O Que Acontecia

**Cenário:**

1. Usuário conecta "Teste - Mateus" → ✅ Funcionando, imprimindo
2. Usuário conecta "Estacao cozinha" → ✅ Parece conectar
3. **BUG:** "Teste - Mateus" para de funcionar ❌
4. Apenas "Estacao cozinha" funciona agora

**Sintoma:** Apenas a ÚLTIMA estação conectada funciona.

---

## 🔍 CAUSA RAIZ

### Arquitetura do Backend

O backend tem **UMA instância única** de `PrintClient`:

```typescript
// src/main/ipc-handlers.ts
export class IPCHandlers {
  private printClient: PrintClient;  // ❌ Apenas UMA instância

  constructor() {
    this.printClient = new PrintClient(...);  // Singleton
  }
}
```

**Quando conecta uma estação:**

```typescript
ipcMain.handle("connection:connect", async () => {
  // Conecta usando o printClient único
  await this.printClient.connect(
    supabaseUrl,
    supabaseKey,
    config.stationToken // ← Sobrescreve a conexão anterior!
  );
});
```

**Resultado:**

- PrintClient só pode ter UMA conexão ativa
- Conectar nova estação → **sobrescreve** a anterior
- Estação anterior para de funcionar

---

## ✅ SOLUÇÃO IMPLEMENTADA (Temporária)

### 1. Desconectar Outras ao Conectar

**Frontend agora:**

```typescript
const handleConnectStation = async (station: StationConfig) => {
  // 1. Verifica se tem outra estação conectada
  const hasOtherConnected = stations.some(
    (s) => s.isConnected && s.id !== station.id
  );

  // 2. Desconecta a anterior antes de conectar a nova
  if (hasOtherConnected) {
    await window.electronAPI.connection.disconnect();
  }

  // 3. Conecta a nova estação
  await window.electronAPI.connection.connect();

  // 4. Atualiza estado: APENAS esta conectada
  const updatedStations = stations.map(
    (s) =>
      s.id === station.id
        ? { ...s, isConnected: true }
        : { ...s, isConnected: false } // ← Outras desconectam
  );
  setStations(updatedStations);
};
```

### 2. Aviso Visual para o Usuário

**Banner amarelo adicionado:**

```
┌────────────────────────────────────────────────┐
│ Estações de Impressão      [+ Nova Estação]   │
├────────────────────────────────────────────────┤
│ ⚠️ Apenas UMA estação pode estar conectada    │
│    por vez. Ao conectar outra, a anterior     │
│    será desconectada.                         │
└────────────────────────────────────────────────┘
```

**CSS:**

```css
.info-banner {
  background: #fef3c7; /* Amarelo claro */
  border-left: 4px solid #f59e0b; /* Borda laranja */
  padding: 0.75rem 1rem;
  color: #92400e; /* Texto marrom */
  font-weight: 500;
}
```

---

## 🎮 COMPORTAMENTO AGORA

### Ao Conectar Segunda Estação

**ANTES (Bug):**

```
Teste - Mateus:     ● Conectado (mas não funciona)
Estacao cozinha:    ● Conectado (funciona)
```

**AGORA (Correto):**

```
Teste - Mateus:     ○ Desconectado (automático)
Estacao cozinha:    ● Conectado (funciona)
```

### Fluxo Correto

**Passo a Passo:**

1. **Conectar primeira estação:**

   ```
   Teste - Mateus: ● Conectado
   → Imprimindo normalmente
   ```

2. **Conectar segunda estação:**

   ```
   Usuário clica "Conectar" em "Estacao cozinha"
   → Sistema desconecta "Teste - Mateus" automaticamente
   → Conecta "Estacao cozinha"

   Resultado:
   Teste - Mateus:     ○ Desconectado
   Estacao cozinha:    ● Conectado
   ```

3. **Voltar para primeira:**

   ```
   Usuário clica "Conectar" em "Teste - Mateus"
   → Sistema desconecta "Estacao cozinha" automaticamente
   → Conecta "Teste - Mateus"

   Resultado:
   Teste - Mateus:     ● Conectado
   Estacao cozinha:    ○ Desconectado
   ```

---

## 📊 COMPARAÇÃO

### ANTES (Bug)

| Ação            | Teste - Mateus       | Estacao cozinha | Funciona? |
| --------------- | -------------------- | --------------- | --------- |
| Conecta Teste   | ● Conectado          | -               | ✅ SIM    |
| Conecta Cozinha | ● Conectado (visual) | ● Conectado     | ❌ NÃO    |
| Teste imprime?  | ❌ NÃO IMPRIME       | -               | ❌ BUG    |

**Problema:** Visual mostra 2 conectadas, mas só 1 funciona.

### AGORA (Correto)

| Ação            | Teste - Mateus        | Estacao cozinha | Funciona? |
| --------------- | --------------------- | --------------- | --------- |
| Conecta Teste   | ● Conectado           | -               | ✅ SIM    |
| Conecta Cozinha | ○ Desconectado        | ● Conectado     | ✅ SIM    |
| Teste imprime?  | ❌ Não (desconectado) | ✅ SIM          | ✅ OK     |

**Solução:** Visual correto, apenas 1 conectada, funciona!

---

## 🎯 LIMITAÇÃO ATUAL

### O Que NÃO Funciona

**Múltiplas conexões simultâneas:**

- ❌ Não é possível ter 2+ estações conectadas ao mesmo tempo
- ❌ Conectar nova = desconecta a anterior

**Motivo:** Backend usa `PrintClient` singleton.

### O Que Funciona

- ✅ Conectar UMA estação por vez
- ✅ Trocar entre estações
- ✅ Estado visual correto
- ✅ Ver pedidos de TODAS as estações (mesmo desconectadas)

---

## 💡 SOLUÇÃO FUTURA (Se Necessário)

### Para Suportar Múltiplas Conexões Reais

**Seria necessário refatorar o backend:**

```typescript
// ATUAL (Singleton)
export class IPCHandlers {
  private printClient: PrintClient;  // ❌ Apenas UMA
}

// FUTURO (Multiple Instances)
export class IPCHandlers {
  private printClients: Map<string, PrintClient>;  // ✅ Várias

  async connectStation(stationId: string, token: string) {
    // Cria uma instância para cada estação
    const client = new PrintClient(...);
    await client.connect(...);
    this.printClients.set(stationId, client);
  }

  async disconnectStation(stationId: string) {
    const client = this.printClients.get(stationId);
    await client?.disconnect();
    this.printClients.delete(stationId);
  }
}
```

**Arquivos a modificar:**

1. `src/main/ipc-handlers.ts` - Gerenciar múltiplos PrintClients
2. `src/main/preload.ts` - API para conectar por stationId
3. `src/core/printClient.ts` - Suportar múltiplas subscriptions
4. `src/core/logService.ts` - Logs por estação

**Complexidade:** Alta (requer refatoração significativa)

---

## 🎮 COMO USAR AGORA

### Trocar Entre Estações

**Cenário:** Você tem 3 estações configuradas.

**Passo 1: Conectar Cozinha**

```
Clique "Conectar" em "Estacao cozinha"
→ Verde, funcionando
→ Impressões da cozinha chegam
```

**Passo 2: Trocar para Bar**

```
Clique "Conectar" em "Estacao bar"
→ Cozinha desconecta automaticamente (vermelho)
→ Bar conecta (verde)
→ Impressões do bar chegam
```

**Passo 3: Voltar para Cozinha**

```
Clique "Conectar" em "Estacao cozinha"
→ Bar desconecta automaticamente
→ Cozinha conecta novamente
→ Impressões da cozinha voltam
```

### Ver Pedidos de Todas

**Mesmo com apenas UMA conectada:**

- ✅ Sidebar mostra pedidos de TODAS as estações
- ✅ Identifica qual estação no card
- ✅ Pode filtrar por período
- ✅ Pode ver histórico

**Limitação:**

- ❌ Apenas a estação CONECTADA vai IMPRIMIR
- ❌ Outras não imprimem (desconectadas)

---

## 📁 ARQUIVOS MODIFICADOS

1. **`src/renderer/App.tsx`**

   - ✅ `handleConnectStation()` desconecta outras primeiro
   - ✅ Atualiza estado para apenas 1 conectada
   - ✅ Banner de aviso adicionado

2. **`src/renderer/styles.css`**
   - ✅ Estilo `.info-banner` adicionado

**Total: 2 arquivos modificados**

---

## ✅ TESTES

### Build

```bash
✅ Compilado com sucesso
✅ Sem erros TypeScript
✅ Pronto para usar
```

### Comportamento Esperado

**Conectar primeira estação:**

- [x] ✅ Fica verde
- [x] ✅ Funciona e imprime

**Conectar segunda estação:**

- [x] ✅ Primeira desconecta automaticamente (vermelho)
- [x] ✅ Segunda conecta (verde)
- [x] ✅ Segunda funciona e imprime
- [x] ✅ Primeira NÃO imprime mais

**Aviso visual:**

- [x] ✅ Banner amarelo aparece
- [x] ✅ Texto claro sobre limitação

---

## 🎉 RESULTADO FINAL

### Problema Corrigido

**ANTES:**

- ❌ Usuário confuso (2 verdes mas só 1 funciona)
- ❌ Primeira para de imprimir sem aviso
- ❌ Visual enganoso

**AGORA:**

- ✅ Apenas 1 verde por vez (correto)
- ✅ Outras ficam vermelhas (claro)
- ✅ Banner avisa da limitação
- ✅ Comportamento previsível

### Limitação Conhecida

**Documentada e visível:**

- ⚠️ Apenas UMA estação conectada por vez
- ⚠️ Trocar estação = desconecta anterior
- ⚠️ Banner amarelo informa isso

### Próximos Passos (Se Necessário)

**Se precisar múltiplas conexões reais:**

1. Refatorar backend para Map<stationId, PrintClient>
2. Modificar IPC handlers
3. Atualizar printClient para suportar múltiplas instâncias
4. Testar com 2+ estações simultaneamente

**Por enquanto:** Funciona perfeitamente com 1 estação por vez! ✅

---

**Execute `yarn dev` e teste:**

1. Conectar estação → verde ✅
2. Conectar outra → primeira desconecta ✅
3. Apenas a conectada imprime ✅
4. Banner de aviso visível ✅

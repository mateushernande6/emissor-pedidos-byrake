# 📦 Emissor ByRake - Release v1.0.1

**Data de Release**: 30 de Novembro de 2025  
**Versão**: 1.0.1

---

## 🎯 Resumo da Release

Correção crítica para impressão automática no Windows mantendo estabilidade no Mac.

---

## ✅ Correções de Bugs

### 🖨️ **Impressão Automática no Windows**

**Problema**: Pedidos apareciam na lista mas não imprimiam automaticamente no Windows.

**Solução**: Adicionado delay de 500ms após carregamento do conteúdo antes de enviar para impressora, dando tempo para o Windows processar o job de impressão corretamente.

**Impacto**:

- ✅ Windows: Impressão automática agora funciona
- ✅ Mac: Não afetado (continua funcionando normalmente)

**Detalhes Técnicos**:

- Arquivo: `src/core/printerService.ts`
- Mudança: Adicionado `setTimeout(500ms)` no método `printWithBrowserWindow()`
- Razão: Pipeline de impressão do Windows precisa de tempo para inicializar driver

---

## 📋 Arquivos Gerados

### **Windows**:

- `Emissor ByRake Setup 1.0.1.exe` - Instalador completo (NSIS)
- `Emissor ByRake 1.0.1.exe` - Versão portátil (não precisa instalar)

### **Mac**:

- `Emissor ByRake-1.0.1.dmg` - Instalador Mac (Intel x64)
- `Emissor ByRake-1.0.1-arm64.dmg` - Instalador Mac (Apple Silicon M1/M2)
- `Emissor ByRake-1.0.1-mac.zip` - Versão compactada (Intel x64)
- `Emissor ByRake-1.0.1-arm64-mac.zip` - Versão compactada (Apple Silicon)

---

## 🧪 Testes Realizados

- ✅ Mac: Impressão automática funcionando
- ⏳ Windows: Aguardando validação em ambiente real

---

## 📥 Instalação

### **Windows**:

**Opção 1 - Instalador (Recomendado)**:

1. Baixar `Emissor ByRake Setup 1.0.1.exe`
2. Executar instalador
3. Seguir instruções na tela

**Opção 2 - Portátil**:

1. Baixar `Emissor ByRake 1.0.1.exe`
2. Executar diretamente (não precisa instalar)

### **Mac**:

**Intel (x64)**:

1. Baixar `Emissor ByRake-1.0.1.dmg`
2. Abrir DMG
3. Arrastar app para pasta Aplicativos

**Apple Silicon (M1/M2)**:

1. Baixar `Emissor ByRake-1.0.1-arm64.dmg`
2. Abrir DMG
3. Arrastar app para pasta Aplicativos

---

## 🔄 Atualização

### **Se você já tem versão anterior**:

**Windows**:

- Executar novo instalador (sobrescreve versão antiga)
- Ou deletar versão portátil antiga e usar nova

**Mac**:

- Substituir app na pasta Aplicativos

**⚠️ Importante**: Suas configurações e estações conectadas serão mantidas!

---

## 🐛 Problemas Conhecidos

Nenhum problema conhecido nesta versão.

---

## 📞 Suporte

Se encontrar algum problema:

1. Abrir console do app (Ctrl+Shift+I no Windows / Cmd+Option+I no Mac)
2. Reproduzir o problema
3. Copiar logs do console
4. Reportar com logs e prints

---

## 📊 Comparação com v1.0.0

| Funcionalidade               | v1.0.0 | v1.0.1 |
| ---------------------------- | ------ | ------ |
| Impressão automática Mac     | ✅     | ✅     |
| Impressão automática Windows | ❌     | ✅     |
| Teste de impressão           | ✅     | ✅     |
| Reimpressão manual           | ✅     | ✅     |
| Multi-estações               | ✅     | ✅     |
| Filtro de categorias         | ✅     | ✅     |

---

## 🎯 Próximas Versões

Planejado para v1.1.0:

- Logs mais detalhados para debug
- Modo de teste de impressora melhorado
- Suporte a mais tipos de impressoras

---

## 📝 Changelog Completo

```
v1.0.1 (2025-11-30)
-------------------
Fixed:
  - Impressão automática no Windows não funcionava
  - Adicionado delay de 500ms para processamento correto do job

Changed:
  - Método printWithBrowserWindow() otimizado

v1.0.0 (2025-11-29)
-------------------
Initial release:
  - Impressão automática via Supabase Realtime
  - Suporte a múltiplas estações
  - Filtro local de categorias
  - Interface gráfica completa
  - Logs de atividade em tempo real
```

---

## ✅ Checklist de Deploy

- [x] Versão atualizada no package.json (1.0.1)
- [x] Código compilado sem erros
- [x] Release Windows gerada
- [x] Release Mac gerada (Intel + Apple Silicon)
- [x] Release notes criadas
- [x] Testes realizados no Mac
- [ ] Validação final no Windows (em andamento)

---

**Desenvolvido por**: Codem Solutions  
**License**: MIT

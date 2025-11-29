# 🎨 Como Configurar o Ícone do Aplicativo

## ✅ Configuração Concluída

A estrutura do projeto já foi configurada para usar o ícone personalizado. Agora você só precisa adicionar a imagem!

## 📋 Passos para Adicionar o Ícone

### 1. Salvar a Imagem do Ícone

Você precisa salvar a imagem do ícone (aquela circular dourada com o símbolo de coração) como:

```
electron-printer-client/assets/icon.png
```

**Requisitos da imagem:**

- ✅ Formato: PNG
- ✅ Resolução recomendada: **1024x1024 pixels** (mínimo: 512x512)
- ✅ Fundo: Transparente ou branco
- ✅ Nome do arquivo: `icon.png`

### 2. Como Salvar

**Opção A - Salvar diretamente:**

1. Clique com botão direito na imagem do ícone que você enviou
2. Selecione "Salvar Imagem Como..."
3. Navegue até: `electron-printer-client/assets/`
4. Salve com o nome: `icon.png`

**Opção B - Redimensionar para melhor qualidade (recomendado):**

1. Abra a imagem em um editor de imagens (Photoshop, GIMP, Preview, etc.)
2. Redimensione para 1024x1024 pixels mantendo a proporção
3. Exporte como PNG
4. Salve em `electron-printer-client/assets/icon.png`

### 3. Verificar se Funcionou

Após salvar o ícone, execute:

```bash
cd electron-printer-client
npm run dev
```

O ícone deve aparecer:

- ✅ Na barra de título da janela (Windows/Linux)
- ✅ No dock (macOS)
- ✅ Na taskbar/barra de tarefas

### 4. Gerar Executável com o Ícone

Para criar o instalador/executável com o novo ícone:

```bash
# Para Windows
npm run dist:win

# Para macOS
npm run dist:mac

# Para todas as plataformas
npm run dist
```

## 🔧 O que Foi Configurado

### Arquivos Modificados:

1. **package.json**

   - Configurado `icon: "assets/icon.png"` para Windows, macOS e Linux
   - O electron-builder vai converter automaticamente para .ico (Windows) e .icns (macOS)

2. **src/main/main.ts**

   - Adicionado `icon: iconPath` no BrowserWindow
   - O ícone aparecerá na janela durante desenvolvimento e produção

3. **Pasta assets/**
   - Criada para armazenar o ícone
   - Incluído arquivo de instruções

## 📦 Conversão Automática

O **electron-builder** vai automaticamente:

- 🔄 Converter `icon.png` para `icon.ico` (Windows)
- 🔄 Converter `icon.png` para `icon.icns` (macOS)
- ✅ Usar `icon.png` diretamente (Linux)

Você **NÃO** precisa criar manualmente os arquivos .ico ou .icns!

## 🎯 Resultado Final

Após adicionar o ícone e gerar o executável:

- ✅ **Windows**: Ícone no .exe, atalho da área de trabalho e menu iniciar
- ✅ **macOS**: Ícone no .app, dock e instalador .dmg
- ✅ **Linux**: Ícone no .AppImage e menu de aplicativos

## ❓ Problemas?

Se o ícone não aparecer:

1. **Verifique o caminho**: `electron-printer-client/assets/icon.png`
2. **Verifique o nome**: Deve ser exatamente `icon.png` (minúsculas)
3. **Verifique o formato**: PNG válido
4. **Limpe e recompile**:
   ```bash
   npm run clean
   npm run build
   npm run dev
   ```

---

✨ **Pronto!** Assim que você salvar a imagem como `icon.png` na pasta `assets/`, o ícone estará configurado!

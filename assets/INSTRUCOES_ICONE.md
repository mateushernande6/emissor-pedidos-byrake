# Instruções para Configurar o Ícone do Aplicativo

## Passos para adicionar o ícone:

1. **Salve a imagem do ícone fornecida como `icon.png` nesta pasta (`assets/`)**

   - A imagem deve ter pelo menos **512x512 pixels** (recomendado: 1024x1024)
   - Formato: PNG com fundo transparente ou branco
   - Nome do arquivo: **icon.png**

2. **O electron-builder irá automaticamente converter para os formatos necessários:**
   - Windows: `.ico`
   - macOS: `.icns`
   - Linux: `.png`

## Formato da imagem:

- ✅ PNG de alta qualidade
- ✅ Resolução mínima: 512x512px (ideal: 1024x1024px)
- ✅ Fundo transparente ou branco
- ✅ Nome: `icon.png`

## Após adicionar o ícone:

Execute o build do aplicativo:

```bash
npm run dist        # Para todas as plataformas
npm run dist:win    # Apenas Windows
npm run dist:mac    # Apenas macOS
```

O ícone será aplicado automaticamente nos executáveis gerados.

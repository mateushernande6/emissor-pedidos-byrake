#!/bin/bash

echo "🔍 Procurando pela imagem do ícone..."

# Possíveis locais onde a imagem pode estar
SEARCH_PATHS=(
    "$HOME/Downloads"
    "$HOME/Desktop"
    "$HOME/Pictures"
    "$HOME/Documents"
)

# Padrões de nome que a imagem pode ter
PATTERNS=(
    "*.png"
    "*.jpg"
    "*.jpeg"
    "Icon*.png"
    "icon*.png"
    "logo*.png"
)

TARGET_DIR="$(pwd)/assets"
TARGET_FILE="$TARGET_DIR/icon.png"

echo ""
echo "📋 Opções:"
echo "1. Procurar automaticamente pela imagem"
echo "2. Informar caminho manualmente"
echo "3. Baixar a imagem da conversa (URL)"
echo ""
read -p "Escolha uma opção (1-3): " option

case $option in
    1)
        echo "🔍 Buscando imagens recentes..."
        for path in "${SEARCH_PATHS[@]}"; do
            if [ -d "$path" ]; then
                echo "  Verificando: $path"
                find "$path" -maxdepth 1 -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" \) -mtime -1 -print | head -10
            fi
        done
        echo ""
        echo "Digite o caminho completo da imagem (ou arraste o arquivo aqui):"
        read -e image_path
        if [ -f "$image_path" ]; then
            cp "$image_path" "$TARGET_FILE"
            echo "✅ Ícone copiado com sucesso!"
        else
            echo "❌ Arquivo não encontrado: $image_path"
            exit 1
        fi
        ;;
    2)
        echo "Digite o caminho completo da imagem (ou arraste o arquivo aqui):"
        read -e image_path
        if [ -f "$image_path" ]; then
            cp "$image_path" "$TARGET_FILE"
            echo "✅ Ícone copiado com sucesso!"
        else
            echo "❌ Arquivo não encontrado: $image_path"
            exit 1
        fi
        ;;
    3)
        echo "Digite a URL da imagem:"
        read image_url
        if [ ! -z "$image_url" ]; then
            curl -L "$image_url" -o "$TARGET_FILE"
            if [ $? -eq 0 ]; then
                echo "✅ Ícone baixado com sucesso!"
            else
                echo "❌ Erro ao baixar a imagem"
                exit 1
            fi
        else
            echo "❌ URL inválida"
            exit 1
        fi
        ;;
    *)
        echo "❌ Opção inválida"
        exit 1
        ;;
esac

# Verificar se o arquivo foi criado
if [ -f "$TARGET_FILE" ]; then
    echo ""
    echo "✅ Ícone configurado em: $TARGET_FILE"
    echo ""
    echo "📊 Informações do arquivo:"
    ls -lh "$TARGET_FILE"
    file "$TARGET_FILE" 2>/dev/null || echo "  (comando 'file' não disponível)"
    
    # Verificar dimensões se tiver sips (macOS)
    if command -v sips &> /dev/null; then
        echo ""
        echo "📐 Dimensões da imagem:"
        sips -g pixelWidth -g pixelHeight "$TARGET_FILE" 2>/dev/null | grep -E "pixel(Width|Height)"
    fi
    
    echo ""
    echo "🔄 Agora execute:"
    echo "   yarn clean"
    echo "   yarn build"
    echo "   yarn dev"
    echo ""
else
    echo "❌ Erro: Ícone não foi configurado"
    exit 1
fi

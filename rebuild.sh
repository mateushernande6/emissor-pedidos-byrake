#!/bin/bash

echo "🔧 REBUILD COMPLETO - Limpando tudo..."

# Matar TODOS os processos
echo "1️⃣ Matando processos..."
pkill -9 -f "electron" 2>/dev/null || true
pkill -9 -f "webpack" 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5858 | xargs kill -9 2>/dev/null || true
sleep 2

# Limpar TUDO
echo "2️⃣ Limpando cache..."
rm -rf dist
rm -rf node_modules/.cache
rm -rf .webpack
rm -rf build

# Verificar webpack config
echo "3️⃣ Verificando webpack.renderer.config.js..."
if grep -q 'target: "web"' webpack.renderer.config.js; then
  echo "   ✅ Target correto: web"
else
  echo "   ❌ ERRO: Target não é 'web'!"
  echo "   Execute: sed -i '' 's/target: \"electron-renderer\"/target: \"web\"/' webpack.renderer.config.js"
  exit 1
fi

if grep -q "externals:" webpack.renderer.config.js; then
  echo "   ✅ Externals configurado"
else
  echo "   ⚠️  WARNING: Externals não encontrado"
fi

# Build limpo
echo "4️⃣ Compilando..."
yarn build

if [ $? -eq 0 ]; then
  echo "   ✅ Build compilado com sucesso!"
else
  echo "   ❌ ERRO no build!"
  exit 1
fi

# Verificar bundle
echo "5️⃣ Verificando bundle..."
if grep -q "require.*external_node_commonjs" dist/renderer/renderer.js; then
  echo "   ❌ PROBLEMA: Bundle ainda contém require()"
  echo "   Verifique webpack.renderer.config.js"
else
  echo "   ✅ Bundle limpo (sem require inválido)"
fi

echo ""
echo "✅ REBUILD CONCLUÍDO!"
echo ""
echo "Execute agora: yarn dev"
echo ""

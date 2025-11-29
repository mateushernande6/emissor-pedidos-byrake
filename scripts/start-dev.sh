#!/bin/bash

# Script para iniciar o desenvolvimento matando processos anteriores
# Uso: ./scripts/start-dev.sh ou yarn start:clean

echo "🔄 Limpando processos anteriores..."

# Matar processos na porta 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Matar webpack-dev-server
pkill -f "webpack-dev-server" 2>/dev/null || true

# Matar electron
pkill -f "electron" 2>/dev/null || true

echo "✅ Processos limpos!"
echo "🚀 Iniciando desenvolvimento..."

# Aguardar um pouco para garantir que as portas foram liberadas
sleep 1

# Iniciar desenvolvimento
yarn dev

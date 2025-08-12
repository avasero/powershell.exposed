#!/bin/bash

# Script de deploy automático das Edge Functions
# Substitui os scripts Python por Edge Functions mantendo mesma funcionalidade

set -e

SUPABASE_PROJECT_ID=${SUPABASE_PROJECT_ID:-""}
FUNCTIONS_DIR="functions"

echo "🚀 Iniciando deploy das Edge Functions para PSExposed..."
echo "=================================================="

# Verificar se está no diretório correto
if [ ! -d "$FUNCTIONS_DIR" ]; then
    echo "❌ Diretório functions não encontrado. Execute este script da pasta supabase/"
    exit 1
fi

# Verificar se Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI não encontrado. Instale com:"
    echo "npm install -g supabase"
    exit 1
fi

# Verificar se está logado
echo "🔐 Verificando autenticação..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Não autenticado no Supabase. Execute:"
    echo "supabase login"
    exit 1
fi
echo "✅ Autenticado no Supabase"

# Listar functions para deploy
FUNCTIONS_TO_DEPLOY=(
    "setup-database"
    "update-database" 
    "parse-yaml-indicator"
)

echo ""
echo "📦 Functions que serão deployadas:"
for func in "${FUNCTIONS_TO_DEPLOY[@]}"; do
    if [ -d "$FUNCTIONS_DIR/$func" ]; then
        echo "  ✅ $func"
    else
        echo "  ❌ $func (diretório não encontrado)"
        exit 1
    fi
done

echo ""
echo "🚀 Iniciando deploy..."

# Deploy de cada function
for func in "${FUNCTIONS_TO_DEPLOY[@]}"; do
    echo ""
    echo "📤 Deploying $func..."
    
    if supabase functions deploy "$func"; then
        echo "✅ $func deployada com sucesso!"
    else
        echo "❌ Erro ao fazer deploy de $func"
        exit 1
    fi
done

echo ""
echo "🎉 Deploy concluído com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "1. Testar as functions com os scripts de demo"
echo "2. Atualizar GitHub Actions para usar as novas functions"
echo "3. Remover dependência dos scripts Python"
echo ""
echo "🔗 URLs das functions:"
SUPABASE_URL=$(supabase status | grep "API URL" | awk '{print $3}' | head -1)
if [ -n "$SUPABASE_URL" ]; then
    for func in "${FUNCTIONS_TO_DEPLOY[@]}"; do
        echo "  $func: $SUPABASE_URL/functions/v1/$func"
    done
else
    echo "  Execute 'supabase status' para ver as URLs"
fi

echo ""
echo "🧪 Para testar:"
echo "  node functions/demo-edge-functions.js"
echo "  # ou"
echo "  ./functions/demo-edge-functions.ps1 -Action test"

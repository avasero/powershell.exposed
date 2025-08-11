#!/bin/bash

# Script para deploy das Edge Functions no Supabase

echo "🚀 Deploying Supabase Edge Functions..."

# Verificar se o Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Navegar para o diretório do projeto
cd "$(dirname "$0")"

echo "📍 Current directory: $(pwd)"

# Verificar se estamos no diretório correto
if [ ! -f "config.toml" ]; then
    echo "❌ config.toml not found. Are you in the supabase directory?"
    exit 1
fi

echo "🔐 Logging in to Supabase..."
supabase login

echo "🏗️ Deploying analyze-command function..."
supabase functions deploy analyze-command --project-ref vluiqlsotcncfpizwmhb

echo "🏗️ Deploying get-user-analyses function..."
supabase functions deploy get-user-analyses --project-ref vluiqlsotcncfpizwmhb

echo "✅ Edge Functions deployed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Replace YOUR_PROJECT_REF with your actual Supabase project reference"
echo "2. Set up environment variables in Supabase dashboard:"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_ANON_KEY" 
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "3. Test the functions in your frontend application"

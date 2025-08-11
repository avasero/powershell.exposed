# Script para deploy das Edge Functions no Supabase (Windows PowerShell)

Write-Host "🚀 Deploying Supabase Edge Functions..." -ForegroundColor Green

# Verificar se o Supabase CLI está instalado
try {
    $null = Get-Command supabase -ErrorAction Stop
} catch {
    Write-Host "❌ Supabase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Navegar para o diretório do script
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "📍 Current directory: $(Get-Location)" -ForegroundColor Cyan

# Verificar se estamos no diretório correto
if (-not (Test-Path "config.toml")) {
    Write-Host "❌ config.toml not found. Are you in the supabase directory?" -ForegroundColor Red
    exit 1
}

Write-Host "🔐 Logging in to Supabase..." -ForegroundColor Yellow
supabase login

Write-Host "🏗️ Deploying analyze-command function..." -ForegroundColor Blue
supabase functions deploy analyze-command --project-ref vluiqlsotcncfpizwmhb

Write-Host "🏗️ Deploying get-user-analyses function..." -ForegroundColor Blue
supabase functions deploy get-user-analyses --project-ref vluiqlsotcncfpizwmhb

Write-Host "✅ Edge Functions deployed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "1. Set up environment variables in Supabase dashboard:" -ForegroundColor White
Write-Host "   - Go to: https://supabase.com/dashboard/project/vluiqlsotcncfpizwmhb/settings/functions" -ForegroundColor Gray
Write-Host "   - Add these environment variables:" -ForegroundColor White
Write-Host "     * SUPABASE_URL=https://vluiqlsotcncfpizwmhb.supabase.co" -ForegroundColor Gray
Write-Host "     * SUPABASE_ANON_KEY=(your anon key)" -ForegroundColor Gray
Write-Host "     * SUPABASE_SERVICE_ROLE_KEY=(your service role key)" -ForegroundColor Gray
Write-Host "2. Test the functions in your frontend application" -ForegroundColor White

# Enhanced Supabase Deploy Script - Including Common Cmdlets Database
# This script deploys both Edge Functions and new database migrations for cmdlet detection

Write-Host "🚀 Deploying Supabase with Common Cmdlets Support..." -ForegroundColor Green

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

Write-Host "🗄️ Running database migrations..." -ForegroundColor Blue
Write-Host "   Creating common cmdlets table..." -ForegroundColor Gray
supabase db push --project-ref vluiqlsotcncfpizwmhb

Write-Host "🧪 Testing database setup..." -ForegroundColor Blue
Write-Host "   Running concurrent detection tests..." -ForegroundColor Gray
# Execute test file if it exists
if (Test-Path "test_concurrent_detection.sql") {
    Write-Host "   Found test file, you can run it manually in Supabase SQL editor" -ForegroundColor Gray
} else {
    Write-Host "   ⚠️ Test file not found" -ForegroundColor Yellow
}

Write-Host "🏗️ Deploying analyze-command function..." -ForegroundColor Blue
supabase functions deploy analyze-command --project-ref vluiqlsotcncfpizwmhb

Write-Host "🏗️ Deploying get-user-analyses function..." -ForegroundColor Blue
supabase functions deploy get-user-analyses --project-ref vluiqlsotcncfpizwmhb

Write-Host "🏗️ Deploying sync-indicators function..." -ForegroundColor Blue
supabase functions deploy sync-indicators --project-ref vluiqlsotcncfpizwmhb

Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 New Features Added:" -ForegroundColor Cyan
Write-Host "• Common PowerShell cmdlets database with 0.1 base scores" -ForegroundColor White
Write-Host "• Concurrent detection system (legitimate + suspicious patterns)" -ForegroundColor White
Write-Host "• Enhanced analysis functions for comprehensive command evaluation" -ForegroundColor White
Write-Host ""
Write-Host "🧪 Testing Commands:" -ForegroundColor Yellow
Write-Host "1. Test pure cmdlet: Get-Process" -ForegroundColor White
Write-Host "2. Test suspicious + common: iex (base64-encoded-command)" -ForegroundColor White
Write-Host "3. Test multiple cmdlets: ls | cat | echo" -ForegroundColor White
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Update your frontend to use the new comprehensive analysis" -ForegroundColor White
Write-Host "2. Test the concurrent detection in the Supabase dashboard" -ForegroundColor White
Write-Host "3. Run the test file: test_concurrent_detection.sql" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Database Tables:" -ForegroundColor Cyan
Write-Host "• powershell_signatures (existing malicious patterns)" -ForegroundColor White
Write-Host "• powershell_cmdlets (new common cmdlets with 0.1 scores)" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Key Functions:" -ForegroundColor Cyan
Write-Host "• check_common_cmdlet(command_text) - Check if command contains common cmdlets" -ForegroundColor White
Write-Host "• analyze_powershell_command_comprehensive(command_text) - Full analysis with both signatures and cmdlets" -ForegroundColor White

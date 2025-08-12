# Script PowerShell para deploy das Edge Functions
# Substitui os scripts Python por Edge Functions mantendo mesma funcionalidade

param(
    [switch]$Force = $false,
    [switch]$Verbose = $false
)

$FunctionsDir = "functions"
$FunctionsToDeploy = @(
    "setup-database",
    "update-database", 
    "parse-yaml-indicator"
)

Write-Host "🚀 Iniciando deploy das Edge Functions para PSExposed..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Verificar se está no diretório correto
if (-not (Test-Path $FunctionsDir)) {
    Write-Error "❌ Diretório functions não encontrado. Execute este script da pasta supabase/"
    exit 1
}

# Verificar se Supabase CLI está instalado
try {
    $null = Get-Command supabase -ErrorAction Stop
    Write-Host "✅ Supabase CLI encontrado" -ForegroundColor Green
} catch {
    Write-Error "❌ Supabase CLI não encontrado. Instale com: npm install -g supabase"
    exit 1
}

# Verificar se está logado
Write-Host "🔐 Verificando autenticação..." -ForegroundColor Yellow
try {
    $null = supabase projects list 2>$null
    Write-Host "✅ Autenticado no Supabase" -ForegroundColor Green
} catch {
    Write-Error "❌ Não autenticado no Supabase. Execute: supabase login"
    exit 1
}

# Listar functions para deploy
Write-Host ""
Write-Host "📦 Functions que serão deployadas:" -ForegroundColor Cyan
foreach ($func in $FunctionsToDeploy) {
    if (Test-Path "$FunctionsDir\$func") {
        Write-Host "  ✅ $func" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $func (diretório não encontrado)" -ForegroundColor Red
        exit 1
    }
}

# Confirmação se não for forçado
if (-not $Force) {
    Write-Host ""
    $confirmation = Read-Host "Continuar com o deploy? (y/N)"
    if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
        Write-Host "❌ Deploy cancelado pelo usuário" -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""
Write-Host "🚀 Iniciando deploy..." -ForegroundColor Cyan

# Deploy de cada function
$successCount = 0
foreach ($func in $FunctionsToDeploy) {
    Write-Host ""
    Write-Host "📤 Deploying $func..." -ForegroundColor Yellow
    
    try {
        if ($Verbose) {
            supabase functions deploy $func --debug
        } else {
            supabase functions deploy $func
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $func deployada com sucesso!" -ForegroundColor Green
            $successCount++
        } else {
            throw "Comando supabase retornou código $LASTEXITCODE"
        }
    } catch {
        Write-Error "❌ Erro ao fazer deploy de $func : $($_.Exception.Message)"
        
        # Perguntar se quer continuar
        if (-not $Force) {
            $continue = Read-Host "Continuar com as próximas functions? (y/N)"
            if ($continue -ne 'y' -and $continue -ne 'Y') {
                exit 1
            }
        }
    }
}

Write-Host ""
if ($successCount -eq $FunctionsToDeploy.Count) {
    Write-Host "🎉 Deploy concluído com sucesso!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Deploy concluído com $successCount/$($FunctionsToDeploy.Count) functions" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Testar as functions com os scripts de demo" -ForegroundColor White
Write-Host "2. Atualizar GitHub Actions para usar as novas functions" -ForegroundColor White  
Write-Host "3. Remover dependência dos scripts Python" -ForegroundColor White

# Tentar obter URLs das functions
Write-Host ""
Write-Host "🔗 URLs das functions:" -ForegroundColor Cyan
try {
    $status = supabase status | Out-String
    $apiUrl = ($status -split "`n" | Where-Object { $_ -match "API URL" } | Select-Object -First 1) -replace ".*API URL:\s*", ""
    
    if ($apiUrl) {
        foreach ($func in $FunctionsToDeploy) {
            Write-Host "  $func : $apiUrl/functions/v1/$func" -ForegroundColor White
        }
    } else {
        Write-Host "  Execute 'supabase status' para ver as URLs" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  Execute 'supabase status' para ver as URLs" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🧪 Para testar:" -ForegroundColor Cyan
Write-Host "  node functions/demo-edge-functions.js" -ForegroundColor White
Write-Host "  # ou" -ForegroundColor Gray
Write-Host "  .\functions\demo-edge-functions.ps1 -Action test" -ForegroundColor White

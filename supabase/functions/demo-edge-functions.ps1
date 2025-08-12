# Script PowerShell para demonstrar o uso das Edge Functions
# Substitui os scripts Python setup_database.py e update_database.py

param(
    [string]$Action = "setup",
    [string]$SupabaseUrl = $env:SUPABASE_URL,
    [string]$SupabaseKey = $env:SUPABASE_ANON_KEY,
    [string]$IndicatorsPath = "../../../psexposed/indicators"
)

# Verificar se as variáveis estão configuradas
if (-not $SupabaseUrl -or $SupabaseUrl -eq "") {
    Write-Error "❌ SUPABASE_URL não configurada. Configure: `$env:SUPABASE_URL = 'https://your-project.supabase.co'"
    exit 1
}

if (-not $SupabaseKey -or $SupabaseKey -eq "") {
    Write-Error "❌ SUPABASE_ANON_KEY não configurada. Configure: `$env:SUPABASE_ANON_KEY = 'your-anon-key'"
    exit 1
}

# Função para ler arquivos YAML
function Read-YamlIndicators {
    param([string]$Path)
    
    $indicators = @()
    
    if (-not (Test-Path $Path)) {
        Write-Warning "⚠️ Diretório de indicadores não encontrado: $Path"
        return $indicators
    }
    
    $yamlFiles = Get-ChildItem -Path $Path -Filter "*.yaml"
    Write-Host "📁 Encontrados $($yamlFiles.Count) arquivos de indicadores"
    
    foreach ($file in $yamlFiles) {
        try {
            $content = Get-Content $file.FullName -Raw -Encoding UTF8
            
            # Parse manual simples do YAML (para evitar dependências externas)
            $indicator = @{}
            
            foreach ($line in ($content -split "`n")) {
                $line = $line.Trim()
                if ($line -match '^([^:]+):\s*(.+)$') {
                    $key = $matches[1].Trim()
                    $value = $matches[2].Trim().Trim('"').Trim("'")
                    
                    # Processar arrays simples
                    if ($value -match '^\[(.*)\]$') {
                        $arrayContent = $matches[1]
                        $indicator[$key] = ($arrayContent -split ',') | ForEach-Object { $_.Trim().Trim('"').Trim("'") }
                    } else {
                        $indicator[$key] = $value
                    }
                }
            }
            
            if ($indicator.name) {
                $indicators += $indicator
                Write-Host "✅ Processado: $($indicator.name)"
            }
            
        } catch {
            Write-Warning "❌ Erro ao processar $($file.Name): $($_.Exception.Message)"
        }
    }
    
    return $indicators
}

# Função para chamar Edge Function
function Invoke-EdgeFunction {
    param(
        [string]$FunctionName,
        [hashtable]$Body
    )
    
    $uri = "$SupabaseUrl/functions/v1/$FunctionName"
    $headers = @{
        'Content-Type' = 'application/json'
        'Authorization' = "Bearer $SupabaseKey"
    }
    
    $jsonBody = $Body | ConvertTo-Json -Depth 10
    
    try {
        Write-Host "🚀 Chamando $FunctionName..."
        $response = Invoke-RestMethod -Uri $uri -Method POST -Headers $headers -Body $jsonBody
        
        if ($response.success) {
            Write-Host "✅ $($response.message)"
            if ($response.indicators_inserted) {
                Write-Host "📊 Indicadores inseridos: $($response.indicators_inserted)"
            }
            if ($response.indicators_processed) {
                Write-Host "📊 Indicadores processados: $($response.indicators_processed)"
            }
        } else {
            Write-Error "❌ Erro: $($response.error)"
        }
        
        if ($response.errors) {
            Write-Host "⚠️ Erros encontrados:"
            foreach ($errorMsg in $response.errors) {
                Write-Host "  - $errorMsg" -ForegroundColor Yellow
            }
        }
        
        return $response
    } catch {
        Write-Error "❌ Erro de conexão: $($_.Exception.Message)"
        throw
    }
}

# Ações principais
switch ($Action.ToLower()) {
    "setup" {
        Write-Host "🚀 Configurando banco de dados Supabase para PSExposed..." -ForegroundColor Cyan
        Write-Host "=" * 60
        
        $indicators = Read-YamlIndicators -Path $IndicatorsPath
        
        if ($indicators.Count -eq 0) {
            Write-Error "❌ Nenhum indicador encontrado para inserir"
            exit 1
        }
        
        $body = @{
            indicators = $indicators
        }
        
        Invoke-EdgeFunction -FunctionName "setup-database" -Body $body
        
        Write-Host "`n🎉 Configuração concluída!" -ForegroundColor Green
        Write-Host "O banco de dados está pronto para receber atualizações automáticas."
    }
    
    "update" {
        Write-Host "🔄 Atualizando banco de dados..." -ForegroundColor Cyan
        
        $indicators = Read-YamlIndicators -Path $IndicatorsPath
        
        if ($indicators.Count -eq 0) {
            Write-Host "ℹ️ Nenhum indicador encontrado para atualizar" -ForegroundColor Yellow
            return
        }
        
        $body = @{
            changed_files = @("bulk_update")
            indicators = $indicators
        }
        
        Invoke-EdgeFunction -FunctionName "update-database" -Body $body
        
        Write-Host "`n✅ Atualização concluída!" -ForegroundColor Green
    }
    
    "test" {
        Write-Host "🧪 Testando Edge Functions..." -ForegroundColor Cyan
        
        # Teste com indicador de exemplo
        $testIndicator = @{
            name = "PowerShell Test Indicator"
            description = "Indicador de teste para validar Edge Functions"
            regex = @("test-pattern", "another-test")
            basescore = 5.5
            tactic = @("execution")
            technique = @("T1059.001")
            reference = @("https://example.com/test")
        }
        
        $body = @{
            indicators = @($testIndicator)
        }
        
        Invoke-EdgeFunction -FunctionName "setup-database" -Body $body
        
        Write-Host "`n🎯 Teste concluído!" -ForegroundColor Green
    }
    
    default {
        Write-Host @"
🎯 Script PowerShell para Edge Functions - PSExposed
===============================================

Uso: .\demo-edge-functions.ps1 -Action <ação> [opções]

Ações disponíveis:
  setup   - Configurar banco de dados (equivale a setup_database.py)
  update  - Atualizar indicadores (equivale a update_database.py)  
  test    - Testar com indicador de exemplo

Opções:
  -SupabaseUrl      URL do projeto Supabase
  -SupabaseKey      Chave anônima do Supabase
  -IndicatorsPath   Caminho para pasta de indicadores

Exemplos:
  .\demo-edge-functions.ps1 -Action setup
  .\demo-edge-functions.ps1 -Action update
  .\demo-edge-functions.ps1 -Action test

Configuração de variáveis de ambiente:
  `$env:SUPABASE_URL = "https://your-project.supabase.co"
  `$env:SUPABASE_ANON_KEY = "your-anon-key"
"@ -ForegroundColor White
    }
}

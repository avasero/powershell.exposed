# PowerShell AST Deobfuscation Service
# HTTP Server using Pode module

Import-Module Pode

# Helper function for logging inside Pode runspaces
function Write-Log($msg) {
    [Console]::Out.WriteLine($msg)
    [Console]::Out.Flush()
}

# Read config from environment (for display)
$port = [int]($env:PORT ?? 8081)
$maxInput = [int]($env:MAX_INPUT_LENGTH ?? 100000)
$timeout = [int]($env:TIMEOUT_SECONDS ?? 30)
$maxIter = [int]($env:MAX_ITERATIONS ?? 10)
$apiKey = $env:AST_API_KEY

Write-Host "=== PowerShell AST Deobfuscation Service ==="
Write-Host "  Port:          $port"
Write-Host "  Max Input:     $maxInput chars"
Write-Host "  Timeout:       ${timeout}s"
Write-Host "  Max Iterations: $maxIter"
Write-Host "  API Key:       $(if ($apiKey) { 'required' } else { 'disabled' })"
Write-Host "============================================="

Start-PodeServer -Threads 1 {
    # Store config in Pode state
    Set-PodeState -Name 'MaxInputLength' -Value ([int]($env:MAX_INPUT_LENGTH ?? 100000))
    Set-PodeState -Name 'TimeoutSeconds' -Value ([int]($env:TIMEOUT_SECONDS ?? 30))
    Set-PodeState -Name 'MaxIterations' -Value ([int]($env:MAX_ITERATIONS ?? 10))
    Set-PodeState -Name 'ApiKey' -Value $env:AST_API_KEY

    Add-PodeEndpoint -Address * -Port ([int]($env:PORT ?? 8081)) -Protocol Http

    # API Key authentication middleware (skip for health check)
    Add-PodeMiddleware -Name 'ApiKeyAuth' -ScriptBlock {
        # Skip auth for health check
        if ($WebEvent.Path -eq '/health') {
            return $true
        }

        # If API key is configured, validate it
        $configuredKey = Get-PodeState -Name 'ApiKey'
        if ($configuredKey -and $configuredKey -ne '') {
            $providedKey = $WebEvent.Request.Headers['X-Api-Key']

            if ($providedKey -ne $configuredKey) {
                Set-PodeResponseStatus -Code 401
                Write-PodeJsonResponse -Value @{
                    success = $false
                    error = 'Invalid or missing API key'
                }
                return $false
            }
        }

        return $true
    }

    # Request logging middleware (lightweight, details logged per endpoint)
    Add-PodeMiddleware -Name 'RequestLogger' -ScriptBlock {
        Write-Log "[$(Get-Date -Format 'HH:mm:ss')] $($WebEvent.Method) $($WebEvent.Path)"
        return $true
    }

    # Health check endpoint (no auth required)
    Add-PodeRoute -Method Get -Path '/health' -ScriptBlock {
        Write-PodeJsonResponse -Value @{
            status = 'healthy'
            service = 'powershell-ast-deobfuscator'
            version = '1.0.0'
            timestamp = (Get-Date -Format 'o')
            config = @{
                maxInputLength = (Get-PodeState -Name 'MaxInputLength')
                timeoutSeconds = (Get-PodeState -Name 'TimeoutSeconds')
                maxIterations = (Get-PodeState -Name 'MaxIterations')
            }
        }
    }

    # Main deobfuscation endpoint
    Add-PodeRoute -Method Post -Path '/deobfuscate' -ContentType 'application/json' -ScriptBlock {
        . /app/scripts/ast-parser.ps1
        . /app/scripts/deobfuscator.ps1

        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

        try {
            $body = $WebEvent.Data
            if (-not $body) {
                $rawBody = $WebEvent.Request.Body
                if ($rawBody) { $body = $rawBody | ConvertFrom-Json }
            }

            if (-not $body -or -not $body.command) {
                Set-PodeResponseStatus -Code 400
                Write-PodeJsonResponse -Value @{ success = $false; error = 'Missing required field: command' }
                return
            }

            $command = $body.command
            $maxLen = Get-PodeState -Name 'MaxInputLength'
            if ($command.Length -gt $maxLen) {
                Set-PodeResponseStatus -Code 400
                Write-PodeJsonResponse -Value @{ success = $false; error = "Command exceeds maximum length of $maxLen characters" }
                return
            }

            $preview = if ($command.Length -gt 80) { $command.Substring(0, 80) + '...' } else { $command }

            $timeout = Get-PodeState -Name 'TimeoutSeconds'
            $maxIter = Get-PodeState -Name 'MaxIterations'

            try {
                $result = Invoke-AstDeobfuscation -Command $command -TimeoutSeconds $timeout -MaxIterations $maxIter
            }
            catch {
                $stopwatch.Stop()
                Write-Log "--- DEOBFUSCATE [FAIL] ---"
                Write-Log "  Time:       $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
                Write-Log "  Duration:   $($stopwatch.ElapsedMilliseconds)ms"
                Write-Log "  Input:      $preview"
                Write-Log "  Error:      $($_.Exception.Message)"
                throw
            }

            $stopwatch.Stop()

            if ($result.error) {
                Write-Log "--- DEOBFUSCATE [ERROR] ---"
                Write-Log "  Time:       $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
                Write-Log "  Duration:   $($stopwatch.ElapsedMilliseconds)ms"
                Write-Log "  Input:      $preview"
                Write-Log "  Error:      $($result.error)"
                Set-PodeResponseStatus -Code 500
                Write-PodeJsonResponse -Value @{ success = $false; error = $result.error }
                return
            }

            $changed = $result.deobfuscated -ne $result.original
            $deobPreview = if ($changed) {
                $d = $result.deobfuscated
                if ($d.Length -gt 80) { $d.Substring(0, 80) + '...' } else { $d }
            } else { '(no changes)' }

            Write-Log "--- DEOBFUSCATE [OK] ---"
            Write-Log "  Time:       $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
            Write-Log "  Duration:   $($stopwatch.ElapsedMilliseconds)ms"
            Write-Log "  Input:      $preview  ($($command.Length) chars)"
            Write-Log "  Output:     $deobPreview"
            Write-Log "  Iterations: $($result.iterations)"
            Write-Log "  Techniques: $(if ($result.techniques_found.Count -gt 0) { $result.techniques_found -join ', ' } else { '(none)' })"

            Write-PodeJsonResponse -Value @{ success = $true; result = $result }
        }
        catch {
            $stopwatch.Stop()
            Write-Log "--- DEOBFUSCATE [EXCEPTION] ---"
            Write-Log "  Time:       $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
            Write-Log "  Duration:   $($stopwatch.ElapsedMilliseconds)ms"
            Write-Log "  Error:      $($_.Exception.Message)"
            Set-PodeResponseStatus -Code 500
            Write-PodeJsonResponse -Value @{ success = $false; error = $_.Exception.Message }
        }
    }

    # AST analysis endpoint (returns raw AST info without deobfuscation)
    Add-PodeRoute -Method Post -Path '/analyze-ast' -ScriptBlock {
        . /app/scripts/ast-parser.ps1

        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

        try {
            $body = $WebEvent.Data

            if (-not $body -or -not $body.command) {
                Set-PodeResponseStatus -Code 400
                Write-PodeJsonResponse -Value @{ success = $false; error = 'Missing required field: command' }
                return
            }

            $command = $body.command
            $maxLen = Get-PodeState -Name 'MaxInputLength'

            if ($command.Length -gt $maxLen) {
                Set-PodeResponseStatus -Code 400
                Write-PodeJsonResponse -Value @{ success = $false; error = "Command exceeds maximum length of $maxLen characters" }
                return
            }

            $preview = if ($command.Length -gt 80) { $command.Substring(0, 80) + '...' } else { $command }

            $astInfo = Get-AstAnalysis -Command $command
            $stopwatch.Stop()

            Write-Log "--- ANALYZE-AST [OK] ---"
            Write-Log "  Time:     $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
            Write-Log "  Duration: $($stopwatch.ElapsedMilliseconds)ms"
            Write-Log "  Input:    $preview  ($($command.Length) chars)"

            Write-PodeJsonResponse -Value @{ success = $true; ast = $astInfo }
        }
        catch {
            $stopwatch.Stop()
            Write-Log "--- ANALYZE-AST [EXCEPTION] ---"
            Write-Log "  Time:     $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
            Write-Log "  Duration: $($stopwatch.ElapsedMilliseconds)ms"
            Write-Log "  Error:    $($_.Exception.Message)"
            Set-PodeResponseStatus -Code 500
            Write-PodeJsonResponse -Value @{ success = $false; error = $_.Exception.Message }
        }
    }

    # Batch deobfuscation endpoint (multiple commands)
    Add-PodeRoute -Method Post -Path '/deobfuscate/batch' -ScriptBlock {
        . /app/scripts/ast-parser.ps1
        . /app/scripts/deobfuscator.ps1

        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

        try {
            $body = $WebEvent.Data

            if (-not $body -or -not $body.commands -or $body.commands -isnot [array]) {
                Set-PodeResponseStatus -Code 400
                Write-PodeJsonResponse -Value @{ success = $false; error = 'Missing required field: commands (array)' }
                return
            }

            $maxBatchSize = 10
            if ($body.commands.Count -gt $maxBatchSize) {
                Set-PodeResponseStatus -Code 400
                Write-PodeJsonResponse -Value @{ success = $false; error = "Batch size exceeds maximum of $maxBatchSize commands" }
                return
            }

            $results = @()
            $maxLen = Get-PodeState -Name 'MaxInputLength'
            $timeout = Get-PodeState -Name 'TimeoutSeconds'
            $maxIter = Get-PodeState -Name 'MaxIterations'
            $succeeded = 0
            $failed = 0

            foreach ($cmd in $body.commands) {
                if ($cmd.Length -le $maxLen) {
                    $result = Invoke-AstDeobfuscation -Command $cmd -TimeoutSeconds $timeout -MaxIterations $maxIter
                    $results += $result
                    if ($result.error) { $failed++ } else { $succeeded++ }
                }
                else {
                    $results += @{ original = $cmd.Substring(0, 100) + '...'; error = 'Command exceeds maximum length' }
                    $failed++
                }
            }

            $stopwatch.Stop()

            Write-Log "--- DEOBFUSCATE/BATCH [OK] ---"
            Write-Log "  Time:      $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
            Write-Log "  Duration:  $($stopwatch.ElapsedMilliseconds)ms"
            Write-Log "  Commands:  $($body.commands.Count) total, $succeeded succeeded, $failed failed"

            Write-PodeJsonResponse -Value @{ success = $true; results = $results }
        }
        catch {
            $stopwatch.Stop()
            Write-Log "--- DEOBFUSCATE/BATCH [EXCEPTION] ---"
            Write-Log "  Time:     $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
            Write-Log "  Duration: $($stopwatch.ElapsedMilliseconds)ms"
            Write-Log "  Error:    $($_.Exception.Message)"
            Set-PodeResponseStatus -Code 500
            Write-PodeJsonResponse -Value @{ success = $false; error = $_.Exception.Message }
        }
    }

}

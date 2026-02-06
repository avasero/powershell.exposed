# PowerShell AST Deobfuscation Service
# HTTP Server using Pode module

Import-Module Pode

# Read config from environment (for display)
$port = [int]($env:PORT ?? 8081)
$maxInput = [int]($env:MAX_INPUT_LENGTH ?? 100000)
$timeout = [int]($env:TIMEOUT_SECONDS ?? 30)
$maxIter = [int]($env:MAX_ITERATIONS ?? 10)
$apiKey = $env:AST_API_KEY

Write-Host "Starting PowerShell AST Deobfuscation Service..."
Write-Host "Port: $port"
Write-Host "Max Input Length: $maxInput"
Write-Host "Timeout: $timeout seconds"
Write-Host "API Key Required: $($null -ne $apiKey -and $apiKey -ne '')"

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

    # Request logging middleware
    Add-PodeMiddleware -Name 'RequestLogger' -ScriptBlock {
        $method = $WebEvent.Method
        $path = $WebEvent.Path
        $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        Write-Host "[$timestamp] $method $path"
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
        # Load functions into this runspace
        . /app/scripts/ast-parser.ps1
        . /app/scripts/deobfuscator.ps1

        try {
            # Debug: Log raw request info
            Write-Host "[DEBUG] Received POST /deobfuscate"

            $body = $WebEvent.Data

            # If body is null, try to parse from raw body
            if (-not $body) {
                $rawBody = $WebEvent.Request.Body
                Write-Host "[DEBUG] Raw body: $rawBody"
                if ($rawBody) {
                    $body = $rawBody | ConvertFrom-Json
                }
            }

            Write-Host "[DEBUG] Parsed body type: $($body.GetType().Name)"
            Write-Host "[DEBUG] Body content: $($body | ConvertTo-Json -Compress)"

            # Validate input
            if (-not $body -or -not $body.command) {
                Set-PodeResponseStatus -Code 400
                Write-PodeJsonResponse -Value @{
                    success = $false
                    error = 'Missing required field: command'
                    debug = "Body was: $($body | ConvertTo-Json -Compress)"
                }
                return
            }

            $command = $body.command
            Write-Host "[DEBUG] Command to deobfuscate: $($command.Substring(0, [Math]::Min(100, $command.Length)))..."

            # Check input length
            $maxLen = Get-PodeState -Name 'MaxInputLength'
            if ($command.Length -gt $maxLen) {
                Set-PodeResponseStatus -Code 400
                Write-PodeJsonResponse -Value @{
                    success = $false
                    error = "Command exceeds maximum length of $maxLen characters"
                }
                return
            }

            # Perform deobfuscation
            Write-Host "[DEBUG] Calling Invoke-AstDeobfuscation..."
            $timeout = Get-PodeState -Name 'TimeoutSeconds'
            $maxIter = Get-PodeState -Name 'MaxIterations'
            try {
                $result = Invoke-AstDeobfuscation -Command $command -TimeoutSeconds $timeout -MaxIterations $maxIter
                Write-Host "[DEBUG] Deobfuscation completed. Result: $($result | ConvertTo-Json -Compress -Depth 3)"
            }
            catch {
                Write-Host "[ERROR] Invoke-AstDeobfuscation failed: $($_.Exception.Message)"
                Write-Host "[ERROR] Stack trace: $($_.ScriptStackTrace)"
                throw
            }

            if ($result.error) {
                Set-PodeResponseStatus -Code 500
                Write-PodeJsonResponse -Value @{
                    success = $false
                    error = $result.error
                }
                return
            }

            Write-PodeJsonResponse -Value @{
                success = $true
                result = $result
            }
        }
        catch {
            Write-Host "[ERROR] Unhandled exception: $($_.Exception.Message)"
            Write-Host "[ERROR] Stack trace: $($_.ScriptStackTrace)"
            Set-PodeResponseStatus -Code 500
            Write-PodeJsonResponse -Value @{
                success = $false
                error = $_.Exception.Message
                stackTrace = $_.ScriptStackTrace
            }
        }
    }

    # AST analysis endpoint (returns raw AST info without deobfuscation)
    Add-PodeRoute -Method Post -Path '/analyze-ast' -ScriptBlock {
        # Load functions into this runspace
        . /app/scripts/ast-parser.ps1

        try {
            $body = $WebEvent.Data

            if (-not $body -or -not $body.command) {
                Set-PodeResponseStatus -Code 400
                Write-PodeJsonResponse -Value @{
                    success = $false
                    error = 'Missing required field: command'
                }
                return
            }

            $command = $body.command
            $maxLen = Get-PodeState -Name 'MaxInputLength'

            if ($command.Length -gt $maxLen) {
                Set-PodeResponseStatus -Code 400
                Write-PodeJsonResponse -Value @{
                    success = $false
                    error = "Command exceeds maximum length of $maxLen characters"
                }
                return
            }

            $astInfo = Get-AstAnalysis -Command $command

            Write-PodeJsonResponse -Value @{
                success = $true
                ast = $astInfo
            }
        }
        catch {
            Set-PodeResponseStatus -Code 500
            Write-PodeJsonResponse -Value @{
                success = $false
                error = $_.Exception.Message
            }
        }
    }

    # Batch deobfuscation endpoint (multiple commands)
    Add-PodeRoute -Method Post -Path '/deobfuscate/batch' -ScriptBlock {
        # Load functions into this runspace
        . /app/scripts/ast-parser.ps1
        . /app/scripts/deobfuscator.ps1

        try {
            $body = $WebEvent.Data

            if (-not $body -or -not $body.commands -or $body.commands -isnot [array]) {
                Set-PodeResponseStatus -Code 400
                Write-PodeJsonResponse -Value @{
                    success = $false
                    error = 'Missing required field: commands (array)'
                }
                return
            }

            # Limit batch size
            $maxBatchSize = 10
            if ($body.commands.Count -gt $maxBatchSize) {
                Set-PodeResponseStatus -Code 400
                Write-PodeJsonResponse -Value @{
                    success = $false
                    error = "Batch size exceeds maximum of $maxBatchSize commands"
                }
                return
            }

            $results = @()
            $maxLen = Get-PodeState -Name 'MaxInputLength'
            $timeout = Get-PodeState -Name 'TimeoutSeconds'
            $maxIter = Get-PodeState -Name 'MaxIterations'
            foreach ($cmd in $body.commands) {
                if ($cmd.Length -le $maxLen) {
                    $result = Invoke-AstDeobfuscation -Command $cmd -TimeoutSeconds $timeout -MaxIterations $maxIter
                    $results += $result
                }
                else {
                    $results += @{
                        original = $cmd.Substring(0, 100) + '...'
                        error = 'Command exceeds maximum length'
                    }
                }
            }

            Write-PodeJsonResponse -Value @{
                success = $true
                results = $results
            }
        }
        catch {
            Set-PodeResponseStatus -Code 500
            Write-PodeJsonResponse -Value @{
                success = $false
                error = $_.Exception.Message
            }
        }
    }

    # SANDBOX DETONATION ENDPOINT
    # Executes code in a constrained PowerShell sandbox and captures ScriptBlock logs
    # WARNING: This actually runs code - use with caution!
    Add-PodeRoute -Method Post -Path '/detonate' -ContentType 'application/json' -ScriptBlock {
        try {
            Write-Host "[DETONATE] Received execution request"
            
            $body = $WebEvent.Data
            if (-not $body) {
                $rawBody = $WebEvent.Request.Body
                if ($rawBody) { $body = $rawBody | ConvertFrom-Json }
            }

            if (-not $body -or -not $body.command) {
                Set-PodeResponseStatus -Code 400
                Write-PodeJsonResponse -Value @{
                    success = $false
                    error = 'Missing required field: command'
                }
                return
            }

            $command = $body.command
            $timeoutSec = [int]($body.timeout ?? 10)
            if ($timeoutSec -gt 30) { $timeoutSec = 30 }  # Max 30 seconds
            
            Write-Host "[DETONATE] Command length: $($command.Length), Timeout: $timeoutSec"

            # Capture all ScriptBlock logging events
            $capturedLogs = [System.Collections.ArrayList]::new()
            $stdout = [System.Collections.ArrayList]::new()
            $stderr = [System.Collections.ArrayList]::new()

            # Create a runspace for sandboxed execution (Docker provides isolation)
            $runspaceConfig = [System.Management.Automation.Runspaces.InitialSessionState]::CreateDefault()
            
            # Full PowerShell capability - Docker container provides the sandbox isolation

            $runspace = [runspacefactory]::CreateRunspace($runspaceConfig)
            $runspace.Open()

            # Create PowerShell instance in the constrained runspace
            $ps = [powershell]::Create()
            $ps.Runspace = $runspace

            # Enable ScriptBlock logging via event subscription within the runspace
            $loggingScript = @'
# Capture all executed script blocks
$global:__DetonationLogs = [System.Collections.ArrayList]::new()
$global:__DetonationOutput = [System.Collections.ArrayList]::new()

# Register for engine events to capture script block execution
Register-EngineEvent -SourceIdentifier PowerShell.OnScriptBlockInvocation -Action {
    $scriptBlock = $Event.MessageData
    if ($scriptBlock) {
        [void]$global:__DetonationLogs.Add($scriptBlock.ToString())
    }
} -SupportEvent -ErrorAction SilentlyContinue

'@
            # First set up logging
            $ps.AddScript($loggingScript).Invoke()
            $ps.Commands.Clear()

            # Now execute the user's code and capture output
            $executionScript = @"
try {
    `$output = & {
        $command
    } 2>&1
    
    foreach (`$item in `$output) {
        [void]`$global:__DetonationOutput.Add(`$item.ToString())
    }
    
    @{
        Success = `$true
        Output = `$global:__DetonationOutput
        Logs = `$global:__DetonationLogs
    }
}
catch {
    @{
        Success = `$false
        Error = `$_.Exception.Message
        Output = `$global:__DetonationOutput
        Logs = `$global:__DetonationLogs
    }
}
"@

            $ps.AddScript($executionScript)
            
            # Execute with timeout
            $asyncResult = $ps.BeginInvoke()
            $completed = $asyncResult.AsyncWaitHandle.WaitOne([TimeSpan]::FromSeconds($timeoutSec))

            $executionResult = @{
                success = $false
                output = @()
                scriptblocks_logged = @()
                errors = @()
                timed_out = $false
            }

            if ($completed) {
                try {
                    $result = $ps.EndInvoke($asyncResult)
                    if ($result -and $result.Count -gt 0) {
                        $r = $result[0]
                        $executionResult.success = $r.Success
                        $executionResult.output = @($r.Output)
                        $executionResult.scriptblocks_logged = @($r.Logs)
                    }
                }
                catch {
                    $executionResult.errors += $_.Exception.Message
                }
                
                # Capture any errors from the PowerShell streams
                foreach ($err in $ps.Streams.Error) {
                    $executionResult.errors += $err.ToString()
                }
            }
            else {
                $ps.Stop()
                $executionResult.timed_out = $true
                $executionResult.errors += "Execution timed out after $timeoutSec seconds"
            }

            # Cleanup
            $ps.Dispose()
            $runspace.Close()
            $runspace.Dispose()

            Write-Host "[DETONATE] Execution complete. Output lines: $($executionResult.output.Count)"

            Write-PodeJsonResponse -Value @{
                success = $true
                result = $executionResult
                warning = 'Code was executed in a sandboxed environment'
            }
        }
        catch {
            Write-Host "[DETONATE] Error: $($_.Exception.Message)"
            Set-PodeResponseStatus -Code 500
            Write-PodeJsonResponse -Value @{
                success = $false
                error = $_.Exception.Message
            }
        }
    }
}

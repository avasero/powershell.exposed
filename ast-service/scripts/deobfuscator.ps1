# PowerShell Deobfuscation Functions
# CRITICAL SAFETY: These functions transform AST nodes WITHOUT executing code
# All transformations are done via string manipulation based on AST analysis

function Resolve-UnicodeQuotes {
    <#
    .SYNOPSIS
        Normalize unicode quote characters to ASCII equivalents
    .DESCRIPTION
        Converts fancy/smart quotes to standard ASCII quotes to fix parse errors.
        Common in copy-pasted commands from documents, emails, or web pages.
        Example: 'text' → 'text' (curly quotes to straight quotes)
    #>
    param([string]$Code)

    $result = $Code
    
    # Single quote variants (U+2018, U+2019, U+2032, U+2035, U+02BC, U+02B9)
    # ' ' ′ ‵ ʼ ʹ → '
    $result = $result -replace '[\u2018\u2019\u2032\u2035\u02BC\u02B9]', "'"
    
    # Double quote variants (U+201C, U+201D, U+2033, U+2036, U+02DD)
    # " " ″ ‶ ˝ → "
    $result = $result -replace '[\u201C\u201D\u2033\u2036\u02DD]', '"'
    
    # Backtick variants (U+02CB, U+0300, U+2035)
    # ˋ ̀ ‵ → `
    $result = $result -replace '[\u02CB\u0300]', '`'

    return @{
        result = $result
        changed = ($result -ne $Code)
    }
}

function Invoke-AstDeobfuscation {
    <#
    .SYNOPSIS
        Main deobfuscation entry point
    .DESCRIPTION
        Performs multiple deobfuscation passes using AST analysis.
        NEVER executes the input code - only transforms it statically.
    .PARAMETER Command
        The PowerShell command to deobfuscate
    .PARAMETER TimeoutSeconds
        Maximum time allowed for deobfuscation
    .PARAMETER MaxIterations
        Maximum number of deobfuscation passes
    #>
    param(
        [Parameter(Mandatory)]
        [string]$Command,

        [int]$TimeoutSeconds = 30,

        [int]$MaxIterations = 10
    )

    $result = @{
        original = $Command
        deobfuscated = $Command
        iterations = 0
        techniques_found = [System.Collections.ArrayList]::new()
        transformations = [System.Collections.ArrayList]::new()
        is_fully_deobfuscated = $false
        error = $null
    }

    try {
        # Safety check
        $safetyCheck = Test-AstSafety -Command $Command
        if ($safetyCheck.warnings.Count -gt 0) {
            $result.warnings = $safetyCheck.warnings
        }

        $current = $Command
        $allTechniques = [System.Collections.ArrayList]::new()

        for ($iteration = 1; $iteration -le $MaxIterations; $iteration++) {
            $previous = $current
            $iterationTechniques = [System.Collections.ArrayList]::new()

            # Pass 0: Normalize unicode quotes (fixes parse errors from copy-pasted code)
            $unicodeResult = Resolve-UnicodeQuotes -Code $current
            if ($unicodeResult.changed) {
                $current = $unicodeResult.result
                [void]$iterationTechniques.Add('unicode_normalization')
                [void]$result.transformations.Add(@{
                    iteration = $iteration
                    technique = 'unicode_normalization'
                    before = (Get-TruncatedString $previous 200)
                    after = (Get-TruncatedString $current 200)
                })
            }

            # Pass 0.5: Extract command from powershell.exe launcher wrappers
            $launcherResult = Resolve-PowerShellLauncher -Code $current
            if ($launcherResult.changed) {
                $current = $launcherResult.result
                [void]$iterationTechniques.Add('powershell_launcher')
                [void]$result.transformations.Add(@{
                    iteration = $iteration
                    technique = 'powershell_launcher'
                    before = (Get-TruncatedString $previous 200)
                    after = (Get-TruncatedString $current 200)
                })
            }

            # Pass 1: Resolve tick/backtick obfuscation (simplest, do first)
            $tickResult = Resolve-TickObfuscation -Code $current
            if ($tickResult.changed) {
                $current = $tickResult.result
                [void]$iterationTechniques.Add('tick_obfuscation')
                [void]$result.transformations.Add(@{
                    iteration = $iteration
                    technique = 'tick_obfuscation'
                    before = (Get-TruncatedString $previous 200)
                    after = (Get-TruncatedString $current 200)
                })
            }

            # Pass 1.1: Resolve scriptblock invocation wrappers (&{cmd} args -> cmd args)
            $sbWrapperResult = Resolve-ScriptBlockWrapper -Code $current
            if ($sbWrapperResult.changed) {
                $current = $sbWrapperResult.result
                [void]$iterationTechniques.Add('scriptblock_wrapper')
                [void]$result.transformations.Add(@{
                    iteration = $iteration
                    technique = 'scriptblock_wrapper'
                    before = (Get-TruncatedString $previous 200)
                    after = (Get-TruncatedString $current 200)
                })
            }

            # Pass 1.5: Resolve $ShellId indexing ($ShellId[1]+$ShellId[13]+'x' -> 'IEx')
            $shellIdResult = Resolve-ShellIdIndexing -Code $current
            if ($shellIdResult.changed) {
                $current = $shellIdResult.result
                [void]$iterationTechniques.Add('shellid_indexing')
                [void]$result.transformations.Add(@{
                    iteration = $iteration
                    technique = 'shellid_indexing'
                    before = (Get-TruncatedString $previous 200)
                    after = (Get-TruncatedString $current 200)
                })
            }

            # Pass 1.6: Resolve $env: variable indexing
            $envResult = Resolve-EnvVariableIndexing -Code $current
            if ($envResult.changed) {
                $current = $envResult.result
                [void]$iterationTechniques.Add('env_variable_indexing')
                [void]$result.transformations.Add(@{
                    iteration = $iteration
                    technique = 'env_variable_indexing'
                    before = (Get-TruncatedString $previous 200)
                    after = (Get-TruncatedString $current 200)
                })
            }

            # Pass 1.7: Resolve $VerbosePreference variable indexing
            $verboseResult = Resolve-VerbosePreferenceIndexing -Code $current
            if ($verboseResult.changed) {
                $current = $verboseResult.result
                [void]$iterationTechniques.Add('verbose_preference_indexing')
                [void]$result.transformations.Add(@{
                    iteration = $iteration
                    technique = 'verbose_preference_indexing'
                    before = (Get-TruncatedString $previous 200)
                    after = (Get-TruncatedString $current 200)
                })
            }

            # Pass 1.8: Resolve reversed strings with [array]::Reverse
            $reverseResult = Resolve-ReversedString -Code $current
            if ($reverseResult.changed) {
                $current = $reverseResult.result
                [void]$iterationTechniques.Add('reversed_string')
                [void]$result.transformations.Add(@{
                    iteration = $iteration
                    technique = 'reversed_string'
                    before = (Get-TruncatedString $previous 200)
                    after = (Get-TruncatedString $current 200)
                })
            }

            # Pass 1.85: Resolve string index slicing ("string"[18..3] -> extracted chars)
            $sliceResult = Resolve-StringIndexSlicing -Code $current
            if ($sliceResult.changed) {
                $current = $sliceResult.result
                [void]$iterationTechniques.Add('string_index_slicing')
                [void]$result.transformations.Add(@{
                    iteration = $iteration
                    technique = 'string_index_slicing'
                    before = (Get-TruncatedString $previous 200)
                    after = (Get-TruncatedString $current 200)
                })
            }

            # Pass 1.9: Resolve simple reversed strings ('olleH' -split '' | Reverse)
            $simpleReverseResult = Resolve-SimpleReversedString -Code $current
            if ($simpleReverseResult.changed) {
                $current = $simpleReverseResult.result
                [void]$iterationTechniques.Add('simple_reversed_string')
                [void]$result.transformations.Add(@{
                    iteration = $iteration
                    technique = 'simple_reversed_string'
                    before = (Get-TruncatedString $previous 200)
                    after = (Get-TruncatedString $current 200)
                })
            }

            # Pass 2: Resolve character codes [char]65 -> 'A'
            $charResult = Resolve-CharacterCodes -Code $current
            if ($charResult.changed) {
                $current = $charResult.result
                [void]$iterationTechniques.Add('character_codes')
                [void]$result.transformations.Add(@{
                    iteration = $iteration
                    technique = 'character_codes'
                    before = (Get-TruncatedString $previous 200)
                    after = (Get-TruncatedString $current 200)
                })
            }

            # Pass 3: Resolve format strings "{0}{1}" -f "a","b" -> "ab"
            $formatResult = Resolve-FormatStrings -Code $current
            if ($formatResult.changed) {
                $current = $formatResult.result
                [void]$iterationTechniques.Add('format_string')
                [void]$result.transformations.Add(@{
                    iteration = $iteration
                    technique = 'format_string'
                    before = (Get-TruncatedString $previous 200)
                    after = (Get-TruncatedString $current 200)
                })
            }

            # Pass 4: Resolve string concatenation "a" + "b" -> "ab"
            $concatResult = Resolve-StringConcatenation -Code $current
            if ($concatResult.changed) {
                $current = $concatResult.result
                [void]$iterationTechniques.Add('string_concatenation')
                [void]$result.transformations.Add(@{
                    iteration = $iteration
                    technique = 'string_concatenation'
                    before = (Get-TruncatedString $previous 200)
                    after = (Get-TruncatedString $current 200)
                })
            }

            # Pass 5: Resolve array joins ('a','b','c') -join '' -> 'abc'
            $joinResult = Resolve-ArrayJoins -Code $current
            if ($joinResult.changed) {
                $current = $joinResult.result
                [void]$iterationTechniques.Add('array_join')
                [void]$result.transformations.Add(@{
                    iteration = $iteration
                    technique = 'array_join'
                    before = (Get-TruncatedString $previous 200)
                    after = (Get-TruncatedString $current 200)
                })
            }

            # Pass 6: Resolve string replace methods
            $replaceResult = Resolve-StringReplace -Code $current
            if ($replaceResult.changed) {
                $current = $replaceResult.result
                [void]$iterationTechniques.Add('string_replace')
                [void]$result.transformations.Add(@{
                    iteration = $iteration
                    technique = 'string_replace'
                    before = (Get-TruncatedString $previous 200)
                    after = (Get-TruncatedString $current 200)
                })
            }

            # Pass 7: Resolve simple variable substitution
            $varResult = Resolve-VariableSubstitution -Code $current
            if ($varResult.changed) {
                $current = $varResult.result
                [void]$iterationTechniques.Add('variable_substitution')
                [void]$result.transformations.Add(@{
                    iteration = $iteration
                    technique = 'variable_substitution'
                    before = (Get-TruncatedString $previous 200)
                    after = (Get-TruncatedString $current 200)
                })
            }

            # Pass 8: Resolve Base64+DeflateStream payloads
            $deflateResult = Resolve-Base64DeflateStream -Code $current
            if ($deflateResult.changed) {
                $current = $deflateResult.result
                [void]$iterationTechniques.Add('deflate_stream')
                [void]$result.transformations.Add(@{
                    iteration = $iteration
                    technique = 'deflate_stream'
                    before = (Get-TruncatedString $previous 200)
                    after = (Get-TruncatedString $current 200)
                })
            }

            # Pass 9: Resolve simple Base64 encoded strings
            $base64Result = Resolve-SimpleBase64 -Code $current
            if ($base64Result.changed) {
                $current = $base64Result.result
                [void]$iterationTechniques.Add('base64_decode')
                [void]$result.transformations.Add(@{
                    iteration = $iteration
                    technique = 'base64_decode'
                    before = (Get-TruncatedString $previous 200)
                    after = (Get-TruncatedString $current 200)
                })
            }

            # Pass 9.3: Resolve Unicode (UTF-16LE) Base64 encoded strings
            $unicodeB64Result = Resolve-UnicodeBase64 -Code $current
            if ($unicodeB64Result.changed) {
                $current = $unicodeB64Result.result
                [void]$iterationTechniques.Add('unicode_base64')
                [void]$result.transformations.Add(@{
                    iteration = $iteration
                    technique = 'unicode_base64'
                    before = (Get-TruncatedString $previous 200)
                    after = (Get-TruncatedString $current 200)
                })
            }

            # Pass 9.5: Resolve variable-based Base64 decoding
            $varBase64Result = Resolve-VariableBase64 -Code $current
            if ($varBase64Result.changed) {
                $current = $varBase64Result.result
                [void]$iterationTechniques.Add('variable_base64')
                [void]$result.transformations.Add(@{
                    iteration = $iteration
                    technique = 'variable_base64'
                    before = (Get-TruncatedString $previous 200)
                    after = (Get-TruncatedString $current 200)
                })
            }

            # Pass 10: Strip IEX/Invoke-Expression wrappers and extract payload
            $iexResult = Resolve-IexWrapper -Code $current
            if ($iexResult.changed) {
                $current = $iexResult.result
                [void]$iterationTechniques.Add('iex_wrapper')
                [void]$result.transformations.Add(@{
                    iteration = $iteration
                    technique = 'iex_wrapper'
                    before = (Get-TruncatedString $previous 200)
                    after = (Get-TruncatedString $current 200)
                })
            }

            # Pass 11: Resolve hex character codes [char]0x48
            $hexResult = Resolve-HexCharacterCodes -Code $current
            if ($hexResult.changed) {
                $current = $hexResult.result
                [void]$iterationTechniques.Add('hex_char_codes')
                [void]$result.transformations.Add(@{
                    iteration = $iteration
                    technique = 'hex_char_codes'
                    before = (Get-TruncatedString $previous 200)
                    after = (Get-TruncatedString $current 200)
                })
            }

            # Pass 12: Resolve octal/base conversions [convert]::ToInt32('110',8)
            $octalResult = Resolve-BaseConversions -Code $current
            if ($octalResult.changed) {
                $current = $octalResult.result
                [void]$iterationTechniques.Add('base_conversion')
                [void]$result.transformations.Add(@{
                    iteration = $iteration
                    technique = 'base_conversion'
                    before = (Get-TruncatedString $previous 200)
                    after = (Get-TruncatedString $current 200)
                })
            }

            # Pass 13: Resolve ScriptBlock.Create().Invoke() patterns
            $scriptBlockResult = Resolve-ScriptBlockInvoke -Code $current
            if ($scriptBlockResult.changed) {
                $current = $scriptBlockResult.result
                [void]$iterationTechniques.Add('scriptblock_invoke')
                [void]$result.transformations.Add(@{
                    iteration = $iteration
                    technique = 'scriptblock_invoke'
                    before = (Get-TruncatedString $previous 200)
                    after = (Get-TruncatedString $current 200)
                })
            }

            # Pass 14: Resolve disguised IEX calls &("I"+"EX") or .("IEX")
            $disguisedIexResult = Resolve-DisguisedIex -Code $current
            if ($disguisedIexResult.changed) {
                $current = $disguisedIexResult.result
                [void]$iterationTechniques.Add('disguised_iex')
                [void]$result.transformations.Add(@{
                    iteration = $iteration
                    technique = 'disguised_iex'
                    before = (Get-TruncatedString $previous 200)
                    after = (Get-TruncatedString $current 200)
                })
            }

            # Pass 15: Remove redundant ToString() and casting noise
            $castingResult = Resolve-RedundantCasting -Code $current
            if ($castingResult.changed) {
                $current = $castingResult.result
                [void]$iterationTechniques.Add('redundant_casting')
                [void]$result.transformations.Add(@{
                    iteration = $iteration
                    technique = 'redundant_casting'
                    before = (Get-TruncatedString $previous 200)
                    after = (Get-TruncatedString $current 200)
                })
            }

            # Track all techniques found
            foreach ($tech in $iterationTechniques) {
                if ($tech -notin $allTechniques) {
                    [void]$allTechniques.Add($tech)
                }
            }

            $result.iterations = $iteration

            # If nothing changed, we're done
            if ($current -eq $previous) {
                break
            }
        }

        $result.deobfuscated = $current
        $result.techniques_found = $allTechniques
        $result.is_fully_deobfuscated = ($current -ne $Command)

    }
    catch {
        $result.error = $_.Exception.Message
    }

    return $result
}

function Get-TruncatedString {
    param([string]$Text, [int]$MaxLength)
    if ($Text.Length -le $MaxLength) { return $Text }
    return $Text.Substring(0, $MaxLength) + '...'
}

function Resolve-IexWrapper {
    <#
    .SYNOPSIS
        Strip IEX/Invoke-Expression wrappers and extract the payload
    .DESCRIPTION
        Detects common IEX invocation patterns and extracts the inner string.
        Patterns include:
        - .( expression )( 'payload' )
        - IEX( 'payload' )
        - & ( expression ) 'payload'
        - . $VerbosePreference[1,3]+'x' ( 'payload' )
    #>
    param([string]$Code)

    $result = $Code
    $changed = $false
    
    Write-Host "[DEBUG] IexWrapper checking code starting with: $($Code.Substring(0, [Math]::Min(50, $Code.Length)))"
    Write-Host "[DEBUG] IexWrapper code ending with: $($Code.Substring([Math]::Max(0, $Code.Length - 30)))"

    # Pattern 1: .( <expr> )( ('...payload...') )
    # The payload can contain newlines and spans multiple lines
    # Match: starts with .( and ends with ') - single quote then paren with optional whitespace
    $startsWithDot = $Code -match '^\s*\.\s*\('
    # Allow for just ') at the end with any whitespace/newlines before the final )
    $endsWithQuoteParen = $Code -match "'\s*\)\s*$"
    Write-Host "[DEBUG] startsWithDot=$startsWithDot, endsWithQuoteParen=$endsWithQuoteParen"
    
    if ($startsWithDot -and $endsWithQuoteParen) {
        # Find the start of the payload - look for )( (' pattern
        $payloadStartPattern = "\)\s*\(\s*\(\s*'"
        $payloadStartMatch = [regex]::Match($Code, $payloadStartPattern)
        Write-Host "[DEBUG] payloadStartMatch.Success=$($payloadStartMatch.Success)"
        if ($payloadStartMatch.Success) {
            $payloadStartIdx = $payloadStartMatch.Index + $payloadStartMatch.Length
            
            # Find the end - look for the ') at the end
            $payloadEndPattern = "'\s*\)\s*$"
            $payloadEndMatch = [regex]::Match($Code, $payloadEndPattern)
            Write-Host "[DEBUG] payloadEndMatch.Success=$($payloadEndMatch.Success)"
            if ($payloadEndMatch.Success) {
                $payloadEndIdx = $payloadEndMatch.Index
                
                if ($payloadEndIdx -gt $payloadStartIdx) {
                    $result = $Code.Substring($payloadStartIdx, $payloadEndIdx - $payloadStartIdx)
                    $changed = $true
                    Write-Host "[DEBUG] IEX wrapper stripped via Pattern1 (position $payloadStartIdx to $payloadEndIdx)"
                }
            }
        }
    }

    # Pattern 2: Simple IEX('payload') or Invoke-Expression('payload')
    if (-not $changed) {
        $pattern2 = "^\s*(?:IEX|Invoke-Expression)\s*\(\s*['\`"](.+)['\`"]\s*\)\s*$"
        $match2 = [regex]::Match($Code, $pattern2, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Singleline)
        if ($match2.Success) {
            $result = $match2.Groups[1].Value
            $changed = $true
            Write-Host "[DEBUG] IEX wrapper stripped via Pattern2"
        }
    }

    return @{
        result = $result
        changed = $changed
    }
}

function Resolve-HexCharacterCodes {
    <#
    .SYNOPSIS
        Resolve hexadecimal character codes
    .DESCRIPTION
        Converts [char]0x48 to the actual character 'H'
        Example: [char]0x48 + [char]0x69 -> 'Hi'
    #>
    param([string]$Code)

    $result = $Code
    
    # Pattern: [char]0xNN or [char](0xNN) - hex values
    # The 0x prefix must be captured carefully
    $hexPattern = '\[char\]\s*\(?\s*0x([0-9a-fA-F]+)\s*\)?'
    $result = [regex]::Replace($result, $hexPattern, {
        param($match)
        try {
            $hexDigits = $match.Groups[1].Value
            $charCode = [convert]::ToInt32($hexDigits, 16)
            if ($charCode -ge 0 -and $charCode -le 65535) {
                return "'$([char]$charCode)'"
            }
        }
        catch { 
            Write-Host "[DEBUG] HexChar error: $_"
        }
        return $match.Value
    }, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

    return @{
        result = $result
        changed = ($result -ne $Code)
    }
}

function Resolve-BaseConversions {
    <#
    .SYNOPSIS
        Resolve base conversion expressions (octal, hex via ToInt32)
    .DESCRIPTION
        Converts [convert]::ToInt32('110',8) to decimal, then to char if wrapped
        Example: [char]([convert]::ToInt32('110',8)) -> 'H' (72 in decimal)
    #>
    param([string]$Code)

    $result = $Code
    
    # Pattern: [convert]::ToInt32('digits', base) or [System.Convert]::ToInt32('digits', base)
    $result = [regex]::Replace($result, '\[(?:System\.)?Convert\]::ToInt32\s*\(\s*[''"]([0-9a-fA-F]+)[''"]\s*,\s*(\d+)\s*\)', {
        param($match)
        try {
            $digits = $match.Groups[1].Value
            $base = [int]$match.Groups[2].Value
            $decimalValue = [convert]::ToInt32($digits, $base)
            return $decimalValue.ToString()
        }
        catch { }
        return $match.Value
    }, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

    return @{
        result = $result
        changed = ($result -ne $Code)
    }
}

function Resolve-ScriptBlockInvoke {
    <#
    .SYNOPSIS
        Resolve ScriptBlock::Create().Invoke() patterns
    .DESCRIPTION
        Extracts code from ScriptBlock creation and invocation.
        Example: [ScriptBlock]::Create("Write-Output 'Hello'").Invoke() -> Write-Output 'Hello'
        Also handles variable-based patterns:
        $sb = [ScriptBlock]::Create("code"); $sb.Invoke()
    #>
    param([string]$Code)

    $result = $Code
    $changed = $false

    # Pattern 1: Direct inline - [ScriptBlock]::Create('code').Invoke()
    $pattern = "\[ScriptBlock\]::Create\s*\(\s*['\`"](.+?)['\`"]\s*\)\s*\.Invoke\s*\(\s*\)"
    $match = [regex]::Match($Code, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Singleline)
    
    if ($match.Success) {
        $result = $match.Groups[1].Value
        $changed = $true
        return @{ result = $result; changed = $changed }
    }

    # Pattern 2: Variable-based - $sb = [ScriptBlock]::Create('code'); $sb.Invoke()
    # Step 1: Find ScriptBlock variable assignments
    $sbAssignments = @{}
    $assignPattern = '\$(\w+)\s*=\s*\[ScriptBlock\]::Create\s*\(\s*[''"](.+?)[''"]\s*\)'
    $assignMatches = [regex]::Matches($Code, $assignPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Singleline)
    
    foreach ($m in $assignMatches) {
        $varName = $m.Groups[1].Value
        $scriptCode = $m.Groups[2].Value
        $sbAssignments[$varName] = $scriptCode
    }

    if ($sbAssignments.Count -gt 0) {
        # Step 2: Find $varName.Invoke() calls and extract the code
        foreach ($varName in $sbAssignments.Keys) {
            $invokePattern = '\$' + [regex]::Escape($varName) + '\s*\.\s*Invoke\s*\(\s*\)'
            if ([regex]::IsMatch($result, $invokePattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
                # Replace the Invoke() call with the actual code
                $result = [regex]::Replace($result, $invokePattern, $sbAssignments[$varName], [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
                $changed = $true
            }
        }
        
        # Step 3: Remove the ScriptBlock assignment lines
        if ($changed) {
            foreach ($varName in $sbAssignments.Keys) {
                $removePattern = '^\s*\$' + [regex]::Escape($varName) + '\s*=\s*\[ScriptBlock\]::Create\s*\([^)]+\)\s*[\r\n]+'
                $result = [regex]::Replace($result, $removePattern, '', [System.Text.RegularExpressions.RegexOptions]::Multiline -bor [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
            }
        }
    }

    return @{
        result = $result
        changed = $changed
    }
}

function Resolve-DisguisedIex {
    <#
    .SYNOPSIS
        Resolve disguised IEX/Invoke-Expression calls
    .DESCRIPTION
        Detects IEX built via string concatenation with & or . operators.
        Example: &("I"+"EX") "command" -> IEX "command"
        Example: .("I"+"E"+"X") "command" -> IEX "command"
    #>
    param([string]$Code)

    $result = $Code
    
    # Pattern: &("I"+"E"+"X") or .("I"+"E"+"X") or &('I'+'E'+'X')
    # First, find these patterns and resolve the concatenation to check if it spells IEX
    $pattern = '([.&])\s*\(\s*([''"][^''"]*[''"](?:\s*\+\s*[''"][^''"]*[''"])+)\s*\)'
    
    $result = [regex]::Replace($result, $pattern, {
        param($match)
        $operator = $match.Groups[1].Value
        $concatExpr = $match.Groups[2].Value
        
        # Extract all the quoted strings and join them
        $parts = [regex]::Matches($concatExpr, "['\`"]([^'\`"]*)['\`"]")
        $joined = ""
        foreach ($p in $parts) {
            $joined += $p.Groups[1].Value
        }
        
        # Check if it resolves to IEX or Invoke-Expression
        if ($joined -match '^IEX$' -or $joined -match '^Invoke-Expression$') {
            return "$operator IEX"
        }
        
        return $match.Value
    }, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

    return @{
        result = $result
        changed = ($result -ne $Code)
    }
}

function Resolve-RedundantCasting {
    <#
    .SYNOPSIS
        Remove redundant ToString() calls and excessive casting
    .DESCRIPTION
        Simplifies expressions with unnecessary type conversions.
        Example: ([string][char]72).ToString() -> 'H'
        Example: [string]('hello') -> 'hello'
    #>
    param([string]$Code)

    $result = $Code
    
    # Pattern: [string]('value') -> 'value'
    $result = [regex]::Replace($result, '\[string\]\s*\(\s*([''"][^''"]*[''"])\s*\)', {
        param($match)
        return $match.Groups[1].Value
    }, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    
    # Pattern: ('value').ToString() -> 'value'
    $result = [regex]::Replace($result, '\(\s*([''"][^''"]*[''"])\s*\)\.ToString\s*\(\s*\)', {
        param($match)
        return $match.Groups[1].Value
    }, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    
    # Pattern: 'value'.ToString() -> 'value'
    $result = [regex]::Replace($result, "(['\`"][^'\`"]*['\`"])\.ToString\s*\(\s*\)", {
        param($match)
        return $match.Groups[1].Value
    }, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

    return @{
        result = $result
        changed = ($result -ne $Code)
    }
}

function Resolve-ShellIdIndexing {
    <#
    .SYNOPSIS
        Resolve $ShellId variable indexing tricks
    .DESCRIPTION
        Resolves common obfuscation using $ShellId character indexing.
        $ShellId = "Microsoft.PowerShell" (always this value)
        Example: $ShellId[1]+$ShellId[13]+'x' -> 'IEx' (Invoke-Expression)
    #>
    param([string]$Code)

    $result = $Code
    $shellId = "Microsoft.PowerShell"
    
    # Pattern: $ShellId[N] or $SHeLLiD[N] (case insensitive)
    $result = [regex]::Replace($result, '\$ShellId\s*\[\s*(\d+)\s*\]', {
        param($match)
        $index = [int]$match.Groups[1].Value
        if ($index -lt $shellId.Length) {
            return "'" + $shellId[$index] + "'"
        }
        return $match.Value
    }, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

    return @{
        result = $result
        changed = ($result -ne $Code)
    }
}

function Resolve-VerbosePreferenceIndexing {
    <#
    .SYNOPSIS
        Resolve $VerbosePreference variable indexing tricks
    .DESCRIPTION
        Resolves obfuscation using $VerbosePreference character indexing.
        $VerbosePreference = "SilentlyContinue" (default value)
        Example: $VerbosePreference[1,3] -> 'i','e' -> used with -join to form 'ie'
    #>
    param([string]$Code)

    $result = $Code
    $verbosePref = "SilentlyContinue"
    
    # Pattern: $VerbosePreference[N] single index
    $result = [regex]::Replace($result, '\$VerbosePreference\s*\[\s*(\d+)\s*\]', {
        param($match)
        $index = [int]$match.Groups[1].Value
        if ($index -lt $verbosePref.Length) {
            return "'" + $verbosePref[$index] + "'"
        }
        return $match.Value
    }, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    
    # Pattern: $VerbosePreference[N,M,...] multiple indices (returns array)
    $result = [regex]::Replace($result, '\$VerbosePreference\s*\[\s*([\d,\s]+)\s*\]', {
        param($match)
        $indices = $match.Groups[1].Value -split ',' | ForEach-Object { [int]$_.Trim() }
        $chars = @()
        foreach ($idx in $indices) {
            if ($idx -lt $verbosePref.Length) {
                $chars += "'" + $verbosePref[$idx] + "'"
            }
        }
        if ($chars.Count -gt 0) {
            return "(" + ($chars -join ',') + ")"
        }
        return $match.Value
    }, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

    return @{
        result = $result
        changed = ($result -ne $Code)
    }
}

function Resolve-SimpleReversedString {
    <#
    .SYNOPSIS
        Resolve simple reversed string patterns
    .DESCRIPTION
        Handles patterns like:
        - 'olleH' -split '' | [Array]::Reverse($_); -join $_
        - ('olleH'[-1..-5] -join '')
        - -join 'olleH'[-1..-5]
        - [string]::Join('', 'olleH'[-1..-5])
    #>
    param([string]$Code)

    $result = $Code
    $changed = $false

    # Pattern 1: 'string' -split '' | [Array]::Reverse($_); -join $_
    # or ('string' -split '' | [Array]::Reverse($_); -join $_)
    $pattern1 = "\(?'([^']+)'\s*-split\s*''\s*\|\s*\[Array\]::Reverse\s*\(\s*\`$_\s*\)\s*;\s*-join\s*\`$_\s*\)?"
    $match1 = [regex]::Match($Code, $pattern1, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if ($match1.Success) {
        $original = $match1.Groups[1].Value
        $charArray = $original.ToCharArray()
        [array]::Reverse($charArray)
        $reversed = -join $charArray
        $result = $Code.Replace($match1.Value, "'$reversed'")
        $changed = $true
    }

    # Pattern 2: 'string'[-1..-N] -join '' or -join 'string'[-1..-N]
    if (-not $changed) {
        $pattern2 = "'([^']+)'\s*\[\s*-1\s*\.\.\s*-(\d+)\s*\]"
        $match2 = [regex]::Match($Code, $pattern2, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        if ($match2.Success) {
            $original = $match2.Groups[1].Value
            $count = [int]$match2.Groups[2].Value
            if ($count -eq $original.Length) {
                $charArray = $original.ToCharArray()
                [array]::Reverse($charArray)
                $reversed = -join $charArray
                
                # Replace the slicing expression with the reversed string
                # Check if it's wrapped in -join or similar
                if ($Code -match "-join\s*$([regex]::Escape($match2.Value))") {
                    $result = $Code -replace "-join\s*$([regex]::Escape($match2.Value))", "'$reversed'"
                    $changed = $true
                } elseif ($Code -match "$([regex]::Escape($match2.Value))\s*-join\s*''") {
                    $result = $Code -replace "$([regex]::Escape($match2.Value))\s*-join\s*''", "'$reversed'"
                    $changed = $true
                } else {
                    # Just replace the slice expression
                    $result = $Code.Replace($match2.Value, "('$reversed'.ToCharArray())")
                    $changed = $true
                }
            }
        }
    }

    # Pattern 3: Simple reverse with variable: $x = 'olleH'; $x[-1..-($x.Length)]
    # This is harder to track statically

    return @{
        result = $result
        changed = $changed
    }
}

function Resolve-ReversedString {
    <#
    .SYNOPSIS
        Resolve reversed string obfuscation with Replace chains
    .DESCRIPTION
        Detects patterns where strings are reversed and then unreversed at runtime.
        The reversed string CONTAINS .replACe() chains that become active after reversal.
        Pattern: $var = [char[]]"...eCAlper..."; [array]::Reverse($var); IEX(-join $var)
        After reversal, the .eCAlper. becomes .replACe. and substitutions are applied.
    #>
    param([string]$Code)

    $result = $Code
    $changed = $false

    # Look for pattern: $varName = [char[]]"string" or [char[]]'string'
    # Try double-quoted string first (allows single quotes inside)
    $charArrayPatternDQ = '\$(\w+)\s*=\s*\[(?:ChaR|char)\s*\[\s*\]\s*\]\s*"([^"]+)"'
    $charArrayMatch = [regex]::Match($Code, $charArrayPatternDQ, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Singleline)
    
    # If no match, try single-quoted string (allows double quotes inside)
    if (-not $charArrayMatch.Success) {
        $charArrayPatternSQ = "\`$(\w+)\s*=\s*\[(?:ChaR|char)\s*\[\s*\]\s*\]\s*'([^']+)'"
        $charArrayMatch = [regex]::Match($Code, $charArrayPatternSQ, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Singleline)
    }
    
    if ($charArrayMatch.Success) {
        $varName = $charArrayMatch.Groups[1].Value
        $stringValue = $charArrayMatch.Groups[2].Value
        
        # Check if there's a Reverse call for this variable
        $reversePattern = "\[(?:aRRAy|array)\s*\]::REVerse\s*\(\s*\`$$varName\s*\)"
        if ($Code -match $reversePattern) {
            # Step 1: Reverse the string - this reveals the .replACe() calls
            $charArray = $stringValue.ToCharArray()
            [array]::Reverse($charArray)
            $reversedCode = -join $charArray
            
            # Step 2: The reversed code is something like:
            # '...payload...').replACe('Wzv',[StRINg][char]39).replACe(...)
            # Note: The base string may end with ') not just '
            
            # Find where .replACe chain starts - look for the last ')' before .replACe
            # Extract everything before the first .replACe as the base, then apply replacements
            
            # First, collect all the replacement mappings from the .replACe() calls
            $replacements = [ordered]@{}
            
            # Pattern 1: .replACe('string',[StRINg][char]NN) - string to char code
            $pattern1 = "\.replACe\s*\(\s*'([^']+)'\s*,\s*\[StRINg\]\s*\[char\]\s*(\d+)\s*\)"
            $matches1 = [regex]::Matches($reversedCode, $pattern1, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
            foreach ($m in $matches1) {
                $old = $m.Groups[1].Value
                $new = [char][int]$m.Groups[2].Value
                $replacements[$old] = [string]$new
            }
            
            # Pattern 2: .replACe(([cHar]107+[cHar]99+[cHar]90),'$') - char codes to string
            # Example: [cHar]107 = 'k', [cHar]99 = 'c', [cHar]90 = 'Z' => 'kcZ' -> '$'
            $pattern2 = "\.replACe\s*\(\s*\(([^)]+)\)\s*,\s*'([^']*)'\s*\)"
            $matches2 = [regex]::Matches($reversedCode, $pattern2, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
            foreach ($m in $matches2) {
                $concatParts = $m.Groups[1].Value
                $old = ""
                
                # First try to extract [cHar]NN codes
                $charCodeMatches = [regex]::Matches($concatParts, '\[cHar\]\s*(\d+)', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
                if ($charCodeMatches.Count -gt 0) {
                    foreach ($cm in $charCodeMatches) {
                        $old += [char][int]$cm.Groups[1].Value
                    }
                } else {
                    # Fallback to quoted strings
                    $partMatches = [regex]::Matches($concatParts, "'([^']*)'")
                    foreach ($p in $partMatches) {
                        $old += $p.Groups[1].Value
                    }
                }
                
                $new = $m.Groups[2].Value
                if ($old) {
                    $replacements[$old] = $new
                }
            }
            
            # Pattern 3: .replACe(('a'+'b'+'c'),[StRINg]'new') - concatenated to string
            # Pattern 3: .replACe(([cHar]...),([StRINg]'new')) - char codes to [StRINg]'value'
            $pattern3 = "\.replACe\s*\(\s*\(([^)]+)\)\s*,\s*\[StRINg\]\s*'([^']*)'\s*\)"
            $matches3 = [regex]::Matches($reversedCode, $pattern3, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
            foreach ($m in $matches3) {
                $concatParts = $m.Groups[1].Value
                $old = ""
                
                # First try to extract [cHar]NN codes
                $charCodeMatches = [regex]::Matches($concatParts, '\[cHar\]\s*(\d+)', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
                if ($charCodeMatches.Count -gt 0) {
                    foreach ($cm in $charCodeMatches) {
                        $old += [char][int]$cm.Groups[1].Value
                    }
                } else {
                    # Fallback to quoted strings
                    $partMatches = [regex]::Matches($concatParts, "'([^']*)'")
                    foreach ($p in $partMatches) {
                        $old += $p.Groups[1].Value
                    }
                }
                
                $new = $m.Groups[2].Value
                if ($old) {
                    $replacements[$old] = $new
                }
            }
            
            # Pattern 4: .replACe(([cHar]...),[StRINg][char]NN) - char codes to char code
            $pattern4 = "\.replACe\s*\(\s*\(([^)]+)\)\s*,\s*\[StRINg\]\s*\[char\]\s*(\d+)\s*\)"
            $matches4 = [regex]::Matches($reversedCode, $pattern4, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
            foreach ($m in $matches4) {
                $concatParts = $m.Groups[1].Value
                $old = ""
                
                # First try to extract [cHar]NN codes
                $charCodeMatches = [regex]::Matches($concatParts, '\[cHar\]\s*(\d+)', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
                if ($charCodeMatches.Count -gt 0) {
                    foreach ($cm in $charCodeMatches) {
                        $old += [char][int]$cm.Groups[1].Value
                    }
                } else {
                    # Fallback to quoted strings
                    $partMatches = [regex]::Matches($concatParts, "'([^']*)'")
                    foreach ($p in $partMatches) {
                        $old += $p.Groups[1].Value
                    }
                }
                
                $new = [char][int]$m.Groups[2].Value
                if ($old) {
                    $replacements[$old] = [string]$new
                }
            }
            
            # Pattern 5: .replACe('old','new') - simple string to string
            $pattern5 = "\.replACe\s*\(\s*'([^']+)'\s*,\s*'([^']*)'\s*\)"
            $matches5 = [regex]::Matches($reversedCode, $pattern5, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
            foreach ($m in $matches5) {
                $old = $m.Groups[1].Value
                $new = $m.Groups[2].Value
                $replacements[$old] = $new
            }
            
            # Extract the base string - everything before the first .replACe
            # The base can be: '...content...' or ('...content...')
            $baseString = $reversedCode
            $firstReplaceIdx = $reversedCode.IndexOf('.replACe', [System.StringComparison]::OrdinalIgnoreCase)
            if ($firstReplaceIdx -eq -1) {
                $firstReplaceIdx = $reversedCode.IndexOf('.replace', [System.StringComparison]::OrdinalIgnoreCase)
            }
            
            if ($firstReplaceIdx -gt 0) {
                $baseString = $reversedCode.Substring(0, $firstReplaceIdx)
                # Remove surrounding quotes and parentheses
                $baseString = $baseString.Trim()
                if ($baseString.StartsWith("('") -and $baseString.EndsWith("')")) {
                    $baseString = $baseString.Substring(2, $baseString.Length - 4)
                } elseif ($baseString.StartsWith("'") -and $baseString.EndsWith("'")) {
                    $baseString = $baseString.Substring(1, $baseString.Length - 2)
                }
            }
            
            # Apply all replacements
            $deobfuscated = $baseString
            
            # FIRST: Resolve string concatenations: 'a'+'b' -> 'ab'
            # This must happen BEFORE replacements so that split placeholders like 'kc'+'Z' become 'kcZ'
            $concatPattern = "'([^']*)'\s*\+\s*'([^']*)'"
            $maxConcat = 50
            $concatCount = 0
            while ($deobfuscated -match $concatPattern -and $concatCount -lt $maxConcat) {
                $deobfuscated = [regex]::Replace($deobfuscated, $concatPattern, { 
                    param($m) 
                    "'" + $m.Groups[1].Value + $m.Groups[2].Value + "'"
                })
                $concatCount++
            }
            
            Write-Host "[DEBUG] After concatenation resolution, length: $($deobfuscated.Length)"
            Write-Host "[DEBUG] Replacements to apply:"
            foreach ($key in $replacements.Keys) {
                Write-Host "[DEBUG]   '$key' -> '$($replacements[$key])'"
            }
            
            # NOW apply replacements
            foreach ($key in $replacements.Keys) {
                $before = $deobfuscated
                # Use regex for case-insensitive replacement to catch all occurrences
                $escapedKey = [regex]::Escape($key)
                $deobfuscated = [regex]::Replace($deobfuscated, $escapedKey, $replacements[$key])
                if ($before -ne $deobfuscated) {
                    Write-Host "[DEBUG] Applied: '$key' -> '$($replacements[$key])'"
                }
            }
            
            # Handle \n -> actual newlines
            $deobfuscated = $deobfuscated.Replace('\n', "`n")
            
            $result = $deobfuscated
            $changed = $true
        }
    }

    return @{
        result = $result
        changed = $changed
    }
}

function Resolve-EnvVariableIndexing {
    <#
    .SYNOPSIS
        Resolve environment variable indexing tricks
    .DESCRIPTION
        Resolves obfuscation using common env variables.
        Example: $env:ComSpec[4,15,25]-join'' -> 'IEX'
        $env:ComSpec = "C:\Windows\system32\cmd.exe"
    #>
    param([string]$Code)

    $result = $Code
    
    # Common env variables used for obfuscation
    $envVars = @{
        'ComSpec' = 'C:\Windows\system32\cmd.exe'
        'PSModulePath' = 'C:\Users\user\Documents\WindowsPowerShell\Modules'
    }
    
    # Pattern: $env:VarName[N] (simple single index)
    $result = [regex]::Replace($result, '\$env:(\w+)\s*\[\s*(\d+)\s*\]', {
        param($match)
        $varName = $match.Groups[1].Value
        $index = [int]$match.Groups[2].Value
        if ($envVars.ContainsKey($varName)) {
            $value = $envVars[$varName]
            if ($index -lt $value.Length) {
                return "'" + $value[$index] + "'"
            }
        }
        return $match.Value
    }, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

    return @{
        result = $result
        changed = ($result -ne $Code)
    }
}

function Resolve-Base64DeflateStream {
    <#
    .SYNOPSIS
        Resolve Base64 encoded DeflateStream compressed payloads
    .DESCRIPTION
        Safely decompresses and decodes Base64+Deflate payloads commonly used
        in obfuscated PowerShell. ONLY decodes - NEVER executes.
        Example: [IO.Compression.DeflateStream](...FromBase64String('xxx')...)
    #>
    param([string]$Code)

    $result = $Code
    $changed = $false

    # First check if this looks like a DeflateStream command
    if ($Code -match 'DeflateStream|GzipStream' -and $Code -match 'FromBase64String') {
        
        # Extract Base64 string - pattern: FromBase64String('BASE64_CONTENT')
        # Allow for whitespace/newlines inside the Base64 string (copy-paste artifacts)
        $base64Pattern = "FromBase64String\s*\(\s*'([A-Za-z0-9+/=\s]+)'\s*\)"
        
        $base64Match = [regex]::Match($Code, $base64Pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Singleline)
        
        if ($base64Match.Success) {
            # Remove any whitespace from the Base64 string
            $base64 = $base64Match.Groups[1].Value -replace '\s', ''
            Write-Host "[DEBUG] DeflateStream: Extracted Base64 length: $($base64.Length)"
            
            try {
                $bytes = [Convert]::FromBase64String($base64)
                $ms = [IO.MemoryStream]::new($bytes)
                
                # Try DeflateStream first
                $decoded = $null
                try {
                    $ds = [IO.Compression.DeflateStream]::new($ms, [IO.Compression.CompressionMode]::Decompress)
                    $sr = [IO.StreamReader]::new($ds, [Text.Encoding]::ASCII)
                    $decoded = $sr.ReadToEnd()
                    $sr.Close()
                    $ds.Close()
                }
                catch {
                    # Try GzipStream as fallback
                    $ms = [IO.MemoryStream]::new($bytes)
                    try {
                        $gs = [IO.Compression.GzipStream]::new($ms, [IO.Compression.CompressionMode]::Decompress)
                        $sr = [IO.StreamReader]::new($gs, [Text.Encoding]::ASCII)
                        $decoded = $sr.ReadToEnd()
                        $sr.Close()
                        $gs.Close()
                    }
                    catch { }
                }
                $ms.Close()
                
                if ($decoded -and $decoded.Length -gt 0) {
                    # Strategy: Find the complete expression containing the DeflateStream
                    # Look for pattern: ( ... DeflateStream ... ReadToEnd() } )
                    # or just: ( ... DeflateStream ... ReadToEnd() )
                    
                    # Find the index of New-Object that precedes DeflateStream
                    $deflateIdx = $Code.IndexOf('DeflateStream', 0, [StringComparison]::OrdinalIgnoreCase)
                    
                    if ($deflateIdx -gt 0) {
                        # Find the opening paren that wraps this entire expression
                        # Walk backwards from DeflateStream to find an unmatched (
                        $parenDepth = 0
                        $startOffset = -1
                        
                        for ($i = $deflateIdx; $i -ge 0; $i--) {
                            $char = $Code[$i]
                            if ($char -eq ')') { $parenDepth++ }
                            elseif ($char -eq '(') { 
                                if ($parenDepth -eq 0) {
                                    $startOffset = $i
                                    break
                                }
                                $parenDepth--
                            }
                        }
                        
                        if ($startOffset -ge 0) {
                            # Now find the matching closing paren/brace
                            # Find ReadToEnd() and the end of the expression
                            $readToEndIdx = $Code.IndexOf('ReadToEnd', $deflateIdx, [StringComparison]::OrdinalIgnoreCase)
                            
                            if ($readToEndIdx -gt 0) {
                                # Find the end of the complete expression after ReadToEnd()
                                # Look for the closing ) that matches our opening (
                                $parenDepth = 0
                                $braceDepth = 0
                                $endOffset = -1
                                
                                for ($i = $startOffset; $i -lt $Code.Length; $i++) {
                                    $char = $Code[$i]
                                    if ($char -eq '(') { $parenDepth++ }
                                    elseif ($char -eq ')') { 
                                        $parenDepth--
                                        if ($parenDepth -eq 0 -and $braceDepth -eq 0 -and $i -gt $readToEndIdx) {
                                            $endOffset = $i + 1
                                            break
                                        }
                                    }
                                    elseif ($char -eq '{') { $braceDepth++ }
                                    elseif ($char -eq '}') { $braceDepth-- }
                                }
                                
                                if ($endOffset -gt $startOffset) {
                                    $result = $Code.Substring(0, $startOffset) + $decoded + $Code.Substring($endOffset)
                                    $changed = $true
                                }
                            }
                        }
                    }
                }
            }
            catch {
                # Decoding failed, leave unchanged
            }
        }
    }

    return @{
        result = $result
        changed = $changed
    }
}

function Resolve-VariableBase64 {
    <#
    .SYNOPSIS
        Resolve Base64 decoding that uses variable references
    .DESCRIPTION
        Handles patterns where Base64 string is stored in a variable first:
        $e = "V3JpdGUtT3V0cHV0ICJIZWxsbyI="
        [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($e))
    #>
    param([string]$Code)

    $result = $Code
    $changed = $false

    # Step 1: Build a dictionary of variable assignments with Base64-like strings
    $varAssignments = @{}
    
    # Pattern: $varName = "base64string" or $varName = 'base64string'
    $assignPattern = '\$(\w+)\s*=\s*[''"]([A-Za-z0-9+/=]{20,})[''"]'
    $assignMatches = [regex]::Matches($Code, $assignPattern)
    
    foreach ($m in $assignMatches) {
        $varName = $m.Groups[1].Value
        $base64Value = $m.Groups[2].Value
        $varAssignments[$varName] = $base64Value
    }

    if ($varAssignments.Count -eq 0) {
        return @{ result = $Code; changed = $false }
    }

    # Step 2: Find Base64 decode patterns that use variables
    # Pattern: [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($varName))
    # Or: [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($varName))
    $decodePattern = '\[(?:System\.)?(?:Text\.)?Encoding\]::UTF8\.GetString\s*\(\s*\[(?:System\.)?Convert\]::FromBase64String\s*\(\s*\$(\w+)\s*\)\s*\)'

    $result = [regex]::Replace($Code, $decodePattern, {
        param($match)
        $varName = $match.Groups[1].Value
        
        if ($varAssignments.ContainsKey($varName)) {
            $base64 = $varAssignments[$varName]
            try {
                $decoded = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($base64))
                # Only replace if it looks like readable PowerShell code
                if ($decoded -match '^[\x20-\x7E\r\n\t]+$') {
                    $script:changed = $true
                    # Return the decoded content directly - this is the deobfuscated payload
                    return $decoded
                }
            }
            catch { }
        }
        return $match.Value
    }, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

    # Check if we made changes
    $changed = ($result -ne $Code)

    # If we decoded something, also remove the variable assignment line
    if ($changed) {
        foreach ($varName in $varAssignments.Keys) {
            # Remove the assignment line: $varName = "base64" or entire line
            $removePattern = '^\s*\$' + [regex]::Escape($varName) + '\s*=\s*[''"][A-Za-z0-9+/=]+[''"]\s*[\r\n]+'
            $result = [regex]::Replace($result, $removePattern, '', [System.Text.RegularExpressions.RegexOptions]::Multiline)
        }
    }

    return @{
        result = $result
        changed = $changed
    }
}

function Resolve-SimpleBase64 {
    <#
    .SYNOPSIS
        Resolve simple Base64 encoded strings
    .DESCRIPTION
        Decodes FromBase64String calls with static strings.
        Example: [Convert]::FromBase64String('SGVsbG8=') -> 'Hello'
    #>
    param([string]$Code)

    $result = $Code
    $changed = $false

    # Pattern: [Convert]::FromBase64String('xxx') or [System.Convert]::FromBase64String('xxx')
    $pattern = '\[(?:System\.)?Convert\]::FromBase64String\s*\(\s*[''"]([A-Za-z0-9+/=]+)[''"]\s*\)'

    $result = [regex]::Replace($Code, $pattern, {
        param($match)
        $base64 = $match.Groups[1].Value
        try {
            $decoded = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($base64))
            # Only replace if it looks like readable text
            if ($decoded -match '^[\x20-\x7E\r\n\t]+$') {
                return "'$decoded'"
            }
        }
        catch { }
        return $match.Value
    }, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

    $changed = ($result -ne $Code)

    return @{
        result = $result
        changed = $changed
    }
}

function Resolve-TickObfuscation {
    <#
    .SYNOPSIS
        Remove tick/backtick obfuscation
    .DESCRIPTION
        Removes backticks used for obfuscation (not escape sequences)
        Example: `I`n`v`o`k`e`-`E`x`p`r`e`s`s`i`o`n -> Invoke-Expression
    #>
    param([string]$Code)

    # Remove backticks before letters (obfuscation, not escaping)
    # Preserves: `n `r `t `0 `$ `" `' (actual escape sequences)
    $result = $Code -replace '`(?=[a-zA-Z])', ''

    # Also handle caret obfuscation (Windows cmd style sometimes seen)
    $result = $result -replace '\^(?=[a-zA-Z])', ''

    return @{
        result = $result
        changed = ($result -ne $Code)
    }
}

function Resolve-CharacterCodes {
    <#
    .SYNOPSIS
        Resolve character code expressions
    .DESCRIPTION
        Converts [char]N to the actual character
        Example: [char]73 -> 'I'
    #>
    param([string]$Code)

    $result = $Code
    $changed = $false

    # Pattern: [char]N or [char](N) or [CHAR]N (case insensitive)
    # IMPORTANT: Use negative lookahead to NOT match hex values (0x...)
    # The pattern must not match [char]0x48 - only pure decimal like [char]72
    $patterns = @(
        '\[char\]\s*\(?\s*([1-9]\d*|0(?!x))\s*\)?',   # Decimal: starts with 1-9, or 0 not followed by x
        '\[System\.Char\]\s*\(?\s*([1-9]\d*|0(?!x))\s*\)?'
    )

    foreach ($pattern in $patterns) {
        $result = [regex]::Replace($result, $pattern, {
            param($match)
            $charCode = [int]$match.Groups[1].Value
            if ($charCode -ge 0 -and $charCode -le 65535) {
                $script:changed = $true
                return "'$([char]$charCode)'"
            }
            return $match.Value
        }, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    }

    $changed = ($result -ne $Code)

    return @{
        result = $result
        changed = $changed
    }
}

function Resolve-FormatStrings {
    <#
    .SYNOPSIS
        Resolve PowerShell format strings
    .DESCRIPTION
        Resolves format operator expressions: "{0}{1}" -f "a","b" -> "ab"
        Uses AST to safely identify and resolve format operations
    #>
    param([string]$Code)

    $parseResult = Get-SafeAst -Code $Code
    $ast = $parseResult.Ast
    $changed = $false
    $result = $Code

    # Find all format operations (BinaryExpressionAst with Format operator)
    $formatNodes = $ast.FindAll({
        param($node)
        $node -is [System.Management.Automation.Language.BinaryExpressionAst] -and
        $node.Operator -eq 'Format'
    }, $true)

    # Process in reverse order to maintain string offsets
    $formatNodes = @($formatNodes | Sort-Object { $_.Extent.StartOffset } -Descending)

    foreach ($node in $formatNodes) {
        try {
            $formatString = $null
            $arguments = @()

            # Get the format string from left side
            if ($node.Left -is [System.Management.Automation.Language.StringConstantExpressionAst]) {
                $formatString = $node.Left.Value
            }
            elseif ($node.Left -is [System.Management.Automation.Language.ExpandableStringExpressionAst]) {
                # Skip expandable strings with variables - can't resolve statically
                continue
            }
            elseif ($node.Left -is [System.Management.Automation.Language.ParenExpressionAst]) {
                $innerAst = $node.Left.Pipeline.PipelineElements[0].Expression
                if ($innerAst -is [System.Management.Automation.Language.StringConstantExpressionAst]) {
                    $formatString = $innerAst.Value
                }
            }

            if (-not $formatString) { continue }

            # Get arguments from right side
            $rightNode = $node.Right

            if ($rightNode -is [System.Management.Automation.Language.ArrayLiteralAst]) {
                $canResolve = $true
                foreach ($element in $rightNode.Elements) {
                    if ($element -is [System.Management.Automation.Language.StringConstantExpressionAst]) {
                        $arguments += $element.Value
                    }
                    elseif ($element -is [System.Management.Automation.Language.ParenExpressionAst]) {
                        $innerExpr = $element.Pipeline.PipelineElements[0].Expression
                        if ($innerExpr -is [System.Management.Automation.Language.StringConstantExpressionAst]) {
                            $arguments += $innerExpr.Value
                        }
                        else {
                            $canResolve = $false
                            break
                        }
                    }
                    else {
                        $canResolve = $false
                        break
                    }
                }
                if (-not $canResolve) { continue }
            }
            elseif ($rightNode -is [System.Management.Automation.Language.StringConstantExpressionAst]) {
                $arguments = @($rightNode.Value)
            }
            elseif ($rightNode -is [System.Management.Automation.Language.ParenExpressionAst]) {
                $innerExpr = $rightNode.Pipeline.PipelineElements[0].Expression
                if ($innerExpr -is [System.Management.Automation.Language.StringConstantExpressionAst]) {
                    $arguments = @($innerExpr.Value)
                }
                else {
                    continue
                }
            }
            else {
                continue
            }

            # Resolve the format string
            if ($formatString -and $arguments.Count -gt 0) {
                try {
                    $resolved = $formatString -f $arguments
                    $start = $node.Extent.StartOffset
                    $length = $node.Extent.EndOffset - $start
                    $result = $result.Substring(0, $start) + "'$resolved'" + $result.Substring($start + $length)
                    $changed = $true
                }
                catch {
                    # Format failed, skip this node
                }
            }
        }
        catch {
            continue
        }
    }

    return @{
        result = $result
        changed = $changed
    }
}

function Resolve-StringConcatenation {
    <#
    .SYNOPSIS
        Resolve string concatenation
    .DESCRIPTION
        Resolves + operations on string constants: "a" + "b" -> "ab"
    #>
    param([string]$Code)

    $parseResult = Get-SafeAst -Code $Code
    $ast = $parseResult.Ast
    $changed = $false
    $result = $Code

    # Find string concatenation operations
    $concatNodes = $ast.FindAll({
        param($node)
        $node -is [System.Management.Automation.Language.BinaryExpressionAst] -and
        $node.Operator -eq 'Plus'
    }, $true)

    # Filter to only those with string constants on both sides
    $stringConcats = @($concatNodes | Where-Object {
        ($_.Left -is [System.Management.Automation.Language.StringConstantExpressionAst] -or
         ($_.Left -is [System.Management.Automation.Language.ParenExpressionAst])) -and
        ($_.Right -is [System.Management.Automation.Language.StringConstantExpressionAst] -or
         ($_.Right -is [System.Management.Automation.Language.ParenExpressionAst]))
    })

    $stringConcats = @($stringConcats | Sort-Object { $_.Extent.StartOffset } -Descending)

    foreach ($node in $stringConcats) {
        try {
            $leftValue = $null
            $rightValue = $null

            # Extract left value
            if ($node.Left -is [System.Management.Automation.Language.StringConstantExpressionAst]) {
                $leftValue = $node.Left.Value
            }
            elseif ($node.Left -is [System.Management.Automation.Language.ParenExpressionAst]) {
                $innerExpr = $node.Left.Pipeline.PipelineElements[0].Expression
                if ($innerExpr -is [System.Management.Automation.Language.StringConstantExpressionAst]) {
                    $leftValue = $innerExpr.Value
                }
            }

            # Extract right value
            if ($node.Right -is [System.Management.Automation.Language.StringConstantExpressionAst]) {
                $rightValue = $node.Right.Value
            }
            elseif ($node.Right -is [System.Management.Automation.Language.ParenExpressionAst]) {
                $innerExpr = $node.Right.Pipeline.PipelineElements[0].Expression
                if ($innerExpr -is [System.Management.Automation.Language.StringConstantExpressionAst]) {
                    $rightValue = $innerExpr.Value
                }
            }

            if ($null -ne $leftValue -and $null -ne $rightValue) {
                $combined = $leftValue + $rightValue
                $start = $node.Extent.StartOffset
                $length = $node.Extent.EndOffset - $start
                $result = $result.Substring(0, $start) + "'$combined'" + $result.Substring($start + $length)
                $changed = $true
            }
        }
        catch {
            continue
        }
    }

    return @{
        result = $result
        changed = $changed
    }
}

function Resolve-ArrayJoins {
    <#
    .SYNOPSIS
        Resolve array join operations
    .DESCRIPTION
        Resolves -join operations: ('a','b','c') -join '' -> 'abc'
    #>
    param([string]$Code)

    $parseResult = Get-SafeAst -Code $Code
    $ast = $parseResult.Ast
    $changed = $false
    $result = $Code

    # Find join operations
    $joinNodes = $ast.FindAll({
        param($node)
        $node -is [System.Management.Automation.Language.BinaryExpressionAst] -and
        $node.Operator -eq 'Join'
    }, $true)

    $joinNodes = @($joinNodes | Sort-Object { $_.Extent.StartOffset } -Descending)

    foreach ($node in $joinNodes) {
        try {
            $elements = @()
            $separator = ''

            # Get the array elements from left side
            $leftNode = $node.Left
            if ($leftNode -is [System.Management.Automation.Language.ArrayLiteralAst]) {
                $canResolve = $true
                foreach ($elem in $leftNode.Elements) {
                    if ($elem -is [System.Management.Automation.Language.StringConstantExpressionAst]) {
                        $elements += $elem.Value
                    }
                    else {
                        $canResolve = $false
                        break
                    }
                }
                if (-not $canResolve) { continue }
            }
            elseif ($leftNode -is [System.Management.Automation.Language.ParenExpressionAst]) {
                $innerExpr = $leftNode.Pipeline.PipelineElements[0].Expression
                if ($innerExpr -is [System.Management.Automation.Language.ArrayLiteralAst]) {
                    $canResolve = $true
                    foreach ($elem in $innerExpr.Elements) {
                        if ($elem -is [System.Management.Automation.Language.StringConstantExpressionAst]) {
                            $elements += $elem.Value
                        }
                        else {
                            $canResolve = $false
                            break
                        }
                    }
                    if (-not $canResolve) { continue }
                }
                else {
                    continue
                }
            }
            else {
                continue
            }

            # Get separator from right side
            if ($node.Right -is [System.Management.Automation.Language.StringConstantExpressionAst]) {
                $separator = $node.Right.Value
            }
            else {
                continue
            }

            if ($elements.Count -gt 0) {
                $joined = $elements -join $separator
                $start = $node.Extent.StartOffset
                $length = $node.Extent.EndOffset - $start
                $result = $result.Substring(0, $start) + "'$joined'" + $result.Substring($start + $length)
                $changed = $true
            }
        }
        catch {
            continue
        }
    }

    return @{
        result = $result
        changed = $changed
    }
}

function Resolve-StringReplace {
    <#
    .SYNOPSIS
        Resolve string .Replace() method calls
    .DESCRIPTION
        Resolves simple replace operations: 'abc'.Replace('a','x') -> 'xbc'
    #>
    param([string]$Code)

    $changed = $false
    $result = $Code

    # Pattern for simple string replace: 'string'.Replace('old','new')
    $pattern = "'([^']+)'\.Replace\s*\(\s*'([^']*)'\s*,\s*'([^']*)'\s*\)"

    $result = [regex]::Replace($Code, $pattern, {
        param($match)
        $original = $match.Groups[1].Value
        $old = $match.Groups[2].Value
        $new = $match.Groups[3].Value
        $replaced = $original.Replace($old, $new)
        $script:changed = $true
        return "'$replaced'"
    }, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

    $changed = ($result -ne $Code)

    return @{
        result = $result
        changed = $changed
    }
}

function Resolve-VariableSubstitution {
    <#
    .SYNOPSIS
        Resolve simple variable assignments where safe
    .DESCRIPTION
        Only resolves variables that are assigned constant string values
        and used in simple contexts. Very conservative to avoid issues.
        Also substitutes variables used as command arguments.
    #>
    param([string]$Code)

    $parseResult = Get-SafeAst -Code $Code
    $ast = $parseResult.Ast
    $changed = $false
    $result = $Code

    # Build a map of variable -> value for constant string assignments
    $varMap = @{}

    $assignments = $ast.FindAll({
        param($node)
        $node -is [System.Management.Automation.Language.AssignmentStatementAst] -and
        $node.Operator -eq 'Equals'
    }, $true)

    foreach ($assignment in $assignments) {
        if ($assignment.Left -is [System.Management.Automation.Language.VariableExpressionAst] -and
            $assignment.Right -is [System.Management.Automation.Language.StringConstantExpressionAst]) {
            $varName = $assignment.Left.VariablePath.UserPath
            $varValue = $assignment.Right.Value
            # Only track short, simple variable names
            if ($varName.Length -le 20 -and $varName -match '^[a-zA-Z_][a-zA-Z0-9_]*$') {
                $varMap[$varName] = $varValue
            }
        }
    }

    # Find variable usages in string contexts and substitute
    foreach ($var in $varMap.Keys) {
        $varValue = $varMap[$var]
        # Pattern 1: & $varname or . $varname (invoke with variable)
        $invokePattern = '([&\.])\s*\$' + [regex]::Escape($var) + '(?![a-zA-Z0-9_])'
        $newResult = [regex]::Replace($result, $invokePattern, "`$1'$varValue'", [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        if ($newResult -ne $result) {
            $result = $newResult
            $changed = $true
        }
    }

    # Pattern 2: Substitute variables used as command arguments
    # e.g., $z="Hello";Write-Host $z -> Write-Host "Hello"
    # Re-parse after any changes above
    if ($varMap.Count -gt 0) {
        $parseResult2 = Get-SafeAst -Code $result
        $ast2 = $parseResult2.Ast

        # Find all variable references used as command arguments
        $commandNodes = $ast2.FindAll({
            param($node)
            $node -is [System.Management.Automation.Language.CommandAst]
        }, $true)

        # Process in reverse offset order
        $replacements = @()
        foreach ($cmd in $commandNodes) {
            # Skip first element (the command name itself)
            for ($i = 1; $i -lt $cmd.CommandElements.Count; $i++) {
                $elem = $cmd.CommandElements[$i]
                if ($elem -is [System.Management.Automation.Language.VariableExpressionAst]) {
                    $vName = $elem.VariablePath.UserPath
                    if ($varMap.ContainsKey($vName)) {
                        $replacements += @{
                            Start = $elem.Extent.StartOffset
                            Length = $elem.Extent.EndOffset - $elem.Extent.StartOffset
                            Value = "`"$($varMap[$vName])`""
                        }
                    }
                }
            }
        }

        # Apply replacements in reverse order
        $replacements = $replacements | Sort-Object { $_.Start } -Descending
        foreach ($rep in $replacements) {
            $result = $result.Substring(0, $rep.Start) + $rep.Value + $result.Substring($rep.Start + $rep.Length)
            $changed = $true
        }

        # Remove the variable assignment lines for substituted variables if all uses replaced
        if ($changed) {
            foreach ($var in $varMap.Keys) {
                # Check if the variable is still referenced
                $stillUsed = [regex]::IsMatch($result, '\$' + [regex]::Escape($var) + '(?![a-zA-Z0-9_])')
                if (-not $stillUsed) {
                    # Remove assignment line
                    $removePattern = '\$' + [regex]::Escape($var) + '\s*=\s*[''"][^''"]*[''"]\s*;?\s*'
                    $result = [regex]::Replace($result, $removePattern, '')
                }
            }
            $result = $result.Trim()
        }
    }

    return @{
        result = $result
        changed = $changed
    }
}

function Resolve-PowerShellLauncher {
    <#
    .SYNOPSIS
        Extract command from powershell.exe launcher wrappers
    .DESCRIPTION
        Handles two patterns:
        1. powershell[.exe] [-flags] -Command "actual command" -> extracts the command
        2. powershell[.exe] -e[ncodedcommand] "base64" -> decodes UTF-16LE base64
        Flags like -NoP, -NonI, -W Hidden, -Exec Bypass are stripped.
    #>
    param([string]$Code)

    $result = $Code
    $changed = $false

    # Helper: decode UTF-16LE base64 with odd-byte-count protection
    function DecodeUtf16Base64([string]$base64) {
        $bytes = [Convert]::FromBase64String($base64)
        # Ensure even byte count for UTF-16LE (pad with 0x00 if odd)
        if ($bytes.Length % 2 -ne 0) {
            $padded = [byte[]]::new($bytes.Length + 1)
            [Array]::Copy($bytes, $padded, $bytes.Length)
            $bytes = $padded
        }
        $decoded = [System.Text.Encoding]::Unicode.GetString($bytes)
        # Trim trailing null characters
        return $decoded.TrimEnd([char]0)
    }

    # Pattern 1: powershell[.exe] ... -EncodedCommand "base64" or -e "base64"
    # Use [''""] - in PS single-quoted string, '' is escaped single quote, " is literal
    $encodedPattern = '^\s*(?:powershell(?:\.exe)?)\s+(?:(?:-\w+\s+(?:\w+\s+)?)*?)(?:-e(?:nc(?:odedcommand)?)?)\s+[''"]?([A-Za-z0-9+/=]+)[''"]?\s*$'
    $encodedMatch = [regex]::Match($Code, $encodedPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

    if ($encodedMatch.Success) {
        $base64 = $encodedMatch.Groups[1].Value
        try {
            $decoded = DecodeUtf16Base64 $base64
            if ($decoded -and $decoded.Length -gt 0) {
                $result = $decoded.Trim()
                $changed = $true
                return @{ result = $result; changed = $changed }
            }
        }
        catch {
            Write-Host "[DEBUG] PowerShellLauncher: Base64 decode failed: $_"
        }
    }

    # Pattern 2: powershell[.exe] ... -Command "actual command"
    $commandPattern = '^\s*(?:powershell(?:\.exe)?)\s+(?:(?:-\w+\s+(?:\w+\s+)?)*?)(?:-(?:c(?:ommand)?))\s+[''"](.+)[''"]\s*$'
    $commandMatch = [regex]::Match($Code, $commandPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Singleline)

    if ($commandMatch.Success) {
        $result = $commandMatch.Groups[1].Value.Trim()
        $changed = $true
        return @{ result = $result; changed = $changed }
    }

    # Pattern 3: Simpler - just powershell -e base64 (no quotes, no other flags)
    $simpleEncPattern = '^\s*(?:powershell(?:\.exe)?)\s+(?:-\w+\s+)*-e(?:nc(?:odedcommand)?)?\s+([A-Za-z0-9+/=]+)\s*$'
    $simpleEncMatch = [regex]::Match($Code, $simpleEncPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

    if ($simpleEncMatch.Success) {
        $base64 = $simpleEncMatch.Groups[1].Value
        try {
            $decoded = DecodeUtf16Base64 $base64
            if ($decoded -and $decoded.Length -gt 0) {
                $result = $decoded.Trim()
                $changed = $true
            }
        }
        catch { }
    }

    return @{
        result = $result
        changed = $changed
    }
}

function Resolve-ScriptBlockWrapper {
    <#
    .SYNOPSIS
        Resolve scriptblock invocation wrappers
    .DESCRIPTION
        Handles patterns where & or . invoke a scriptblock containing a single command:
        - &{Write-Host} "args" -> Write-Host "args"
        - .{Get-Process} -> Get-Process
        - (&{cmdlet} args) -> (cmdlet args)
        Uses AST to safely identify ScriptBlockExpressionAst nodes.
    #>
    param([string]$Code)

    $result = $Code
    $changed = $false

    # Pattern: &{command-name} or .{command-name}
    # The scriptblock contains a single simple command (cmdlet name)
    $pattern = '([&\.])\s*\{\s*([a-zA-Z][a-zA-Z0-9\-]*)\s*\}'

    $result = [regex]::Replace($result, $pattern, {
        param($match)
        $cmdName = $match.Groups[2].Value
        return $cmdName
    }, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

    $changed = ($result -ne $Code)

    # Clean up: if the whole thing was wrapped in parens like (&{cmd} args) -> (cmd args)
    # The regex above already handles this by just replacing &{cmd} with cmd

    return @{
        result = $result
        changed = $changed
    }
}

function Resolve-UnicodeBase64 {
    <#
    .SYNOPSIS
        Resolve Unicode (UTF-16LE) Base64 encoded strings
    .DESCRIPTION
        Handles the pattern:
        [System.Text.Encoding]::Unicode.GetString([System.Convert]::FromBase64String("base64"))
        Decodes the base64 bytes using UTF-16LE (PowerShell's default Unicode encoding).
        Also handles [Text.Encoding]::Unicode.GetString(...) without System. prefix.
    #>
    param([string]$Code)

    $result = $Code
    $changed = $false

    # Pattern: [System.Text.Encoding]::Unicode.GetString([System.Convert]::FromBase64String("xxx"))
    # With optional System. prefix for both types
    # Use [''""] - in PS single-quoted string, '' is escaped single quote, " is literal
    $pattern = '\[(?:System\.)?Text\.Encoding\]::Unicode\.GetString\s*\(\s*\[(?:System\.)?Convert\]::FromBase64String\s*\(\s*[''"]([A-Za-z0-9+/=]+)[''"]\s*\)\s*\)'

    $result = [regex]::Replace($Code, $pattern, {
        param($match)
        $base64 = $match.Groups[1].Value
        try {
            $bytes = [Convert]::FromBase64String($base64)
            # Ensure even byte count for UTF-16LE (pad with 0x00 if odd)
            if ($bytes.Length % 2 -ne 0) {
                $padded = [byte[]]::new($bytes.Length + 1)
                [Array]::Copy($bytes, $padded, $bytes.Length)
                $bytes = $padded
            }
            $decoded = [System.Text.Encoding]::Unicode.GetString($bytes)
            # Trim trailing null characters
            $decoded = $decoded.TrimEnd([char]0)
            # Allow printable ASCII plus common Unicode (reject control chars except CR/LF/Tab)
            if ($decoded -and $decoded.Length -gt 0 -and $decoded -notmatch '[\x00-\x08\x0E-\x1F]') {
                return "'$decoded'"
            }
        }
        catch {
            Write-Host "[DEBUG] UnicodeBase64: Decode failed: $_"
        }
        return $match.Value
    }, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

    $changed = ($result -ne $Code)

    return @{
        result = $result
        changed = $changed
    }
}

function Resolve-StringIndexSlicing {
    <#
    .SYNOPSIS
        Resolve string index slicing with range operators
    .DESCRIPTION
        Handles patterns where characters are extracted from strings using index ranges:
        - "string"[18..3] -> extracts chars at indices 18,17,16,...,3
        - 'string'[0..4] -> extracts chars at indices 0,1,2,3,4
        - "string"[1,3,5] -> extracts chars at indices 1,3,5
        Uses AST to properly handle strings with escape characters (backtick-escaped quotes).
        Falls back to regex for cases AST cannot parse.
        Common in obfuscation to build commands from innocent-looking strings.
    #>
    param([string]$Code)

    $result = $Code
    $changed = $false

    try {
        # Use AST to find IndexExpressionAst nodes where target is a string constant
        $parseResult = Get-SafeAst -Code $Code
        $ast = $parseResult.Ast

        if (-not $ast) {
            return @{ result = $Code; changed = $false }
        }

        # Find all index expressions: something[index]
        $indexNodes = @($ast.FindAll({
            param($node)
            $node -is [System.Management.Automation.Language.IndexExpressionAst]
        }, $true))

        if ($indexNodes.Count -eq 0) {
            return @{ result = $Code; changed = $false }
        }

        # Process in reverse offset order to maintain positions
        $indexNodes = @($indexNodes | Sort-Object { $_.Extent.StartOffset } -Descending)

        foreach ($node in $indexNodes) {
            try {
                # The target must be a string constant (the string being indexed)
                $targetNode = $node.Target
                $stringValue = $null

                if ($targetNode -is [System.Management.Automation.Language.StringConstantExpressionAst]) {
                    $stringValue = $targetNode.Value
                }
                elseif ($targetNode -is [System.Management.Automation.Language.ExpandableStringExpressionAst]) {
                    # Only handle if the expandable string has no nested expressions (pure string)
                    if ($null -ne $targetNode.NestedExpressions -and $targetNode.NestedExpressions.Count -eq 0) {
                        $stringValue = $targetNode.Value
                    }
                }

                if (-not $stringValue -or $stringValue.Length -eq 0) { continue }

                # The index must be a range (N..M) or array literal
                $indexExpr = $node.Index
                $indices = [System.Collections.ArrayList]::new()

                if ($indexExpr -is [System.Management.Automation.Language.BinaryExpressionAst] -and
                    $indexExpr.Operator.ToString() -eq 'DotDot') {
                    # Range operator: N..M
                    $startVal = $null
                    $endVal = $null

                    # Extract start value
                    if ($indexExpr.Left -is [System.Management.Automation.Language.ConstantExpressionAst]) {
                        $startVal = [int]$indexExpr.Left.Value
                    }
                    elseif ($indexExpr.Left -is [System.Management.Automation.Language.UnaryExpressionAst]) {
                        try {
                            $child = $indexExpr.Left.Child
                            if ($child -is [System.Management.Automation.Language.ConstantExpressionAst]) {
                                $startVal = -[int]$child.Value
                            }
                        } catch { }
                    }

                    # Extract end value
                    if ($indexExpr.Right -is [System.Management.Automation.Language.ConstantExpressionAst]) {
                        $endVal = [int]$indexExpr.Right.Value
                    }
                    elseif ($indexExpr.Right -is [System.Management.Automation.Language.UnaryExpressionAst]) {
                        try {
                            $child = $indexExpr.Right.Child
                            if ($child -is [System.Management.Automation.Language.ConstantExpressionAst]) {
                                $endVal = -[int]$child.Value
                            }
                        } catch { }
                    }

                    if ($null -ne $startVal -and $null -ne $endVal) {
                        if ($startVal -le $endVal) {
                            for ($i = $startVal; $i -le $endVal; $i++) { [void]$indices.Add($i) }
                        } else {
                            for ($i = $startVal; $i -ge $endVal; $i--) { [void]$indices.Add($i) }
                        }
                    }
                }
                elseif ($indexExpr -is [System.Management.Automation.Language.ArrayLiteralAst]) {
                    # Comma-separated indices: N,M,O
                    foreach ($elem in $indexExpr.Elements) {
                        if ($elem -is [System.Management.Automation.Language.ConstantExpressionAst]) {
                            [void]$indices.Add([int]$elem.Value)
                        }
                    }
                }
                elseif ($indexExpr -is [System.Management.Automation.Language.ConstantExpressionAst]) {
                    # Single index: [N]
                    [void]$indices.Add([int]$indexExpr.Value)
                }

                if ($indices.Count -eq 0) { continue }

                # Extract characters at the computed indices
                $chars = [System.Collections.ArrayList]::new()
                foreach ($idx in $indices) {
                    # Handle negative indices (from end)
                    $actualIdx = $idx
                    if ($actualIdx -lt 0) { $actualIdx = $stringValue.Length + $actualIdx }
                    if ($actualIdx -ge 0 -and $actualIdx -lt $stringValue.Length) {
                        [void]$chars.Add($stringValue[$actualIdx])
                    }
                }

                if ($chars.Count -gt 0) {
                    $extracted = -join $chars
                    $start = $node.Extent.StartOffset
                    $length = $node.Extent.EndOffset - $start
                    $result = $result.Substring(0, $start) + "'$extracted'" + $result.Substring($start + $length)
                    $changed = $true
                }
            }
            catch {
                Write-Host "[DEBUG] StringIndexSlicing node error: $($_.Exception.Message)"
                continue
            }
        }
    }
    catch {
        Write-Host "[DEBUG] StringIndexSlicing fatal error: $($_.Exception.Message)"
    }

    return @{
        result = $result
        changed = $changed
    }
}

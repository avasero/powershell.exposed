# Safe AST Parsing Functions
# CRITICAL SECURITY: These functions ONLY parse code - they NEVER execute it
# Uses [System.Management.Automation.Language.Parser]::ParseInput() which is safe

function Get-SafeAst {
    <#
    .SYNOPSIS
        Safely parse PowerShell code into an AST without execution
    .DESCRIPTION
        Uses [System.Management.Automation.Language.Parser]::ParseInput()
        which parses code WITHOUT executing it. This is the core safety mechanism.
    .PARAMETER Code
        The PowerShell code to parse
    .OUTPUTS
        Hashtable with Ast, Tokens, and Errors
    #>
    param(
        [Parameter(Mandatory)]
        [string]$Code
    )

    $tokens = $null
    $errors = $null

    # SAFE: ParseInput only creates an AST representation, it does NOT execute code
    $ast = [System.Management.Automation.Language.Parser]::ParseInput(
        $Code,
        [ref]$tokens,
        [ref]$errors
    )

    return @{
        Ast = $ast
        Tokens = $tokens
        Errors = $errors
    }
}

function Get-AstAnalysis {
    <#
    .SYNOPSIS
        Extract detailed information from AST for analysis
    .DESCRIPTION
        Walks the AST tree and extracts relevant nodes for security analysis
        and deobfuscation purposes
    .PARAMETER Command
        The PowerShell command to analyze
    #>
    param(
        [Parameter(Mandatory)]
        [string]$Command
    )

    $parseResult = Get-SafeAst -Code $Command
    $ast = $parseResult.Ast

    # Initialize analysis structure
    $analysis = @{
        hasParseErrors = ($parseResult.Errors.Count -gt 0)
        parseErrors = @($parseResult.Errors | ForEach-Object { $_.Message })
        parseErrorCount = $parseResult.Errors.Count
        tokenCount = $parseResult.Tokens.Count

        # AST node collections
        stringExpressions = [System.Collections.ArrayList]::new()
        expandableStrings = [System.Collections.ArrayList]::new()
        commandInvocations = [System.Collections.ArrayList]::new()
        variableAssignments = [System.Collections.ArrayList]::new()
        formatOperators = [System.Collections.ArrayList]::new()
        stringConcatenation = [System.Collections.ArrayList]::new()
        invokeExpressions = [System.Collections.ArrayList]::new()
        typeExpressions = [System.Collections.ArrayList]::new()
        memberInvocations = [System.Collections.ArrayList]::new()
        arrayExpressions = [System.Collections.ArrayList]::new()
        scriptBlocks = [System.Collections.ArrayList]::new()
    }

    # Walk the AST to find relevant nodes
    $ast.FindAll({ $true }, $true) | ForEach-Object {
        $node = $_
        $nodeType = $node.GetType().Name

        switch ($nodeType) {
            'StringConstantExpressionAst' {
                [void]$analysis.stringExpressions.Add(@{
                    value = $node.Value
                    stringType = $node.StringConstantType.ToString()
                    extent = $node.Extent.Text
                    startOffset = $node.Extent.StartOffset
                    endOffset = $node.Extent.EndOffset
                })
            }

            'ExpandableStringExpressionAst' {
                [void]$analysis.expandableStrings.Add(@{
                    value = $node.Value
                    extent = $node.Extent.Text
                    startOffset = $node.Extent.StartOffset
                    endOffset = $node.Extent.EndOffset
                    nestedExpressions = @($node.NestedExpressions | ForEach-Object { $_.Extent.Text })
                })
            }

            'BinaryExpressionAst' {
                $op = $node.Operator.ToString()

                if ($op -eq 'Format') {
                    [void]$analysis.formatOperators.Add(@{
                        operator = 'Format'
                        left = $node.Left.Extent.Text
                        right = $node.Right.Extent.Text
                        extent = $node.Extent.Text
                        startOffset = $node.Extent.StartOffset
                        endOffset = $node.Extent.EndOffset
                    })
                }
                elseif ($op -eq 'Plus') {
                    # Check if it's string concatenation
                    $leftType = $node.Left.GetType().Name
                    $rightType = $node.Right.GetType().Name

                    if ($leftType -match 'String' -or $rightType -match 'String') {
                        [void]$analysis.stringConcatenation.Add(@{
                            operator = 'Plus'
                            left = $node.Left.Extent.Text
                            leftType = $leftType
                            right = $node.Right.Extent.Text
                            rightType = $rightType
                            extent = $node.Extent.Text
                            startOffset = $node.Extent.StartOffset
                            endOffset = $node.Extent.EndOffset
                        })
                    }
                }
                elseif ($op -eq 'Join') {
                    [void]$analysis.stringConcatenation.Add(@{
                        operator = 'Join'
                        left = $node.Left.Extent.Text
                        right = $node.Right.Extent.Text
                        extent = $node.Extent.Text
                        startOffset = $node.Extent.StartOffset
                        endOffset = $node.Extent.EndOffset
                    })
                }
            }

            'CommandAst' {
                $cmdName = $node.GetCommandName()
                $cmdInfo = @{
                    name = $cmdName
                    extent = $node.Extent.Text
                    arguments = @($node.CommandElements | Select-Object -Skip 1 | ForEach-Object { $_.Extent.Text })
                    startOffset = $node.Extent.StartOffset
                    endOffset = $node.Extent.EndOffset
                }

                [void]$analysis.commandInvocations.Add($cmdInfo)

                # Check for Invoke-Expression variants
                if ($cmdName -match '^(iex|invoke-expression)$') {
                    [void]$analysis.invokeExpressions.Add(@{
                        type = 'command'
                        name = $cmdName
                        extent = $node.Extent.Text
                        arguments = $cmdInfo.arguments
                    })
                }
            }

            'AssignmentStatementAst' {
                [void]$analysis.variableAssignments.Add(@{
                    variable = $node.Left.Extent.Text
                    operator = $node.Operator.ToString()
                    value = $node.Right.Extent.Text
                    valueType = $node.Right.GetType().Name
                    extent = $node.Extent.Text
                    startOffset = $node.Extent.StartOffset
                    endOffset = $node.Extent.EndOffset
                })
            }

            'InvokeMemberExpressionAst' {
                [void]$analysis.memberInvocations.Add(@{
                    expression = $node.Expression.Extent.Text
                    member = $node.Member.Extent.Text
                    arguments = @($node.Arguments | ForEach-Object { $_.Extent.Text })
                    extent = $node.Extent.Text
                    startOffset = $node.Extent.StartOffset
                    endOffset = $node.Extent.EndOffset
                    isStatic = $node.Static
                })
            }

            'TypeExpressionAst' {
                [void]$analysis.typeExpressions.Add(@{
                    typeName = $node.TypeName.FullName
                    extent = $node.Extent.Text
                    startOffset = $node.Extent.StartOffset
                    endOffset = $node.Extent.EndOffset
                })
            }

            'ArrayLiteralAst' {
                [void]$analysis.arrayExpressions.Add(@{
                    elements = @($node.Elements | ForEach-Object { $_.Extent.Text })
                    elementCount = $node.Elements.Count
                    extent = $node.Extent.Text
                    startOffset = $node.Extent.StartOffset
                    endOffset = $node.Extent.EndOffset
                })
            }

            'ScriptBlockExpressionAst' {
                [void]$analysis.scriptBlocks.Add(@{
                    extent = $node.Extent.Text
                    startOffset = $node.Extent.StartOffset
                    endOffset = $node.Extent.EndOffset
                })
            }
        }
    }

    # Calculate summary statistics
    $analysis.summary = @{
        totalNodes = ($ast.FindAll({ $true }, $true) | Measure-Object).Count
        hasFormatOperators = $analysis.formatOperators.Count -gt 0
        hasConcatenation = $analysis.stringConcatenation.Count -gt 0
        hasInvokeExpression = $analysis.invokeExpressions.Count -gt 0
        hasVariableAssignments = $analysis.variableAssignments.Count -gt 0
        obfuscationIndicators = @()
    }

    # Detect obfuscation indicators
    if ($analysis.formatOperators.Count -gt 0) {
        $analysis.summary.obfuscationIndicators += 'format_string'
    }
    if ($analysis.stringConcatenation.Count -gt 2) {
        $analysis.summary.obfuscationIndicators += 'heavy_concatenation'
    }
    if ($Command -match '`[a-zA-Z]') {
        $analysis.summary.obfuscationIndicators += 'backtick_obfuscation'
    }
    if ($Command -match '\[char\]\s*\d+' -or $Command -match '\[char\]\s*\(') {
        $analysis.summary.obfuscationIndicators += 'character_codes'
    }
    if ($analysis.invokeExpressions.Count -gt 0) {
        $analysis.summary.obfuscationIndicators += 'invoke_expression'
    }

    return $analysis
}

function Test-AstSafety {
    <#
    .SYNOPSIS
        Verify that a command can be safely parsed
    .DESCRIPTION
        Performs basic safety checks before attempting deobfuscation
    #>
    param(
        [Parameter(Mandatory)]
        [string]$Command
    )

    $result = @{
        isSafe = $true
        warnings = @()
    }

    # Check for extremely long commands (potential DoS)
    if ($Command.Length -gt 100000) {
        $result.warnings += 'Command is very long, may cause performance issues'
    }

    # Check for deeply nested structures
    $nestingDepth = ([regex]::Matches($Command, '\(')).Count
    if ($nestingDepth -gt 100) {
        $result.warnings += 'High nesting depth detected'
    }

    # Try parsing to check for validity
    $parseResult = Get-SafeAst -Code $Command
    if ($parseResult.Errors.Count -gt 0) {
        $result.warnings += "Parse errors: $($parseResult.Errors.Count)"
    }

    return $result
}

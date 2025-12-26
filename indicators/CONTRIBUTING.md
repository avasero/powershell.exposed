# Contributing Indicators

This document explains how to create and submit indicator files for the PowerShell detection database.

## Quick Start

1. Create a new `.yaml` file in the `indicators/` directory
2. Follow the format below
3. Push to `main` branch
4. The pipeline will validate and add to the database

## Indicator Format

```yaml
# Required fields
name: Your Indicator Name
description: What this indicator detects
regex: pattern-to-match
basescore: 5.0
tactic: Execution
technique: T1059.001
reference:
  - https://example.com/documentation

# Optional fields
max_match: 1
```

## Field Reference

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | ✅ | string | Short, descriptive name |
| `description` | ✅ | string | What this indicator detects |
| `regex` | ✅ | string/array | Regex pattern(s) to match |
| `basescore` | ✅ | number | Severity score (0.0 - 10.0) |
| `tactic` | ✅ | string/array | MITRE ATT&CK tactic(s) |
| `technique` | ✅ | string/array | MITRE ATT&CK technique(s) |
| `reference` | ✅ | string/array | Reference URL(s) |
| `max_match` | ❌ | integer | Max matches to report (default: 1) |

## Basescore Guidelines

| Score | Severity | Examples |
|-------|----------|----------|
| 0.0 - 2.9 | Low | Informational, common operations |
| 3.0 - 4.9 | Low-Medium | Slightly suspicious activity |
| 5.0 - 6.9 | Medium | Suspicious activity worth investigating |
| 7.0 - 8.9 | High | Likely malicious activity |
| 9.0 - 10.0 | Critical | Almost certainly malicious |

## Examples

### Single Regex Pattern
```yaml
name: Invoke-Expression Usage
description: Detects use of Invoke-Expression cmdlet
regex: invoke-expression
basescore: 6.0
tactic: Execution
technique: T1059.001
reference: https://attack.mitre.org/techniques/T1059/001/
```

### Multiple Patterns
```yaml
name: AD Enumeration Cmdlets
description: Detects AD reconnaissance commands
regex:
  - get-aduser
  - get-adgroup
  - get-adcomputer
basescore: 4.8
tactic: Discovery
technique:
  - T1069.002
  - T1087
reference:
  - https://attack.mitre.org/techniques/T1069/002/
  - https://attack.mitre.org/techniques/T1087/
```

## Validation Pipeline

When you push to `main`, the pipeline runs these checks:

1. **YAML Syntax** - File must be valid YAML
2. **Required Fields** - All required fields must be present
3. **Data Types** - Fields must have correct types
4. **Regex Patterns** - Patterns must compile
5. **Business Rules** - General sanity checks

If any step fails, the pipeline stops and shows exactly what's wrong.

## Common Errors

### ❌ "Missing required field: 'reference'"
**Fix**: Add a reference URL to your indicator

### ❌ "Invalid regex pattern"
**Fix**: Check your regex syntax. Test at [regex101.com](https://regex101.com)

### ❌ "'basescore' must be between 0.0 and 10.0"
**Fix**: Use a score within the valid range

### ❌ "Pattern appears to be a URL"
**Fix**: Move URLs to `reference`, not `regex`

## Testing Locally

```bash
# Install Deno
# Then run:
deno run --allow-read scripts/validate-indicators.ts indicators/your_indicator.yaml
```

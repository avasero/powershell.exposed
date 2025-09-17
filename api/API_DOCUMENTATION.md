# PowerShell.exposed API Documentation

## 🔑 Authentication

The API supports two authentication methods:

**Note**: API Keys are stored in the `profiles` table alongside user profile information.

### 1. JWT Token (Web Application)
Used by the web frontend for authenticated users.
```http
Authorization: Bearer <jwt_token>
```

### 2. API Key (External Tools)
Personal API keys for users to access the API from external tools like Postman.
```http
Authorization: Bearer pse_<your_api_key>
```

## 📋 Endpoints

### Authentication Management

#### Get User API Key
```http
GET /user/api-key
Authorization: Bearer <jwt_token>  # JWT only, not API key
```

**Response:**
```json
{
  "success": true,
  "api_key": {
    "id": "uuid",
    "api_key": "pse_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "name": "Default API Key",
    "created_at": "2025-01-17T10:30:00Z",
    "last_used_at": "2025-01-17T12:15:00Z",
    "usage_count": 42,
    "is_active": true
  }
}
```

#### Create API Key
```http
POST /user/api-key
Authorization: Bearer <jwt_token>  # JWT only
```

#### Regenerate API Key
```http
PUT /user/api-key
Authorization: Bearer <jwt_token>  # JWT only
```

#### Revoke API Key
```http
DELETE /user/api-key
Authorization: Bearer <jwt_token>  # JWT only
```

### Command Analysis

#### Analyze PowerShell Command
```http
POST /analyze-pcre2
Authorization: Bearer <api_key_or_jwt>  # Both supported
Content-Type: application/json

{
  "command": "Get-Process | Where-Object {$_.Name -eq 'explorer'}",
  "ip_address": "192.168.1.100",
  "search_type": "API"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "command": "Get-Process | Where-Object {$_.Name -eq 'explorer'}",
    "is_malicious": false,
    "risk_score": 1.2,
    "severity": "very_low",
    "signatures_detected": [],
    "tactics": [],
    "techniques": [],
    "total_signatures_checked": 25,
    "detected_count": 0
  },
  "analysis_id": "abc12345",
  "session_id": "session_uuid"
}
```

### User Data

#### Get User Command Evaluations
```http
GET /user/command-evaluations
Authorization: Bearer <api_key_or_jwt>  # Both supported
```

**Response:**
```json
{
  "success": true,
  "user_id": "user_uuid",
  "auth_type": "api_key",
  "total_analyses": 15,
  "analyses": [
    {
      "id": 123,
      "uuid": "analysis_uuid",
      "short_id": "abc12345",
      "command": "Get-Process",
      "risk_score": 1.0,
      "severity": "very_low",
      "is_malicious": false,
      "signatures_detected": [],
      "tactics": [],
      "techniques": [],
      "created_at": "2025-01-17T10:30:00Z",
      "search_type": "API",
      "ip_country": "Brazil",
      "ip_city": "São Paulo"
    }
  ]
}
```

## 🚀 Getting Started

### 1. Get Your API Key

1. Log in to PowerShell.exposed web interface
2. Go to `/api-keys` page
3. Click "Create API Key"
4. Copy your API key (starts with `pse_`)

### 2. Test with Postman

#### Setup:
- Method: `POST`
- URL: `https://your-api-domain.com/analyze-pcre2`
- Authorization: `Bearer Token`
- Token: `pse_your_api_key_here`

#### Body (JSON):
```json
{
  "command": "Get-Process",
  "search_type": "API"
}
```

### 3. Test with cURL

```bash
curl -X POST "https://your-api-domain.com/analyze-pcre2" \
  -H "Authorization: Bearer pse_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "command": "Get-Process",
    "search_type": "API"
  }'
```

### 4. Get Your Analysis History

```bash
curl -X GET "https://your-api-domain.com/user/command-evaluations" \
  -H "Authorization: Bearer pse_your_api_key_here"
```

## 🔒 Security

- **API Keys are personal**: Each user has one active API key
- **Revocation**: API keys can be revoked immediately
- **Usage tracking**: All API key usage is logged
- **Rate limiting**: Same limits apply as web interface
- **Secure format**: API keys use cryptographically secure random generation

## 📊 Rate Limits

- **Anonymous users**: 5 requests per 60 seconds
- **Authenticated users** (JWT/API Key): 5 requests per 60 seconds (can bypass with captcha)
- **Global limit**: 1000 requests per minute across all users

## ❌ Error Responses

### Authentication Errors
```json
{
  "detail": "Authentication required. Use Bearer token (JWT) or API Key (pse_...)"
}
```

### Invalid API Key
```json
{
  "detail": "Invalid or expired API Key"
}
```

### Rate Limiting
```json
{
  "error": "Rate limit exceeded",
  "rate_limit_info": {
    "current_count": 6,
    "limit": 5,
    "window_seconds": 60,
    "seconds_until_reset": 45
  },
  "requires_captcha": true
}
```

## 🆘 Support

For API support:
1. Check your API key is active in the web interface
2. Verify the correct endpoint URLs
3. Ensure proper Authorization header format
4. Check rate limits and usage statistics

## 📝 Changelog

- **v1.0.0**: Initial API Key implementation
  - Personal API keys for authenticated users
  - Command analysis via API key
  - User analysis history endpoint
  - Full Postman/cURL support

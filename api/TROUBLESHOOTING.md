# API Server Troubleshooting Guide

## Quick Fix for the Current Error

The error you're seeing is related to the authentication middleware. Here's how to fix it:

### 1. Install Missing Dependencies

```bash
cd api
pip install -r requirements.txt
```

Make sure you have all dependencies, especially:
- `httpx==0.25.0`
- `python-jose[cryptography]==3.3.0`

### 2. Create Environment File

Create a `.env.local` file in the `api/` directory:

```bash
# Minimal configuration for testing
SUPABASE_URL=https://placeholder.supabase.co
SUPABASE_SERVICE_ROLE_KEY=placeholder-key
SUPABASE_JWT_SECRET=placeholder-secret-at-least-32-characters-long
SUPABASE_ANON_KEY=placeholder-anon-key
```

### 3. Test the Server

```bash
# Start the server
python main.py

# In another terminal, test it
python test_server.py
```

## Common Issues

### 1. Middleware Error (Current Issue)
**Error**: `TypeError: AuthMiddleware.__call__() takes 3 positional arguments but 4 were given`

**Solution**: Fixed by changing from class-based to function-based middleware.

### 2. Missing Dependencies
**Error**: `ModuleNotFoundError: No module named 'httpx'`

**Solution**: 
```bash
pip install httpx==0.25.0
```

### 3. JWT Configuration Issues
**Error**: `JWT secret not configured`

**Solution**: This is expected if you haven't set up Supabase yet. The server will work for anonymous users.

### 4. CORS Issues
**Error**: `CORS policy` errors in browser

**Solution**: Make sure your frontend URL is in `ALLOWED_ORIGINS` in `config/settings.py`.

## Testing Anonymous Users

To test anonymous user functionality:

```bash
curl -X POST http://localhost:8000/analyze-pcre2 \
  -H "Content-Type: application/json" \
  -d '{"command": "Get-Process", "ip_address": "127.0.0.1"}'
```

Expected response: Analysis results or rate limiting message.

## Testing Authenticated Users

1. Set up proper Supabase credentials in `.env.local`
2. Get a JWT token from your frontend
3. Test with:

```bash
curl -X GET http://localhost:8000/user/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Server Status Check

The server should log:
- ✅ `INFO: Uvicorn running on http://0.0.0.0:8000`
- ✅ No middleware errors
- ✅ Responses to health check: `GET http://localhost:8000/health`

## Still Having Issues?

1. Check the server logs for specific error messages
2. Verify all dependencies are installed
3. Make sure port 8000 is not in use by another process
4. Try running with debug logging:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --log-level debug
```

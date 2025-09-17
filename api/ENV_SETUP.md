# Environment Variables Setup for Authentication

To enable authentication in your API, you need to set up the following environment variables:

## Required Environment Variables

Add these to your `.env.local` file in the `api/` directory:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## How to Get These Values

1. Go to your Supabase project dashboard: https://app.supabase.com/project/your-project/settings/api

2. **SUPABASE_URL**: Copy from "Project URL"

3. **SUPABASE_SERVICE_ROLE_KEY**: Copy from "service_role" key in "Project API keys"

4. **SUPABASE_ANON_KEY**: Copy from "anon public" key in "Project API keys"

5. **SUPABASE_JWT_SECRET**: 
   - Go to Settings > API
   - Scroll down to "JWT Settings"
   - Copy the "JWT Secret"

## Example .env.local file

```bash
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Security Notes

- **Never commit these values to version control**
- The JWT secret should be at least 32 characters long
- Keep the service role key secure - it has full database access
- The anon key is safe to use in frontend applications

## Testing Authentication

After setting up the environment variables:

1. Restart your FastAPI server
2. Test the protected endpoints:
   - `GET /user/profile` (requires authentication)
   - `GET /user/statistics` (requires authentication)
3. Test optional authentication endpoints:
   - `POST /analyze-pcre2` (works with or without authentication)
   - `GET /user-analyses` (works with or without authentication)

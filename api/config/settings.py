"""
Configurações e constantes da aplicação
"""
import os
from dotenv import load_dotenv


load_dotenv('.env.local', override=True)


RATE_LIMIT_REQUESTS = 5   
RATE_LIMIT_WINDOW = 60    


GLOBAL_RATE_LIMIT_REQUESTS = 1000  
GLOBAL_RATE_LIMIT_WINDOW = 60    

CACHE_DURATION = 10 * 60 * 1000  


ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://powershell-exposed.vercel.app",
    "https://powershell.exposed",
    "https://api.powershell.exposed",
    "https://www.powershell.exposed",
    "https://www.ps.exposed",
    "https://ps.exposed"
]

# ✅ Regex pattern for Vercel preview deployments (any subdomain)
ALLOWED_ORIGIN_REGEX = r"https://.*\.powershell\.exposed"


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")


API_TITLE = "PowerShell.exposed API"
API_DESCRIPTION = "API para análise de comandos PowerShell"
API_VERSION = "1.0.0"


IPAPI_TIMEOUT = 10
IPAPI_BASE_URL = "https://ipapi.co"



"""
Configurações e constantes da aplicação
"""
import os
from dotenv import load_dotenv


load_dotenv()  # Load .env file
load_dotenv('.env.local', override=True)  # Override with .env.local if it exists


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
    "https://ps.exposed",
    "https://71273716925639avasero.powershell.exposed",
    "https://api-test-81273633351825.powershell.exposed"
]


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")


API_TITLE = "powerShell.exposed API"
API_DESCRIPTION = "API para análise de comandos powerShell"
API_VERSION = "1.0.0"


IPAPI_TIMEOUT = 10
IPAPI_BASE_URL = "https://ipapi.co"


# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_MAX_TOKENS = int(os.getenv("OPENAI_MAX_TOKENS", "200"))
OPENAI_TIMEOUT = int(os.getenv("OPENAI_TIMEOUT", "10"))


# AST Deobfuscation Service Configuration
# The AST service runs in a separate Docker container using PowerShell 7
# It performs safe AST-based deobfuscation without executing user code
AST_SERVICE_URL = os.getenv("AST_SERVICE_URL", "http://localhost:8081")
AST_SERVICE_TIMEOUT = int(os.getenv("AST_SERVICE_TIMEOUT", "35"))
AST_SERVICE_ENABLED = os.getenv("AST_SERVICE_ENABLED", "false").lower() == "true"
AST_API_KEY = os.getenv("AST_API_KEY", "")

# Stripe Configuration — DISABLED for production shipping
# STRIPE_SECRET_KEY_SANDBOX = os.getenv("STRIPE_SECRET_KEY_SANDBOX", "")

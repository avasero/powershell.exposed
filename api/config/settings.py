"""
Configurações e constantes da aplicação
"""
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv('.env.local', override=True)

# Rate limiting e captcha
RATE_LIMIT_REQUESTS = 5   # Máximo de requisições por janela de tempo (SEM captcha)
RATE_LIMIT_WINDOW = 60    # Janela de tempo em segundos
CAPTCHA_REQUIRED_AFTER = 6  # Captcha necessário a partir da 6ª requisição (permite mais com captcha)

# Global rate limiting
GLOBAL_RATE_LIMIT_REQUESTS = 1000  # Máximo de requisições globais por minuto (DEBUG - mudar para 1000)
GLOBAL_RATE_LIMIT_WINDOW = 60    # Janela de tempo em segundos (1 minuto)

# Cache de assinaturas
CACHE_DURATION = 10 * 60 * 1000  # 10 minutos em milissegundos

# CORS origins permitidos
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://powershell-exposed.vercel.app",
    "https://powershell-exposed-git-main-gabriels-projects.vercel.app"
]

# Configurações do Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

# Configurações da API
API_TITLE = "PowerShell.exposed API"
API_DESCRIPTION = "API para análise de comandos PowerShell"
API_VERSION = "1.0.0"

# Configurações de geolocalização
IPAPI_TIMEOUT = 10
IPAPI_BASE_URL = "https://ipapi.co"

# Configurações de captcha
CAPTCHA_EXPIRY_TIME = 300  # 5 minutos em segundos

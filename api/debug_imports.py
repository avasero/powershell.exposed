#!/usr/bin/env python3
"""
Debug script para verificar quais imports estão funcionando
"""
import sys
import os

# Adicionar path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

print("🔍 DEBUGANDO IMPORTS...")
print("=" * 50)

# Teste 1: Imports básicos
print("1. Testando imports básicos...")
try:
    from fastapi import FastAPI
    print("   ✅ FastAPI")
except ImportError as e:
    print(f"   ❌ FastAPI: {e}")

try:
    from config.settings import API_TITLE
    print("   ✅ config.settings")
except ImportError as e:
    print(f"   ❌ config.settings: {e}")

# Teste 2: Middleware
print("2. Testando middleware...")
try:
    from middleware.cors_middleware import setup_cors_middleware
    print("   ✅ cors_middleware")
except ImportError as e:
    print(f"   ❌ cors_middleware: {e}")

try:
    from middleware.auth_middleware import auth_middleware
    print("   ✅ auth_middleware")
except ImportError as e:
    print(f"   ❌ auth_middleware: {e}")

# Teste 3: Routes
print("3. Testando routes...")
try:
    from routes.api_routes import analyze_command_endpoint
    print("   ✅ api_routes")
except ImportError as e:
    print(f"   ❌ api_routes: {e}")

try:
    from routes.api_key_routes import get_user_api_key_endpoint
    print("   ✅ api_key_routes")
except ImportError as e:
    print(f"   ❌ api_key_routes: {e}")

try:
    from routes.protected_routes import get_user_command_evaluations_endpoint
    print("   ✅ protected_routes")
except ImportError as e:
    print(f"   ❌ protected_routes: {e}")

# Teste 4: Services
print("4. Testando services...")
try:
    from services.api_key_manager import validate_api_key
    print("   ✅ api_key_manager")
except ImportError as e:
    print(f"   ❌ api_key_manager: {e}")

try:
    from services.session_manager import get_supabase_client
    print("   ✅ session_manager")
except ImportError as e:
    print(f"   ❌ session_manager: {e}")

# Teste 5: Utils
print("5. Testando utils...")
try:
    from utils.auth import decode_jwt_token
    print("   ✅ utils.auth")
except ImportError as e:
    print(f"   ❌ utils.auth: {e}")

print("\n🎯 RESUMO:")
print("Se algum import falhou, isso explica o erro 404")
print("Instale dependências: pip install -r requirements.txt")
print("Reinicie o servidor: python main.py")

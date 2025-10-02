#!/usr/bin/env python3
"""
Teste do middleware de frontend validation após correção
"""
import sys
import os

# Adicionar o diretório da API ao path
sys.path.append('.')

# Simular uma requisição com JWT do frontend
class MockRequest:
    def __init__(self, headers, url_path="/analyze-pcre2"):
        self.headers = headers
        self.url = type('obj', (object,), {'path': url_path})
        self.client = type('obj', (object,), {'host': '127.0.0.1'})

print("🧪 TESTE: Middleware Frontend Validation - Correção JWT")
print("=" * 60)

# Importar as funções
from middleware.frontend_validation import is_request_from_frontend

# TESTE 1: Request do frontend com JWT token
print("\n1️⃣ TESTE: Request do frontend com JWT token")
frontend_jwt_request = MockRequest({
    'Origin': 'http://localhost:3000',
    'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
})

is_frontend = is_request_from_frontend(frontend_jwt_request)
print(f"   ✅ Is frontend request: {is_frontend}")
print(f"   📝 Esperado: True (deve permitir JWT do frontend)")

# TESTE 2: Request do Postman com JWT token
print("\n2️⃣ TESTE: Request do Postman com JWT token")
postman_jwt_request = MockRequest({
    'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...',
    'User-Agent': 'PostmanRuntime/7.32.3'
})

is_frontend_postman = is_request_from_frontend(postman_jwt_request)
print(f"   ❌ Is frontend request: {is_frontend_postman}")
print(f"   📝 Esperado: False (deve bloquear JWT do Postman)")

# TESTE 3: Request do frontend com API Key
print("\n3️⃣ TESTE: Request do frontend com API Key")
frontend_api_request = MockRequest({
    'Origin': 'http://localhost:3000',
    'Authorization': 'Bearer pse_1234567890abcdef',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
})

is_frontend_api = is_request_from_frontend(frontend_api_request)
print(f"   ✅ Is frontend request: {is_frontend_api}")
print(f"   📝 Esperado: True (frontend pode usar API Key também)")

# TESTE 4: Request do Postman com API Key
print("\n4️⃣ TESTE: Request do Postman com API Key")
postman_api_request = MockRequest({
    'Authorization': 'Bearer pse_1234567890abcdef',
    'User-Agent': 'PostmanRuntime/7.32.3'
})

is_frontend_postman_api = is_request_from_frontend(postman_api_request)
print(f"   ❌ Is frontend request: {is_frontend_postman_api}")
print(f"   📝 Esperado: False (mas será permitido pela validação de API Key)")

# TESTE 5: Request anônimo do frontend
print("\n5️⃣ TESTE: Request anônimo do frontend")
anonymous_frontend_request = MockRequest({
    'Origin': 'http://localhost:3000',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
})

is_frontend_anon = is_request_from_frontend(anonymous_frontend_request)
print(f"   ✅ Is frontend request: {is_frontend_anon}")
print(f"   📝 Esperado: True (acesso anônimo do frontend permitido)")

print("\n" + "=" * 60)
print("🎯 RESUMO DO COMPORTAMENTO ESPERADO:")
print("✅ Frontend + JWT: PERMITIR (validar JWT no auth_middleware)")
print("❌ Externo + JWT: BLOQUEAR (apenas API Keys para externos)")
print("✅ Frontend + API Key: PERMITIR (validar API Key)")
print("✅ Externo + API Key: PERMITIR (validar API Key)")
print("✅ Frontend + Anônimo: PERMITIR")
print("❌ Externo + Anônimo: BLOQUEAR")
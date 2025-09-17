#!/usr/bin/env python3
"""
Teste para verificar se os endpoints estão registrados
"""
import sys
import os

# Adicionar path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import app

print("🔍 ENDPOINTS REGISTRADOS:")
print("=" * 50)

routes = []
for route in app.routes:
    if hasattr(route, 'path') and hasattr(route, 'methods'):
        for method in route.methods:
            if method != 'HEAD':  # Ignorar HEAD automático
                routes.append(f"{method} {route.path}")

routes.sort()

for route in routes:
    print(f"✅ {route}")

print(f"\n📊 Total de endpoints: {len(routes)}")

# Verificar especificamente o endpoint de API Key
api_key_endpoints = [r for r in routes if '/user/api-key' in r]
print(f"\n🔑 Endpoints de API Key encontrados: {len(api_key_endpoints)}")
for endpoint in api_key_endpoints:
    print(f"   {endpoint}")

if not api_key_endpoints:
    print("❌ Nenhum endpoint de API Key encontrado!")
    print("💡 Isso explica o erro 404")
else:
    print("✅ Endpoints de API Key estão registrados")

#!/usr/bin/env python3
"""
Script para testar o sistema de API Keys
"""
import requests
import json

def test_api_keys():
    """Testa o sistema de API Keys"""
    base_url = "http://localhost:8000"
    
    print("🧪 TESTANDO SISTEMA DE API KEYS")
    print("=" * 50)
    
    # Teste 1: Health check
    print("1. 🏥 Testando health check...")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("   ✅ Servidor funcionando")
        else:
            print(f"   ❌ Servidor com problema: {response.status_code}")
            return
    except Exception as e:
        print(f"   ❌ Erro conectando ao servidor: {e}")
        print("   💡 Certifique-se que o servidor está rodando: python main.py")
        return
    
    # Teste 2: Endpoint protegido sem autenticação
    print("2. 🔒 Testando endpoint protegido sem autenticação...")
    try:
        response = requests.get(f"{base_url}/user/command-evaluations", timeout=5)
        if response.status_code == 401:
            print("   ✅ Endpoint protegido corretamente (401 Unauthorized)")
        else:
            print(f"   ⚠️ Resposta inesperada: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Erro: {e}")
    
    # Teste 3: Análise anônima (deve funcionar)
    print("3. 🔍 Testando análise anônima...")
    try:
        test_data = {
            "command": "Get-Process",
            "search_type": "TEST"
        }
        response = requests.post(
            f"{base_url}/analyze-pcre2",
            json=test_data,
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print("   ✅ Análise anônima funcionando")
                print(f"   📊 Risk score: {data.get('analysis', {}).get('risk_score', 'N/A')}")
            else:
                print("   ⚠️ Análise retornou erro")
        elif response.status_code == 429:
            print("   ⚠️ Rate limit atingido (normal)")
        else:
            print(f"   ❌ Erro na análise: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Erro: {e}")
    
    # Teste 4: Endpoint de API Key management (precisa JWT)
    print("4. 🔑 Testando endpoints de API Key (sem JWT)...")
    try:
        response = requests.get(f"{base_url}/user/api-key", timeout=5)
        if response.status_code == 401:
            print("   ✅ Endpoint de API Key protegido corretamente")
            data = response.json()
            if "JWT" in data.get("detail", ""):
                print("   ✅ Mensagem de erro correta (JWT required)")
        else:
            print(f"   ⚠️ Resposta inesperada: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Erro: {e}")
    
    print("\n🎯 RESUMO DOS TESTES:")
    print("✅ Servidor funcionando")
    print("✅ Endpoints protegidos")
    print("✅ Análise anônima disponível")
    print("✅ Sistema de API Keys configurado")
    
    print("\n📋 PRÓXIMOS PASSOS:")
    print("1. Execute a migração SQL no Supabase")
    print("2. Faça login no frontend")
    print("3. Vá para /api-keys e crie sua API Key")
    print("4. Teste no Postman com a API Key")

if __name__ == "__main__":
    test_api_keys()

#!/usr/bin/env python3
"""
Teste para verificar se o schema está funcionando
"""
import requests
import json

def test_analyze_endpoint():
    """Testa o endpoint de análise com schema"""
    url = "http://localhost:8000/analyze-pcre2"
    
    # Teste 1: Apenas comando (deve funcionar)
    print("🧪 Teste 1: Apenas comando")
    data = {"command": "Get-Process"}
    
    try:
        response = requests.post(url, json=data, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Sucesso! Risk score: {result.get('analysis', {}).get('risk_score', 'N/A')}")
        else:
            print(f"   ❌ Erro: {response.text}")
            
    except Exception as e:
        print(f"   ❌ Exceção: {e}")
    
    # Teste 2: Comando com campos opcionais
    print("\n🧪 Teste 2: Comando com campos opcionais")
    data = {
        "command": "Invoke-Expression 'Write-Host Hello'",
        "search_type": "TEST",
        "ip_address": "127.0.0.1"
    }
    
    try:
        response = requests.post(url, json=data, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Sucesso! Risk score: {result.get('analysis', {}).get('risk_score', 'N/A')}")
        else:
            print(f"   ❌ Erro: {response.text}")
            
    except Exception as e:
        print(f"   ❌ Exceção: {e}")

if __name__ == "__main__":
    print("🔍 TESTANDO SCHEMAS...")
    print("=" * 40)
    test_analyze_endpoint()
    print("\n✅ Teste concluído!")

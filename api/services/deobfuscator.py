import re

def normalize_quotes(s: str) -> str:
    s = s.replace('“', '"').replace('”', '"').replace('‘', "'").replace('’', "'")
    s = s.replace('`', "'")
    s = re.sub(r'[\u200b-\u200f\uFEFF]', '', s)
    return s

format_pattern = re.compile(
    r'\(\s*("(?:(?:\\")|[^"])*"|\'(?:(?:\\\')|[^\'])*\')\s*-f\s*([^\)]+)\)',
    flags=re.IGNORECASE
)

def parse_args(args_text: str):
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
    s_new = re.sub(r'\)\s*\(', '', s_new)
    s_new = re.sub(r'&\s*', '', s_new)
    s_new = re.sub(r'\.\s*(Invoke|Start|Execute)\s*\(\s*([^\)]+)\s*\)', r'\2', s_new, flags=re.IGNORECASE)
    s_new = re.sub(r'\s{2,}', ' ', s_new)
    return s_new
##test
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

obf = r"""(("{5}{25}{8}{7}{0}{14}{3}{21}{2}{22}{15}{16}{31}{28}{11}{26}{17}{23}{27}{29}{10}{1}{6}{24}{30}{18}{13}{19}{12}{9}{20}{4}"-f "B","U","4","B","%7D","ht","R_d","//ow.ly/HT","p:","T","0","_","N","M","%7","E","f","1T","u","e","5","k","R","h","0","t","w","_","l","Y","C","U"))"""

print(deobfuscate(obf))

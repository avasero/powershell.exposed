import regex
import re

test_string = "a"

# Regex 1: Unicode ranges
regex1 = r"[\u1F300-\u1FAFF\u2700-\u27BF]"
print(f"Regex 1: {repr(regex1)}")
try:
    pattern1 = regex.compile(regex1)
    match1 = pattern1.search(test_string)
    print(f"  Test '{test_string}': {'MATCH: ' + repr(match1.group(0)) if match1 else 'NO MATCH'}")
except Exception as e:
    print(f"  Error: {e}")

print()

# Regex 2: Unicode properties
regex2 = r"[\p{Emoji}\p{inDingbats}]"
print(f"Regex 2: {repr(regex2)}")
try:
    pattern2 = regex.compile(regex2)
    match2 = pattern2.search(test_string)
    print(f"  Test '{test_string}': {'MATCH: ' + repr(match2.group(0)) if match2 else 'NO MATCH'}")
except Exception as e:
    print(f"  Error: {e}")

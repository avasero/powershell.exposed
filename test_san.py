import regex
import os


INDICATOR_FILE_PATH = "indicators/ps_indicator_plain_encoded_command.yaml"


def load_indicators(filepath):
    indicator_regex = None
    san_regex = None
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            if line.startswith('regex:'):
                indicator_regex = line[6:].strip()
            elif line.startswith('san_regex:'):
                san_regex = line[10:].strip()

    return indicator_regex, san_regex


                
            

plain_encoded_command_regex, san_regex = load_indicators(INDICATOR_FILE_PATH)

base64_payload = "ZQBjAGgAbwAgACIASABlAGwAbABvACIA"

cmd_clean = f"powershell -enc {base64_payload}"

command_obf = f"powershell -e`n`c`o`d`e`d {base64_payload}"



def test_clean_matches():
    match = regex.search(plain_encoded_command_regex, cmd_clean, regex.IGNORECASE)
    if match:
        print(f"[passed] Clean command matched: {match.group(0)}")
        return True
    else:
        print("[failed] Clean command did not match")
        return False

def test_obfuscated_without_sanitization():
    match = regex.search(plain_encoded_command_regex, command_obf, regex.IGNORECASE)
    if match is None:
        print("[passed] Obfuscated command did not match without sanitization")
        return True
    else:
        print(f"[failed] Obfuscated command matched without sanitization: {match.group(0)}")
        return False

def test_obfuscated_with_sanitization():
    sanitized_command = regex.sub(san_regex, "", command_obf, flags=regex.IGNORECASE)
    print("Original obfuscated command:", command_obf)
    print("Sanitized command:", sanitized_command)
    match = regex.search(plain_encoded_command_regex, sanitized_command, regex.IGNORECASE)
    if match:
        print(f"[passed] Obfuscated command matched after sanitization: {match.group(0)}")
        return True
    else:
        print("[failed] Obfuscated command did not match after sanitization")
        return False
    
def run_tests():
    print("testing san_regex")
    tests = [
        test_clean_matches,
        test_obfuscated_without_sanitization,
        test_obfuscated_with_sanitization
    ]

    passed_tests = 0
    failed_tests = 0

    for name, test in enumerate(tests, start=1):
        print(f"\nRunning test {name}: {test.__name__}")
        if test():
            passed_tests += 1
        else:
            failed_tests += 1


if __name__ == "__main__":
    run_tests()
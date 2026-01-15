import regex
import yaml

# Load the actual YAML file to see what Python gets
with open(r"c:\Users\solte\powershell.exposed\indicators\ps_indicator_sketchy.yaml", "r") as f:
    data = yaml.safe_load(f)

regex_from_yaml = data['regex']
print(f"Regex from YAML file:")
print(f"  repr: {repr(regex_from_yaml)}")
print(f"  raw:  {regex_from_yaml}")
print()

# Extract just the character class to see what's in it
char_class_match = regex.search(r"\[([^\]]+)\]", regex_from_yaml)
if char_class_match:
    char_class = char_class_match.group(1)
    print(f"First character class contents: {repr(char_class)}")
    print(f"Characters: {list(char_class)}")
print()

test_cases = [
    r"a\tmp.php",      # single backslash before tmp
    r"a\\tmp.php",     # double backslash (raw string)
    "a\\tmp.php",      # single backslash (escaped)
    r"a/tmp.php",
    r"a:tmp.php",
]

print("Testing with regex from YAML:")
for tc in test_cases:
    print(f"  Input: {repr(tc)}")
    match = regex.search(regex_from_yaml, tc, regex.IGNORECASE)
    print(f"    -> {'MATCH: ' + repr(match.group(0)) if match else 'NO MATCH'}")

#!/usr/bin/env python3
"""
Script to test regex validation exactly like the GitHub Actions pipeline does.
Mimics Step 5: Regex Patterns from validate-indicators-pr.yml
"""

import re
import sys


def validate_regex_like_pipeline(pattern: str) -> bool:
    """
    Validates a regex pattern exactly like the pipeline does.
    
    The pipeline uses Python's re.compile() to validate patterns.
    """
    print("=" * 50)
    print("STEP 5: REGEX PATTERNS (Pipeline Simulation)")
    print("=" * 50)
    print(f"\nRegex pattern: {pattern!r}")
    print(f"Pattern length: {len(pattern)} characters")
    print()
    
    try:
        compiled = re.compile(pattern)
        print("✅ Regex valid")
        print(f"   Compiled pattern: {compiled.pattern!r}")
        print(f"   Groups: {compiled.groups}")
        return True
    except re.error as e:
        print(f"❌ Invalid regex: {e}")
        print(f"   Error position: {e.pos if hasattr(e, 'pos') else 'N/A'}")
        return False


def extract_regex_from_file(filepath: str) -> str | None:
    """
    Extract regex pattern directly from file without YAML parsing.
    This is exactly how the pipeline does it.
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for line in content.split('\n'):
        if line.startswith('regex:'):
            value = line[6:].strip()
            if value:
                return value
    return None


if __name__ == '__main__':
    # Predefined regex to test
    PREDEFINED_REGEX = r"a\\\ a"
    
    print("\n" + "=" * 50)
    print("TESTING PREDEFINED REGEX")
    print("=" * 50)
    
    # Test the predefined regex
    result = validate_regex_like_pipeline(PREDEFINED_REGEX)
    
    print("\n" + "-" * 50)
    print("RESULT:")
    if result:
        print("✅ Pipeline would PASS this regex")
        
        # Show what this regex would match
        print("\n" + "-" * 50)
        print("MATCH EXAMPLES:")
        test_strings = [
            r"aaa\a",
            "aaa\\a",
            "aaaa",
            r"aaa\\a",
        ]
        compiled = re.compile(PREDEFINED_REGEX)
        for s in test_strings:
            match = compiled.search(s)
            status = "✅ MATCH" if match else "❌ NO MATCH"
            print(f"  {s!r:20} -> {status}")
    else:
        print("❌ Pipeline would FAIL this regex")
    
    print("\n" + "=" * 50)
    sys.exit(0 if result else 1)

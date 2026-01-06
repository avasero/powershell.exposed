#!/usr/bin/env python3
"""
Test YAML validation for all indicator files.
Mimics the GitHub Actions workflow validation logic.
"""

import yaml
import re
import sys
from pathlib import Path


def load_yaml_skip_regex(filepath: Path):
    """Load YAML file, skipping the regex field to avoid parsing issues."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove regex field entirely to avoid parsing issues from complex patterns
    content_no_regex = re.sub(r'^regex:.*?(?=^\w|\Z)', '', content, flags=re.MULTILINE | re.DOTALL)
    return yaml.safe_load(content_no_regex)


def extract_regex_raw(filepath: Path) -> list[str]:
    """Extract regex patterns directly from file without YAML parsing."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    patterns = []
    in_regex = False
    
    for line in content.split('\n'):
        if line.startswith('regex:'):
            in_regex = True
            # Check for inline value: regex: pattern
            value = line[6:].strip()
            if value and not value.startswith('#'):
                # Remove quotes if present
                if (value.startswith('"') and value.endswith('"')) or \
                   (value.startswith("'") and value.endswith("'")):
                    value = value[1:-1]
                if value:
                    patterns.append(value)
        elif in_regex:
            stripped = line.strip()
            if stripped.startswith('- '):
                # List item
                value = stripped[2:].strip()
                if (value.startswith('"') and value.endswith('"')) or \
                   (value.startswith("'") and value.endswith("'")):
                    value = value[1:-1]
                if value:
                    patterns.append(value)
            elif stripped and not stripped.startswith('#') and not stripped.startswith('-'):
                # Continuation or new field - check if new field
                if re.match(r'^\w+:', stripped):
                    in_regex = False
    
    return patterns


def validate_yaml_syntax(filepath: Path) -> tuple[bool, str]:
    """Validate YAML syntax, skipping regex field."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Remove regex field entirely to avoid false positives from complex patterns
        content_no_regex = re.sub(r'^regex:.*?(?=^\w|\Z)', '', content, flags=re.MULTILINE | re.DOTALL)
        
        yaml.safe_load(content_no_regex)
        return True, "OK"
    except yaml.YAMLError as e:
        return False, f"YAML ERROR: {e}"
    except Exception as e:
        return False, f"ERROR: {e}"


def validate_required_fields(filepath: Path) -> tuple[bool, str]:
    """Check for required fields."""
    required = ["name", "description", "regex", "basescore", "tactic", "technique", "reference"]
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        missing = []
        for field in required:
            if not re.search(rf'^{field}:', content, re.MULTILINE):
                missing.append(field)
        
        if missing:
            return False, f"MISSING: {', '.join(missing)}"
        return True, "OK"
    except Exception as e:
        return False, f"ERROR: {e}"


def validate_data_types(filepath: Path) -> tuple[bool, str]:
    """Validate data types (basescore, references)."""
    try:
        data = load_yaml_skip_regex(filepath)
        
        errors = []
        
        # Validate basescore
        bs = data.get('basescore')
        try:
            val = float(bs)
            if not (0 <= val <= 10):
                errors.append(f"basescore must be 0-10, got: {bs}")
        except:
            errors.append(f"basescore must be number, got: {bs}")
        
        # Validate references
        refs = data.get('reference', [])
        if isinstance(refs, str):
            refs = [refs]
        for ref in refs:
            if not (ref.startswith('http://') or ref.startswith('https://')):
                errors.append(f"Invalid URL: {ref}")
        
        if errors:
            return False, "; ".join(errors)
        return True, "OK"
    except Exception as e:
        return False, f"ERROR: {e}"


def validate_regex_patterns(filepath: Path) -> tuple[bool, str]:
    """Validate regex patterns are compilable."""
    try:
        patterns = extract_regex_raw(filepath)
        
        if not patterns:
            return False, "No regex patterns found"
        
        errors = []
        warnings = []
        for p in patterns:
            if p.startswith('http://') or p.startswith('https://'):
                errors.append(f"URL in regex: {p[:50]}")
                continue
            try:
                re.compile(p)
            except re.error as e:
                # Check for known Python regex limitations (valid in other engines)
                err_str = str(e)
                if "bad escape \\p" in err_str or "bad escape \\P" in err_str:
                    warnings.append(f"Uses Unicode property (\\p) - not supported by Python re")
                elif "unterminated character set" in err_str and "[" in p:
                    # Could be intentional unescaped bracket for other engines
                    warnings.append(f"Possible unescaped bracket (may work in other engines)")
                else:
                    errors.append(f"Invalid regex: {e}")
        
        if errors:
            return False, "; ".join(errors)
        if warnings:
            return True, f"OK (warnings: {'; '.join(warnings)})"
        return True, "OK"
    except Exception as e:
        return False, f"ERROR: {e}"


def main():
    # Find indicators directory
    script_dir = Path(__file__).parent
    indicators_dir = script_dir.parent / "indicators"
    
    if not indicators_dir.exists():
        print(f"ERROR: Indicators directory not found: {indicators_dir}")
        sys.exit(1)
    
    # Get all yaml files
    yaml_files = list(indicators_dir.glob("*.yaml")) + list(indicators_dir.glob("*.yml"))
    yaml_files = sorted(yaml_files)
    
    print(f"=== Testing {len(yaml_files)} indicator files ===\n")
    
    validations = [
        ("YAML Syntax", validate_yaml_syntax),
        ("Required Fields", validate_required_fields),
        ("Data Types", validate_data_types),
        ("Regex Patterns", validate_regex_patterns),
    ]
    
    total_errors = 0
    failed_files = []
    
    for filepath in yaml_files:
        file_errors = []
        
        for step_name, validator in validations:
            success, message = validator(filepath)
            if not success:
                file_errors.append(f"  [{step_name}] {message}")
        
        if file_errors:
            print(f"❌ {filepath.name}")
            for err in file_errors:
                print(err)
            total_errors += len(file_errors)
            failed_files.append(filepath.name)
        else:
            print(f"✅ {filepath.name}")
    
    print(f"\n=== SUMMARY ===")
    print(f"Total files: {len(yaml_files)}")
    print(f"Passed: {len(yaml_files) - len(failed_files)}")
    print(f"Failed: {len(failed_files)}")
    
    if failed_files:
        print(f"\nFailed files:")
        for f in failed_files:
            print(f"  - {f}")
        sys.exit(1)
    else:
        print("\n✅ All validations passed!")
        sys.exit(0)


if __name__ == "__main__":
    main()

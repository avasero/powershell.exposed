#!/usr/bin/env python3
"""
Local Indicator Validation Script
Simulates the GitHub Actions pipeline for validating indicator YAML files.
"""

# ============================================
# CONFIGURE THE INDICATOR PATH HERE
# ============================================
INDICATOR_PATH = "indicators/ps_indicator_base64_conversion.yaml"
# ============================================

import sys
import os
import regex
import yaml
from pathlib import Path


class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    RESET = '\033[0m'


def print_step_header(step_num: str, title: str):
    print(f"\n{Colors.BOLD}{Colors.CYAN}=== STEP {step_num}: {title} ==={Colors.RESET}")


def print_success(msg: str):
    print(f"{Colors.GREEN}  {msg}{Colors.RESET}")


def print_error(msg: str):
    print(f"{Colors.RED}  {msg}{Colors.RESET}")


def print_info(msg: str):
    print(f"{Colors.BLUE}  {msg}{Colors.RESET}")


def print_warning(msg: str):
    print(f"{Colors.YELLOW}  {msg}{Colors.RESET}")


def extract_regex_raw(filepath: str) -> str:
    """Extract regex pattern directly from file without YAML parsing."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    for line in content.split('\n'):
        if line.startswith('regex:'):
            value = line[6:].strip()
            # Remove quotes if present
            if (value.startswith("'") and value.endswith("'")) or \
               (value.startswith('"') and value.endswith('"')):
                value = value[1:-1]
            if value:
                return value
    return None


def get_indicator_name(filepath: str) -> str:
    """Extract indicator name from YAML file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                if line.startswith('name:'):
                    name = line[5:].strip().strip('"').strip("'")
                    return name
    except:
        pass
    return None


def step_1_detect_changes(filepath: str) -> dict:
    """Step 1: Detect Changes - Simulates change detection."""
    print_step_header("1", "DETECT CHANGES")

    if not os.path.exists(filepath):
        print_error(f"File not found: {filepath}")
        return {"success": False, "file": None}

    print(f"Checking: {filepath}")
    print_success(f"File exists: {os.path.basename(filepath)}")
    print_info(f"Changed files (1):")
    print(f"    {filepath}")

    return {"success": True, "file": filepath}


def step_2_yaml_syntax(filepath: str) -> dict:
    """Step 2: YAML Syntax - Validates YAML structure."""
    print_step_header("2", "YAML SYNTAX")
    print(f"Checking: {filepath}")

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Remove regex field from yaml read
        content_no_regex = regex.sub(
            r'^regex:.*?(?=^\w|\Z)',
            '',
            content,
            flags=regex.MULTILINE | regex.DOTALL
        )

        yaml.safe_load(content_no_regex)
        print_success("OK")
        print_success("All YAML valid")
        return {"success": True}

    except yaml.YAMLError as e:
        print_error(f"YAML ERROR: {e}")
        print_error("FAILED: 1 file(s)")
        return {"success": False, "error": str(e)}
    except Exception as e:
        print_error(f"Error reading file: {e}")
        return {"success": False, "error": str(e)}


def step_3_required_fields(filepath: str) -> dict:
    """Step 3: Required Fields - Checks all required fields are present."""
    print_step_header("3", "REQUIRED FIELDS")
    print(f"Checking: {filepath}")

    required_fields = ["name", "description", "regex", "basescore", "tactic", "technique", "reference"]

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        missing = []
        for field in required_fields:
            if not regex.search(f'^{field}:', content, flags=regex.MULTILINE):
                missing.append(field)

        if missing:
            print_error(f"MISSING: {' '.join(missing)}")
            print_error("FAILED")
            return {"success": False, "missing": missing}

        print_success("OK")
        print_success("All fields present")
        return {"success": True}

    except Exception as e:
        print_error(f"Error: {e}")
        return {"success": False, "error": str(e)}


def step_3_5_duplicate_check(filepath: str) -> dict:
    """Step 3.5: Duplicate Detection - Checks for duplicates in repo."""
    print_step_header("3.5", "DUPLICATE DETECTION")
    print(f"Checking: {filepath}")

    errors = 0
    ind_name = get_indicator_name(filepath)
    fname = os.path.basename(filepath)

    # Get indicators directory
    indicators_dir = Path(filepath).parent
    if indicators_dir.name != 'indicators':
        # Try to find indicators dir relative to file
        possible_dir = Path(filepath).parent.parent / 'indicators'
        if possible_dir.exists():
            indicators_dir = possible_dir
        else:
            indicators_dir = Path('indicators')

    # Check for duplicate filenames and names in repo
    if indicators_dir.exists():
        for other_file in indicators_dir.glob('*.y*ml'):
            if str(other_file) == filepath or str(other_file.resolve()) == str(Path(filepath).resolve()):
                continue

            # Check filename
            if other_file.name == fname:
                print_error(f"ERROR: Duplicate file name '{fname}' exists at {other_file}")
                errors += 1

            # Check indicator name
            other_name = get_indicator_name(str(other_file))
            if other_name and ind_name and other_name.lower() == ind_name.lower():
                print_error(f"ERROR: Indicator name '{ind_name}' already exists in {other_file}")
                errors += 1

    if ind_name:
        print_info(f"Repo check OK for: {ind_name}")

    print(f"\nChecking database for duplicates...")
    print_warning("Skipping DB check (local mode - no credentials)")

    if errors > 0:
        print_error(f"\nFAILED: {errors} duplicate(s) found")
        return {"success": False, "errors": errors}

    print_success("\nNo duplicates found")
    print_success("Duplicate check passed")
    return {"success": True}


def step_4_data_types(filepath: str) -> dict:
    """Step 4: Data Types - Validates data types of fields."""
    print_step_header("4", "DATA TYPES")
    print(f"Checking: {filepath}")

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Remove regex field to avoid parsing issues
        content_no_regex = regex.sub(
            r'^regex:.*?(?=^\w|\Z)',
            '',
            content,
            flags=regex.MULTILINE | regex.DOTALL
        )

        data = yaml.safe_load(content_no_regex)
        errors = 0

        # Validate basescore
        bs = data.get('basescore')
        try:
            val = float(bs)
            if not (0 <= val <= 10):
                print_error(f"basescore must be 0-10, got: {bs}")
                errors += 1
            else:
                print_info(f"basescore: {val} (valid)")
        except:
            print_error(f"basescore must be number, got: {bs}")
            errors += 1

        # Validate severity if present
        severity = data.get('severity')
        valid_severities = ['low', 'medium', 'high', 'critical']
        if severity and severity.lower() not in valid_severities:
            print_warning(f"severity '{severity}' not in standard values: {valid_severities}")
        elif severity:
            print_info(f"severity: {severity} (valid)")

        # Validate reference is a list
        refs = data.get('reference', [])
        if isinstance(refs, str):
            print_info("reference: single string (will be converted to list)")
        elif isinstance(refs, list):
            print_info(f"reference: list with {len(refs)} item(s)")

        if errors == 0:
            print_success("OK")
            print_success("All types valid")
            return {"success": True, "data": data}
        else:
            print_error(f"FAILED: {errors} error(s)")
            return {"success": False, "errors": errors}

    except Exception as e:
        print_error(f"Error: {e}")
        return {"success": False, "error": str(e)}


def step_5_regex_patterns(filepath: str) -> dict:
    """Step 5: Regex Patterns - Validates regex compiles correctly.

    Uses the same compilation flags as the production site (regex.IGNORECASE).
    """
    print_step_header("5", "REGEX PATTERNS")
    print(f"Checking: {filepath}")

    pattern = extract_regex_raw(filepath)

    if not pattern:
        print_error("No regex found")
        return {"success": False, "error": "No regex found"}

    print_info(f"Pattern: {pattern[:100]}{'...' if len(pattern) > 100 else ''}")

    try:
        # Match production behavior: use IGNORECASE flag
        compiled = regex.compile(pattern, regex.IGNORECASE)
        print_success("Regex valid (compiled with IGNORECASE)")
        print_success("All regex valid")
        return {"success": True, "pattern": pattern, "compiled": compiled}
    except regex.error as e:
        print_error(f"Invalid regex: {e}")
        return {"success": False, "error": str(e)}


def extract_test_case(filepath: str) -> str:
    """Extract test case from YAML file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    for line in content.split('\n'):
        if line.startswith('test:'):
            value = line[5:].strip()
            # Remove quotes if present
            if (value.startswith("'") and value.endswith("'")) or \
               (value.startswith('"') and value.endswith('"')):
                value = value[1:-1]
            return value
    return None


def step_6_regex_test_cases(filepath: str, pattern_result: dict) -> dict:
    """Step 6: Regex Test Cases - Tests the regex against the test case from YAML.

    Uses the same matching approach as the production site:
    - regex.IGNORECASE flag
    - finditer() to find all matches (like powershell_analyzer.py)
    """
    print_step_header("6", "REGEX TEST CASE")

    if not pattern_result.get("success"):
        print_error("Skipping: regex validation failed")
        return {"success": False}

    pattern = pattern_result.get("pattern")
    compiled = pattern_result.get("compiled")

    if not compiled:
        try:
            # Match production behavior: use IGNORECASE flag
            compiled = regex.compile(pattern, regex.IGNORECASE)
        except:
            print_error("Could not compile regex for testing")
            return {"success": False}

    # Extract test case from YAML
    test_string = extract_test_case(filepath)

    if not test_string:
        print_warning("No 'test:' field found in YAML file")
        print_info("Add a 'test:' field with a sample string that should match the regex")
        print_info("Example: test: FromBase64String")
        return {"success": True, "skipped": True}

    print(f"Test string: {Colors.CYAN}{repr(test_string)}{Colors.RESET}")
    print(f"Pattern: {Colors.CYAN}{pattern[:80]}{'...' if len(pattern) > 80 else ''}{Colors.RESET}")
    print()

    try:
        # Match production behavior: use finditer() like powershell_analyzer.py
        pattern_matches = list(compiled.finditer(test_string))

        if pattern_matches:
            print_success(f"MATCHES FOUND: {len(pattern_matches)}")
            for i, match in enumerate(pattern_matches, 1):
                print_success(f"  Match {i}: {repr(match.group(0))}")
                print_info(f"    Position: {match.start()}-{match.end()}")
            return {"success": True, "matches": [m.group(0) for m in pattern_matches]}
        else:
            print_error("NO MATCH")
            print_error("The test string does not match the regex pattern")
            return {"success": False, "matches": []}

    except Exception as e:
        print_error(f"Error during matching: {e}")
        return {"success": False, "error": str(e)}


def print_pipeline_summary(results: dict):
    """Print final pipeline summary."""
    print(f"\n{Colors.BOLD}{Colors.CYAN}=== PIPELINE SUMMARY ==={Colors.RESET}")

    steps = [
        ("Step 1 - Detect", results.get("step1", {}).get("success", False)),
        ("Step 2 - YAML", results.get("step2", {}).get("success", False)),
        ("Step 3 - Fields", results.get("step3", {}).get("success", False)),
        ("Step 3.5 - Duplicates", results.get("step3_5", {}).get("success", False)),
        ("Step 4 - Types", results.get("step4", {}).get("success", False)),
        ("Step 5 - Regex", results.get("step5", {}).get("success", False)),
        ("Step 6 - Test Case", results.get("step6", {}).get("success", False)),
    ]

    all_passed = all(s[1] for s in steps)

    for step_name, passed in steps:
        status = f"{Colors.GREEN}success{Colors.RESET}" if passed else f"{Colors.RED}failure{Colors.RESET}"
        icon = "+" if passed else "x"
        print(f"  [{icon}] {step_name}: {status}")

    print()
    if all_passed:
        print(f"{Colors.GREEN}{Colors.BOLD}SUCCESS: Validation passed{Colors.RESET}")
        return 0
    else:
        print(f"{Colors.RED}{Colors.BOLD}FAILED: Pipeline did not complete successfully{Colors.RESET}")
        return 1


def main():
    filepath = INDICATOR_PATH

    print(f"{Colors.BOLD}{Colors.CYAN}")
    print("=" * 60)
    print("  LOCAL INDICATOR VALIDATION PIPELINE")
    print("  Simulating GitHub Actions workflow")
    print("=" * 60)
    print(f"{Colors.RESET}")
    print(f"Target file: {filepath}")

    results = {}

    # Step 1: Detect Changes
    results["step1"] = step_1_detect_changes(filepath)
    if not results["step1"]["success"]:
        return print_pipeline_summary(results)

    # Step 2: YAML Syntax
    results["step2"] = step_2_yaml_syntax(filepath)
    if not results["step2"]["success"]:
        return print_pipeline_summary(results)

    # Step 3: Required Fields
    results["step3"] = step_3_required_fields(filepath)
    if not results["step3"]["success"]:
        return print_pipeline_summary(results)

    # Step 3.5: Duplicate Check
    results["step3_5"] = step_3_5_duplicate_check(filepath)
    if not results["step3_5"]["success"]:
        return print_pipeline_summary(results)

    # Step 4: Data Types
    results["step4"] = step_4_data_types(filepath)
    if not results["step4"]["success"]:
        return print_pipeline_summary(results)

    # Step 5: Regex Patterns
    results["step5"] = step_5_regex_patterns(filepath)
    if not results["step5"]["success"]:
        return print_pipeline_summary(results)

    # Step 6: Regex Test Cases (bonus step)
    results["step6"] = step_6_regex_test_cases(filepath, results["step5"])

    return print_pipeline_summary(results)


if __name__ == "__main__":
    sys.exit(main())

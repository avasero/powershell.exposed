"""
Evasion Detector - Handles san_regex sanitization and san_score logic

This module provides functions to:
- Apply sanitization regex (san_regex) to remove obfuscation characters
- Detect evasion techniques by comparing matches before/after sanitization
- Calculate adjusted severity based on san_score
"""

import regex
import json
from typing import Optional, List, Tuple, Any, Dict


def parse_san_regex(san_regex_raw: Any) -> Optional[List[str]]:
    """
    Parse san_regex from various formats into a list of regex patterns.

    Args:
        san_regex_raw: Can be a JSON array string, a list, or a raw regex string

    Returns:
        List of regex patterns, or None if parsing fails
    """
    if not san_regex_raw:
        return None

    try:
        if isinstance(san_regex_raw, str):
            try:
                san_patterns = json.loads(san_regex_raw)
            except json.JSONDecodeError:
                # Not JSON, treat as raw regex string
                san_patterns = [san_regex_raw]
        else:
            san_patterns = san_regex_raw

        # Ensure it's always a list
        if not isinstance(san_patterns, list):
            san_patterns = [san_patterns]

        return san_patterns
    except Exception:
        return None


def apply_san_regex(command: str, san_regex_raw: Any, signature_name: str = "") -> Tuple[str, bool]:
    """
    Apply sanitization regex to a command to remove obfuscation characters.

    Args:
        command: The command to sanitize
        san_regex_raw: The san_regex pattern(s) to apply
        signature_name: Name of the signature (for debug logging)

    Returns:
        Tuple of (sanitized_command, was_sanitized)
    """
    if not san_regex_raw:
        return command, False

    command_before = command
    san_patterns = parse_san_regex(san_regex_raw)

    if not san_patterns:
        return command, False

    try:
        for san_pattern in san_patterns:
            command = regex.sub(san_pattern, "", command, flags=regex.IGNORECASE)

        was_sanitized = command != command_before
        return command, was_sanitized

    except regex.error as e:
        print(f"[DEBUG] san_regex error for {signature_name}: {e}")
        return command_before, False


def count_pattern_matches(command: str, patterns: List[str]) -> int:
    """
    Count the number of pattern matches in a command.

    Args:
        command: The command to search in
        patterns: List of regex patterns to match

    Returns:
        Total count of matches across all patterns
    """
    total_matches = 0

    for pattern in patterns:
        try:
            compiled_pattern = regex.compile(pattern, regex.IGNORECASE)
            total_matches += len(list(compiled_pattern.finditer(command)))
        except regex.error:
            pass

    return total_matches


def detect_evasion(
    was_sanitized: bool,
    matches_before_count: int,
    matches_after_count: int
) -> bool:
    """
    Detect if evasion techniques were used based on match counts.

    Evasion is detected if:
    1. Sanitization was applied (command changed)
    2. MORE matches found after sanitization than before
       (meaning some obfuscated instances were revealed)

    Args:
        was_sanitized: Whether sanitization modified the command
        matches_before_count: Number of matches before sanitization
        matches_after_count: Number of matches after sanitization

    Returns:
        True if evasion was detected, False otherwise
    """
    return was_sanitized and matches_after_count > matches_before_count


def calculate_severity_from_score(score: float) -> str:
    """
    Calculate severity level based on a score value.

    Score Ranges:
    - 10.0+: Critical
    - 8.0 - 9.99: High
    - 5.0 - 7.99: Medium
    - 2.0 - 4.99: Low
    - < 2.0: Informational

    Args:
        score: The score value

    Returns:
        Severity string: "critical", "high", "medium", "low", or "informational"
    """
    if score >= 10:
        return "critical"
    elif score >= 8:
        return "high"
    elif score >= 5:
        return "medium"
    elif score >= 2:
        return "low"
    else:
        return "informational"


def get_adjusted_score_and_severity(
    signature: Dict[str, Any],
    matched_via_sanitization: bool
) -> Tuple[float, str, bool]:
    """
    Get the adjusted score and severity based on evasion detection.

    Args:
        signature: The signature dict containing score, san_score, severity
        matched_via_sanitization: Whether the match came from sanitized input

    Returns:
        Tuple of (total_score, severity, san_score_applied)
    """
    san_score = signature.get("san_score")
    san_score_applied = matched_via_sanitization and san_score is not None

    if san_score_applied:
        total_score = san_score
        severity = calculate_severity_from_score(san_score)
    else:
        total_score = signature["score"]
        severity = signature["severity"]

    return total_score, severity, san_score_applied


def process_command_for_evasion(
    command: str,
    signature: Dict[str, Any]
) -> Tuple[str, bool, int]:
    """
    Process a command for evasion detection.

    This is the main entry point that:
    1. Counts matches before sanitization
    2. Applies san_regex
    3. Returns the sanitized command and metadata

    Args:
        command: The command to process
        signature: The signature dict containing patterns and san_regex

    Returns:
        Tuple of (sanitized_command, was_sanitized, matches_before_count)
    """
    san_regex_raw = signature.get("san_regex")
    patterns = signature.get("patterns", [])

    # Count matches BEFORE sanitization
    matches_before_count = count_pattern_matches(command, patterns)

    # Apply san_regex to sanitize the command
    sanitized_command, was_sanitized = apply_san_regex(
        command,
        san_regex_raw,
        signature.get("name", "")
    )

    return sanitized_command, was_sanitized, matches_before_count

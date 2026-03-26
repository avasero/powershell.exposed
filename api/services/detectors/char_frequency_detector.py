"""
Character Frequency Detector

Detects PowerShell commands where a single symbol character appears
disproportionately often compared to all alphanumeric characters,
indicating potential symbol-heavy obfuscation (e.g. ${;}, ${=}, ${+} style).

Only printable, non-whitespace characters are considered.
"""

from typing import Optional


def detect_high_symbol_density(
    command: str,
    min_total_chars: int = 50,
    min_symbol_count: int = 10,
    ratio_threshold: float = 0.5,
) -> Optional[dict]:
    """
    Detect commands where a single symbol character occurs disproportionately
    relative to all alphanumeric (non-symbol) printable characters.

    Args:
        command: The PowerShell command to analyze.
        min_total_chars: Minimum printable non-whitespace chars required to run.
        min_symbol_count: Minimum occurrences of the dominant symbol to trigger.
        ratio_threshold: dominant_symbol_count / max(1, non_symbol_count) to trigger.

    Returns:
        Detection details dict, or None if not triggered.
    """
    printable_chars = [c for c in command if c.isprintable() and not c.isspace()]

    if len(printable_chars) < min_total_chars:
        return None

    non_symbol_count = sum(1 for c in printable_chars if c.isalnum())
    symbol_chars = [c for c in printable_chars if not c.isalnum()]

    if not symbol_chars:
        return None

    symbol_freq: dict = {}
    for c in symbol_chars:
        symbol_freq[c] = symbol_freq.get(c, 0) + 1

    dominant_symbol = max(symbol_freq, key=symbol_freq.get)
    dominant_count = symbol_freq[dominant_symbol]

    if dominant_count < min_symbol_count:
        return None

    ratio = dominant_count / max(1, non_symbol_count)

    if ratio < ratio_threshold:
        return None

    return {
        "dominant_symbol": dominant_symbol,
        "dominant_count": dominant_count,
        "non_symbol_count": non_symbol_count,
        "ratio": ratio,
        "total_printable": len(printable_chars),
    }

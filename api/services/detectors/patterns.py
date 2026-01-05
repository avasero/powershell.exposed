"""
Central location for PowerShell detection patterns
"""

# Pattern for detecting -EncodedCommand and variants
# Supports: - (hyphen), – (en dash), — (em dash), ― (horizontal bar), / (forward slash)
# Matches: -ec, -enc, -enco, -encod, -encode, -encoded, -encodedc, -encodedco, -encodedcom, -encodedcomm, -encodedcomma, -encodedcomman, -encodedcommand
ENCODED_COMMAND_PATTERN = r"[\u002D\u2013\u2014\u2015/](?:ec|e(?:n(?:c(?:o(?:d(?:e(?:d(?:c(?:o(?:m(?:m(?:a(?:n(?:d)?)?)?)?)?)?)?)?)?)?)?)?)?)\s+[\"']?\s*([a-z0-9+/]{20,}={0,2})"

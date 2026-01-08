"""
Detector Registry - Central location to register and access all detectors

To add a new detector:
1. Create your detector file in this directory (e.g., my_detector.py)
2. Import and register it in the DETECTORS dictionary below
3. Use it in powershell_analyzer.py via: from services.detectors import DETECTORS
"""
# from .obfuscation_detector import deobfuscate
from .encoded_command_detector import detect_encoded_command
from .double_encoded_detector import detect_double_encoded_command
from .patterns import ENCODED_COMMAND_PATTERN

# Detector registry - add new detectors here
DETECTORS = {
    # "format_string": {
    #     "function": deobfuscate,
    #     "description": "Resolves PowerShell format strings (e.g., '{0}{1}' -f 'He','llo')"
    # },
    "encoded_command": {
        "function": detect_encoded_command,
        "description": "Detects -EncodedCommand parameter and decodes Base64 payload"
    },
    "double_encoded": {
        "function": detect_double_encoded_command,
        "description": "Detects nested encoding layers"
    },
}

# Convenience exports for direct imports
__all__ = [
    "DETECTORS",
    # "deobfuscate",
    "detect_encoded_command",
    "detect_double_encoded_command",
    "ENCODED_COMMAND_PATTERN",
]

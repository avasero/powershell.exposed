import regex
from typing import Callable, Optional


SANITIZATION_METHODS: list[dict] = []


def register_sanitization(
    name: str,
    description: str,
    required_indicators: list[str],
    transform_fn: Callable[[str], str]
):
    SANITIZATION_METHODS.append({
        "name": name,
        "description": description,
        "required_indicators": required_indicators,
        "transform": transform_fn
    })




def remove_backticks(command: str) -> str:
    return command.replace("`", "")



register_sanitization(
    name="remove_backticks",
    description="Remove backticks (`)",
    required_indicators=["Encoded Command Detected"],
    transform_fn=remove_backticks
)


def apply_sanitization(
    command: str,
    analyze_fn: Callable[[str], list[str]]
) -> dict:
    sanitized_command = command
    applied_sanitizations = []
    
    for method in SANITIZATION_METHODS:
       
        transformed = method["transform"](sanitized_command)
        
        
        if transformed == sanitized_command:
            continue
        
        
        detected_indicators = analyze_fn(transformed)
        
        
        required = set(method["required_indicators"])
        detected = set(detected_indicators)
        
        if required.issubset(detected):
            sanitized_command = transformed
            applied_sanitizations.append({
                "name": method["name"],
                "description": method["description"],
                "triggered_by": list(required & detected)
            })
    
    return {
        "original_command": command,
        "sanitized_command": sanitized_command,
        "applied_sanitizations": applied_sanitizations,
        "was_sanitized": len(applied_sanitizations) > 0
    }


def get_detected_indicator_names(analysis_result: dict) -> list[str]:
    signatures = analysis_result.get("detected_signatures", [])
    return [sig.get("name", "") for sig in signatures]

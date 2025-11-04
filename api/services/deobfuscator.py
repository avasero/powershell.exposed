"""
Fallback deobfuscator for PowerShell commands
Handles common obfuscation patterns when pyminusone fails
"""

import re

def manual_deobfuscate_format_strings(command: str) -> str:
    """
    Manually deobfuscate PowerShell format string patterns
    Example: ("{1}{0}" -f 'x','IE') -> "IEx"
    """
    # Pattern: ("{indices}" -f 'strings')
    pattern = r'\("([^"]+)"\s*-f\s*([^\)]+)\)'
    
    def replace_format(match):
        format_str = match.group(1)
        values_str = match.group(2)
        
        try:
            # Extract values
            values = re.findall(r"'([^']*)'", values_str)
            
            # Extract indices from format string
            indices = re.findall(r'\{(\d+)\}', format_str)
            
            # Build result
            result = format_str
            for idx, index in enumerate(indices):
                index_num = int(index)
                if index_num < len(values):
                    result = result.replace(f'{{{index}}}', values[index_num])
            
            return f'"{result}"'
        except:
            return match.group(0)
    
    # Apply multiple times to handle nested patterns
    max_iterations = 10
    for _ in range(max_iterations):
        old_command = command
        command = re.sub(pattern, replace_format, command)
        if command == old_command:
            break
    
    return command


def deobfuscate_powershell(command: str) -> str:
    """
    Fallback deobfuscator
    """
    # Try manual format string deobfuscation
    deobfuscated = manual_deobfuscate_format_strings(command)
    
    # If changed, return deobfuscated version
    if deobfuscated != command:
        return deobfuscated
    
    return command

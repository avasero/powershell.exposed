-- Migration: Add Highly Obfuscated Command to public_indicators
-- This indicator is detected via character frequency analysis in Python (not regex),
-- but requires an entry in public_indicators to be marked as a community indicator
-- and in powershell_signatures for the analyzer to load its metadata (score, tactics, etc.).

INSERT INTO public.public_indicators (
    name,
    description,
    patterns,
    basescore,
    severity,
    tactics,
    techniques,
    reference,
    max_match,
    file_path,
    link,
    is_active,
    is_premium_indicator
) VALUES (
    'Highly Obfuscated Command',
    'Detects PowerShell commands with a disproportionately high frequency of a single symbol character relative to all alphanumeric characters, indicating symbol-heavy obfuscation (e.g. ${;}, ${=}, ${+} style variable names).',
    '["\\$\\{[^\\w\\s]\\}"]'::jsonb,
    7.0,
    'medium',
    '["TA0005"]'::jsonb,
    '["T1027", "T1027.010"]'::jsonb,
    '["https://attack.mitre.org/techniques/T1027/", "https://attack.mitre.org/techniques/T1027/010/", "https://github.com/danielbohannon/Invoke-Obfuscation"]'::jsonb,
    1,
    'indicators/ps_indicator_high_symbol_density.yaml',
    'https://github.com/avasero/psexposed/blob/main/indicators/ps_indicator_high_symbol_density.yaml',
    true,
    false
)
ON CONFLICT (file_path) DO UPDATE SET
    name              = EXCLUDED.name,
    description       = EXCLUDED.description,
    patterns          = EXCLUDED.patterns,
    basescore         = EXCLUDED.basescore,
    severity          = EXCLUDED.severity,
    tactics           = EXCLUDED.tactics,
    techniques        = EXCLUDED.techniques,
    reference         = EXCLUDED.reference,
    max_match         = EXCLUDED.max_match,
    link              = EXCLUDED.link,
    updated_at        = NOW();

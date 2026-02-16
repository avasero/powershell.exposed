-- Reset the id sequence to avoid primary key conflicts
SELECT setval(
  pg_get_serial_sequence('premium_indicators', 'id'),
  COALESCE((SELECT MAX(id) FROM premium_indicators), 0)
);

-- Insert "Heavily Obfuscated Command" indicator into premium_indicators
-- This indicator is automatically triggered when AST deobfuscation detects techniques
INSERT INTO public.premium_indicators (
  name,
  description,
  patterns,
  basescore,
  severity,
  tactics,
  techniques,
  reference,
  is_active,
  max_match,
  file_path,
  is_premium_indicator
) VALUES (
  'Heavily Obfuscated Command',
  'Multiple obfuscation techniques detected via AST deobfuscation. The command uses techniques such as string concatenation, character codes, format strings, base64 encoding, or variable substitution to hide its true intent.',
  '["__DEOBFUSCATION_CHECK__"]',
  7.5,
  'high',
  '["Defense Evasion"]'::jsonb,
  '["T1027", "T1027.010", "T1140"]'::jsonb,
  '["https://attack.mitre.org/techniques/T1027/"]'::jsonb,
  true,
  1,
  'indicators/ps_indicator_heavily_obfuscated.yaml',
  false
)
ON CONFLICT (file_path) DO UPDATE SET
  basescore = 7.5,
  severity = 'high',
  description = EXCLUDED.description,
  updated_at = now();

-- Inserir o novo indicador de obfuscação
INSERT INTO public.powershell_signatures (
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
  link,
  file_path,
  is_premium_indicator
) VALUES (
  'Obfuscation Detected',
  'Detects if the command has been obfuscated by comparing hashes of original and deobfuscated versions',
  '["__OBFUSCATION_CHECK__"]',
  6.5,
  'medium',
  '["Defense Evasion"]'::jsonb,
  '["T1027", "T1027.001"]'::jsonb,
  '["https://attack.mitre.org/techniques/T1027/"]'::jsonb,
  true,
  1,
  'https://github.com/avasero/psexposed/blob/main/indicators/ps_indicator_obfuscation_detection.yaml',
  'indicators/ps_indicator_obfuscation_detection.yaml',
  false
)
ON CONFLICT (file_path) DO UPDATE SET
  basescore = 6.5,
  description = 'Detects if the command has been obfuscated by comparing hashes of original and deobfuscated versions',
  updated_at = now();

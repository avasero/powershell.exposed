-- Insert encoding indicators

-- 1. Encoded Command Detected
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
  'Encoded Command Detected',
  'Detects if the command has been encoded using PowerShell -EncodedCommand parameter or Base64 encoding',
  '["-EncodedCommand", "-enc", "\\$env:PATHEXT.*Base64", "FromBase64String"]'::jsonb,
  5.0,
  'medium',
  '["Defense Evasion"]'::jsonb,
  '["T1027", "T1027.001", "T1140"]'::jsonb,
  '["https://attack.mitre.org/techniques/T1027/", "https://attack.mitre.org/techniques/T1140/"]'::jsonb,
  true,
  1,
  'https://github.com/avasero/psexposed/blob/main/indicators/ps_indicator_encoded_command.yaml',
  'indicators/ps_indicator_encoded_command.yaml',
  false
)
ON CONFLICT (file_path) DO UPDATE SET
  basescore = 5.0,
  description = 'Detects if the command has been encoded using PowerShell -EncodedCommand parameter or Base64 encoding',
  updated_at = now();

-- 2. Double Encoded Command Detected
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
  'Double Encoded Command Detected',
  'Detects nested encoding attacks where commands are encoded multiple times to evade detection',
  '["FromBase64String.*FromBase64String", "\\[Convert\\]::FromBase64String.*\\[Convert\\]::FromBase64String"]'::jsonb,
  7.5,
  'high',
  '["Defense Evasion"]'::jsonb,
  '["T1027.001", "T1140"]'::jsonb,
  '["https://attack.mitre.org/techniques/T1027/", "https://attack.mitre.org/techniques/T1140/"]'::jsonb,
  true,
  1,
  'https://github.com/avasero/psexposed/blob/main/indicators/ps_indicator_double_encoded_command.yaml',
  'indicators/ps_indicator_double_encoded_command.yaml',
  false
)
ON CONFLICT (file_path) DO UPDATE SET
  basescore = 7.5,
  description = 'Detects nested encoding attacks where commands are encoded multiple times to evade detection',
  updated_at = now();

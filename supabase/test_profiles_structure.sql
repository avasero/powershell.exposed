-- Test script to verify profiles table structure
-- Run this to check if the API key columns exist

-- Check current structure of profiles table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if API key columns exist
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'profiles' 
        AND column_name = 'api_key'
    ) THEN 'API key columns exist ✅'
    ELSE 'API key columns missing ❌ - Run migration 20250117000002_add_api_key_to_profiles.sql'
  END as status;

-- Show sample of profiles data (without sensitive info)
SELECT 
  id,
  username,
  full_name,
  CASE 
    WHEN api_key IS NOT NULL THEN 'Has API Key'
    ELSE 'No API Key'
  END as api_key_status,
  api_key_is_active,
  api_key_usage_count,
  created_at
FROM public.profiles 
LIMIT 5;

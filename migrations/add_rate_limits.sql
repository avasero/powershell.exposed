-- Add limit columns to plans table
ALTER TABLE plans ADD COLUMN IF NOT EXISTS request_limit_per_hour integer DEFAULT 10;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS decode_limit_per_hour integer DEFAULT 5;

-- Update 'free' plan (Limited)
UPDATE plans 
SET request_limit_per_hour = 10, 
    decode_limit_per_hour = 5 
WHERE name = 'free';

-- Update 'premium' plan (Unlimited decodes, higher request limit)
UPDATE plans 
SET request_limit_per_hour = 100, 
    decode_limit_per_hour = NULL 
WHERE name = 'premium';

-- Update 'enterprise' plan (Higher limits)
UPDATE plans 
SET request_limit_per_hour = 1000, 
    decode_limit_per_hour = NULL 
WHERE name = 'enterprise';

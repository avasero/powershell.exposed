-- Create plans table (minimal - only features)
CREATE TABLE IF NOT EXISTS public.plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  can_decode_commands BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default plans (only decode feature)
INSERT INTO public.plans (name, can_decode_commands)
VALUES 
  ('free', FALSE),
  ('premium', TRUE),
  ('enterprise', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Add plan_id to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS plan_id INTEGER DEFAULT 1 REFERENCES public.plans(id);

-- Set default plan (free) for existing users
UPDATE public.profiles 
SET plan_id = (SELECT id FROM public.plans WHERE name = 'free')
WHERE plan_id IS NULL;

-- Migrate existing premium users to premium plan
UPDATE public.profiles 
SET plan_id = (SELECT id FROM public.plans WHERE name = 'premium')
WHERE is_premium_user = TRUE;

-- Create index for faster plan lookups
CREATE INDEX IF NOT EXISTS idx_profiles_plan_id ON public.profiles(plan_id);

-- Create trigger to update updated_at on plans
CREATE OR REPLACE FUNCTION update_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plans_updated_at
BEFORE UPDATE ON public.plans
FOR EACH ROW
EXECUTE FUNCTION update_plans_updated_at();

-- Optional: Keep is_premium_user for backward compatibility but make it computed
-- You can remove this column later after confirming everything works
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_premium_user;

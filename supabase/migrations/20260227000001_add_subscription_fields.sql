-- Add subscription management fields to profiles
ALTER TABLE public.profiles
ADD COLUMN stripe_subscription_id text,
ADD COLUMN subscription_status text,
ADD COLUMN subscription_period_end timestamptz;

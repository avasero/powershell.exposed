-- Add stripe_customer_id to profiles for webhook lookups on subscription events
ALTER TABLE public.profiles
ADD COLUMN stripe_customer_id text;

CREATE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx
  ON public.profiles (stripe_customer_id);

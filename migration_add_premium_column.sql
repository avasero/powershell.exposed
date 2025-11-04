-- Add is_premium_user column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_premium_user BOOLEAN NOT NULL DEFAULT FALSE;

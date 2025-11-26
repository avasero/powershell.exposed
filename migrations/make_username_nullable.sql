-- Remove username and full_name columns
ALTER TABLE public.profiles DROP COLUMN IF EXISTS username;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS full_name;

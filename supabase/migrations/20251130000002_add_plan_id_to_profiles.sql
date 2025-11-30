-- Add plan_id to profiles
ALTER TABLE public.profiles
ADD COLUMN plan_id integer REFERENCES public.plans(id) DEFAULT 4;

-- Update existing profiles to have guest plan (id 4) if null (though default handles new ones)
UPDATE public.profiles SET plan_id = 4 WHERE plan_id IS NULL;

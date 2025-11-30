-- Create update_plans_updated_at function
CREATE OR REPLACE FUNCTION update_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create plans table
create table public.plans (
  id serial not null,
  name text not null,
  can_decode_commands boolean not null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  request_limit_per_hour integer null default 10,
  decode_limit_per_hour integer null default 5,
  constraint plans_pkey primary key (id),
  constraint plans_name_key unique (name)
) TABLESPACE pg_default;

-- Create trigger
create trigger update_plans_updated_at BEFORE
update on plans for EACH row
execute FUNCTION update_plans_updated_at ();

-- Seed Guest Plan
INSERT INTO public.plans (id, name, can_decode_commands, request_limit_per_hour, decode_limit_per_hour)
VALUES (4, 'guest', false, 10, 5)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    can_decode_commands = EXCLUDED.can_decode_commands,
    request_limit_per_hour = EXCLUDED.request_limit_per_hour,
    decode_limit_per_hour = EXCLUDED.decode_limit_per_hour;

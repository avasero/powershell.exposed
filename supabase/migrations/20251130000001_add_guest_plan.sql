-- Add guest plan
INSERT INTO public.plans (id, name, can_decode_commands, request_limit_per_hour, decode_limit_per_hour)
VALUES (4, 'guest', false, 10, 5)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    can_decode_commands = EXCLUDED.can_decode_commands,
    request_limit_per_hour = EXCLUDED.request_limit_per_hour,
    decode_limit_per_hour = EXCLUDED.decode_limit_per_hour;

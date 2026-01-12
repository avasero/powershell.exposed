create table public.premium_indicators (
  id serial not null,
  name text not null,
  description text null,
  patterns jsonb not null,
  basescore numeric(3, 1) not null,
  severity text not null,
  tactics jsonb not null,
  techniques jsonb not null,
  reference jsonb null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  is_active boolean null default true,
  max_match integer not null default 3,
  link text null,
  file_path text not null,
  last_modified_by text null,
  last_modified_by_avatar text null,
  is_premium_indicator boolean not null default false,
  constraint premium_indicators_pkey primary key (id),
  constraint unique_premium_file_path unique (file_path)
) TABLESPACE pg_default;

create index IF not exists idx_premium_indicators_last_modified_by on public.premium_indicators using btree (last_modified_by) TABLESPACE pg_default;

create index IF not exists idx_premium_indicators_link on public.premium_indicators using btree (link) TABLESPACE pg_default
where
  (link is not null);

create index IF not exists idx_premium_indicators_active on public.premium_indicators using btree (is_active) TABLESPACE pg_default;

create index IF not exists idx_premium_indicators_severity on public.premium_indicators using btree (severity) TABLESPACE pg_default;

create index IF not exists idx_premium_indicators_file_path on public.premium_indicators using btree (file_path) TABLESPACE pg_default;

create trigger tr_clear_cache_on_premium_indicators_change
after DELETE
or
update on premium_indicators for EACH row
execute FUNCTION clear_cache_on_indicator_change ();

alter table "public"."premium_indicators" enable row level security;

create policy "Allow read access to active premium indicators"
on "public"."premium_indicators"
to public
using (
  (is_active = true)
);

-- Insert data
INSERT INTO public.premium_indicators (
    id, name, description, patterns, basescore, severity, tactics, techniques, reference, created_at, updated_at, is_active, max_match, link, file_path, last_modified_by, last_modified_by_avatar, is_premium_indicator
) VALUES
(1, 'Double Encoded Command Detected', 'Detects nested encoding attacks where commands are encoded multiple times to evade detection', '["."]', 7.5, 'high', '["Defense Evasion"]', '["T1027.001", "T1140"]', '["https://attack.mitre.org/techniques/T1027/", "https://attack.mitre.org/techniques/T1140/"]', '2025-11-06 14:37:31.490987+00', '2025-11-06 14:37:31.490987+00', true, 1, 'https://github.com/avasero/psexposed/blob/main/indicators/ps_indicator_double_encoded_command.yaml', 'indicators/ps_indicator_double_encoded_command.yaml', null, null, false),
(2, 'Encoded Command Detected', 'Detects if the command has been encoded using PowerShell -EncodedCommand parameter or Base64 encoding', '["."]', 5.0, 'medium', '["Defense Evasion"]', '["T1027", "T1027.001", "T1140"]', '["https://attack.mitre.org/techniques/T1027/", "https://attack.mitre.org/techniques/T1140/"]', '2025-11-06 14:37:31.490987+00', '2025-11-06 14:37:31.490987+00', true, 1, 'https://github.com/avasero/psexposed/blob/main/indicators/ps_indicator_encoded_command.yaml', 'indicators/ps_indicator_encoded_command.yaml', null, null, false);

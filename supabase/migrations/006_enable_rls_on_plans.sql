-- Migration: Enable RLS on public.plans and allow read-only access
-- This migration enables Row Level Security for the `plans` table and
-- creates a policy that allows SELECT for all roles. No write policies
-- are created here — administrative/service role keys can still
-- perform inserts/updates/deletes because service role bypasses RLS.

BEGIN;

-- Enable Row Level Security on the plans table
ALTER TABLE public.plans
    ENABLE ROW LEVEL SECURITY;

-- Allow public read access to plans (useful for frontends to fetch plan info)
-- This policy permits SELECT to everyone (including anonymous requests).
CREATE POLICY "public_select_plans"
    ON public.plans
    FOR SELECT
    USING (true);

COMMIT;

-- Notes:
-- - No INSERT/UPDATE/DELETE policies are created here to keep writes
--   restricted to admin/service operations (service_role bypasses RLS).
-- - If you want to allow specific authenticated users to manage plans,
--   add explicit policies checking `auth.role()` or JWT claims.

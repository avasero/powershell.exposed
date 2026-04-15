-- MIGRATION: Add runpod_job_id column to track pending LLM deobfuscation jobs
-- Allows the API server to resume polling after a restart (cold start resilience)

ALTER TABLE public.powershell_analyses
  ADD COLUMN IF NOT EXISTS runpod_job_id TEXT DEFAULT NULL;

COMMENT ON COLUMN public.powershell_analyses.runpod_job_id IS
'RunPod job ID for a pending LLM deobfuscation. Non-null means the job was submitted
 but deobfuscated_command is not yet populated. Used to resume polling after server
 restart or when the initial polling window expires (cold start resilience).';

CREATE INDEX IF NOT EXISTS idx_analyses_runpod_job_id
  ON public.powershell_analyses(runpod_job_id)
  WHERE runpod_job_id IS NOT NULL;

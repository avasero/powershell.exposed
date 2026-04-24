-- MIGRATION: Add llm_analyzed flag to persistently track which analyses were sent to RunPod/LLM
-- The runpod_job_id column is cleared after completion, so we need a permanent flag
-- to query historical data about LLM-processed commands.

ALTER TABLE public.powershell_analyses
  ADD COLUMN IF NOT EXISTS llm_analyzed BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.powershell_analyses.llm_analyzed IS
'Persistent flag indicating this analysis was sent to RunPod/LLM for deobfuscation.
 Unlike runpod_job_id (which is cleared after completion), this flag remains true
 permanently for historical queries and threshold tuning.';

-- Backfill: mark existing records that were clearly processed by LLM.
-- A record was LLM-processed if it has deobfuscated_command AND its severity
-- at submission time would not have triggered the skip logic.
-- Conservative approach: only backfill where we can be certain.
-- Records with deobfuscated_command but critical severity were AST-only.
UPDATE public.powershell_analyses
  SET llm_analyzed = TRUE
  WHERE deobfuscated_command IS NOT NULL
    AND severity NOT IN ('critical', 'high');

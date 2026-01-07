-- Migration: Clear cache whenever an indicator signature is updated or deleted
-- This ensures that analysis results reflect the latest signature definitions

CREATE OR REPLACE FUNCTION public.clear_cache_on_indicator_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if it's a delete or if relevant fields changed
    IF (TG_OP = 'DELETE') OR
       (OLD.name <> NEW.name) OR
       (OLD.patterns IS DISTINCT FROM NEW.patterns) OR
       (OLD.basescore IS DISTINCT FROM NEW.basescore) OR
       (OLD.severity IS DISTINCT FROM NEW.severity) OR
       (OLD.is_active IS DISTINCT FROM NEW.is_active) OR
       (OLD.max_match IS DISTINCT FROM NEW.max_match) THEN
       
        -- Delete from cache where the indicator name is present in indicators_matched
        -- Note: indicators_matched is json, so we use json_array_elements
        DELETE FROM public.cache_results
        WHERE EXISTS (
            SELECT 1 FROM json_array_elements(indicators_matched) AS elem
            WHERE elem->>'name' = OLD.name
        );
    END IF;
    
    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS tr_clear_cache_on_indicator_change ON public.powershell_signatures;

-- Create the trigger
CREATE TRIGGER tr_clear_cache_on_indicator_change
AFTER UPDATE OR DELETE ON public.powershell_signatures
FOR EACH ROW EXECUTE PROCEDURE public.clear_cache_on_indicator_change();

-- Add comment to document the trigger purpose
COMMENT ON FUNCTION public.clear_cache_on_indicator_change() IS 'Function to clear analysis cache entries associated with a signature when it changes or is deleted';

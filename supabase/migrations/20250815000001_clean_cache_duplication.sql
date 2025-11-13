-- MIGRATION: Clean up pattern duplication in cache_results table
-- Remove redundant 'pattern' from matches_details in results_blob

-- Function to clean up results_blob by removing pattern duplication
CREATE OR REPLACE FUNCTION clean_cache_results_blob()
RETURNS void AS $$
DECLARE
    cache_record RECORD;
    cleaned_blob JSONB;
BEGIN
    FOR cache_record IN SELECT phash, results_blob FROM cache_results LOOP
        -- Clean detected_signatures
        cleaned_blob := jsonb_set(
            cache_record.results_blob,
            '{detected_signatures}',
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'name', sig->'name',
                        'description', sig->'description',
                        'severity', sig->'severity',
                        'base_score', sig->'base_score',
                        'matches_found', sig->'matches_found',
                        'total_score', sig->'total_score',
                        'max_match_allowed', sig->'max_match_allowed',
                        'pattern', sig->'pattern',  -- Keep pattern at signature level
                        'matches_details', (
                            SELECT jsonb_agg(
                                jsonb_build_object(
                                    'matched_text', md->'matched_text',
                                    'position', md->'position',
                                    'match_number', md->'match_number'
                                )
                            )
                            FROM jsonb_array_elements(sig->'matches_details') md
                        ),
                        'tactics', sig->'tactics',
                        'techniques', sig->'techniques',
                        'reference', sig->'reference',
                        'link', sig->'link'
                    )
                )
                FROM jsonb_array_elements(cache_record.results_blob->'detected_signatures') sig
            )
        );
        
        -- Also clean signatures_detected (alias)
        cleaned_blob := jsonb_set(
            cleaned_blob,
            '{signatures_detected}',
            cleaned_blob->'detected_signatures'
        );
        
        -- ✅ FIX: Preservar decoded_command e double_decoded_command se existirem
        IF cache_record.results_blob ? 'decoded_command' THEN
            cleaned_blob := jsonb_set(
                cleaned_blob,
                '{decoded_command}',
                cache_record.results_blob->'decoded_command'
            );
        END IF;
        
        IF cache_record.results_blob ? 'double_decoded_command' THEN
            cleaned_blob := jsonb_set(
                cleaned_blob,
                '{double_decoded_command}',
                cache_record.results_blob->'double_decoded_command'
            );
        END IF;
        
        -- Update the record
        UPDATE cache_results 
        SET results_blob = cleaned_blob
        WHERE phash = cache_record.phash;
        
    END LOOP;
    
    RAISE NOTICE 'Cache results cleaned successfully';
END;
$$ LANGUAGE plpgsql;

-- Execute the cleanup function
SELECT clean_cache_results_blob();

-- Drop the function after use
DROP FUNCTION clean_cache_results_blob();

-- Add comment to document the cleanup
COMMENT ON TABLE cache_results IS 
'Cache table cleaned: pattern removed from matches_details to reduce duplication. Pattern appears only once per signature. Decoded commands preserved.';

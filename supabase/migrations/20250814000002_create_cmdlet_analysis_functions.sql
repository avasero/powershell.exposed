-- Function to check if a command is a common cmdlet and return its score
-- This function can be used alongside the main signature detection
CREATE OR REPLACE FUNCTION check_common_cmdlet(command_text TEXT)
RETURNS TABLE(
    is_common BOOLEAN,
    cmdlet_score DECIMAL(3,1),
    cmdlet_name TEXT,
    cmdlet_description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.is_common_cmdlet,
        pc.basescore,
        pc.cmdlet_name,
        pc.description
    FROM powershell_cmdlets pc
    WHERE 
        LOWER(command_text) LIKE '%' || LOWER(pc.alias) || '%' OR
        LOWER(command_text) LIKE '%' || LOWER(pc.cmdlet_name) || '%'
    LIMIT 1;
    
    -- If no match found, return false
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0.0::DECIMAL(3,1), ''::TEXT, ''::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze command with both signatures and cmdlet detection
CREATE OR REPLACE FUNCTION analyze_powershell_command_comprehensive(command_text TEXT)
RETURNS TABLE(
    signature_matches JSONB,
    cmdlet_info JSONB,
    total_risk_score DECIMAL(5,2),
    has_suspicious_patterns BOOLEAN,
    has_common_cmdlets BOOLEAN
) AS $$
DECLARE
    sig_score DECIMAL(5,2) := 0.0;
    cmdlet_score DECIMAL(5,2) := 0.0;
    signatures_found JSONB := '[]'::jsonb;
    cmdlet_found JSONB := '{}'::jsonb;
    rec RECORD;
    cmdlet_rec RECORD;
BEGIN
    -- Check for malicious signatures
    FOR rec IN 
        SELECT ps.name, ps.basescore, ps.severity, ps.description
        FROM powershell_signatures ps
        WHERE ps.is_active = true
    LOOP
        -- Check if any pattern matches
        IF EXISTS (
            SELECT 1 
            FROM jsonb_array_elements_text(
                (SELECT patterns FROM powershell_signatures WHERE name = rec.name)
            ) AS pattern
            WHERE command_text ~* pattern
        ) THEN
            sig_score := sig_score + rec.basescore;
            signatures_found := signatures_found || jsonb_build_object(
                'name', rec.name,
                'score', rec.basescore,
                'severity', rec.severity,
                'description', rec.description
            );
        END IF;
    END LOOP;

    -- Check for common cmdlets
    FOR cmdlet_rec IN 
        SELECT pc.alias, pc.cmdlet_name, pc.basescore, pc.description
        FROM powershell_cmdlets pc
        WHERE 
            LOWER(command_text) LIKE '%' || LOWER(pc.alias) || '%' OR
            LOWER(command_text) LIKE '%' || LOWER(pc.cmdlet_name) || '%'
    LOOP
        cmdlet_score := cmdlet_score + cmdlet_rec.basescore;
        cmdlet_found := cmdlet_found || jsonb_build_object(
            'alias', cmdlet_rec.alias,
            'cmdlet_name', cmdlet_rec.cmdlet_name,
            'score', cmdlet_rec.basescore,
            'description', cmdlet_rec.description
        );
    END LOOP;

    RETURN QUERY SELECT 
        signatures_found,
        cmdlet_found,
        (sig_score + cmdlet_score)::DECIMAL(5,2),
        (sig_score > 0)::BOOLEAN,
        (cmdlet_score > 0)::BOOLEAN;
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the concurrent detection approach
COMMENT ON FUNCTION analyze_powershell_command_comprehensive IS 'Analyzes PowerShell commands for both malicious signatures and common cmdlets. Common cmdlets (0.1 score) are concurrent with suspicious patterns - a command can be flagged as both legitimate and suspicious simultaneously.';

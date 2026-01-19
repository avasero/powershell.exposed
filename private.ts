// Edge Function: update-private-indicators
// Sincroniza indicadores YAML com a tabela powershell_signatures no Supabase

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as yaml from "https://esm.sh/js-yaml@4.1.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

interface YamlIndicator {
    name?: string;
    description?: string;
    regex?: string | string[];
    basescore?: number | string;
    max_match?: number | string;
    tactic?: string | string[];
    technique?: string | string[];
    reference?: string | string[];
    san_regex?: string | string[];
}

interface IndicatorPayload {
    file_path: string;
    content?: string;
    link?: string;
    last_modified_by?: string;
    last_modified_by_avatar?: string;
    merger?: string;
    merger_avatar?: string;
    action: "upsert" | "delete";
}

interface RequestPayload {
    indicators: IndicatorPayload[];
    github_actor?: string;
}

interface DatabaseIndicator {
    name: string;
    description: string | null;
    patterns: string[];
    basescore: number;
    severity: string;
    tactics: string[];
    techniques: string[];
    reference: string[] | null;
    max_match: number;
    is_active: boolean;
    file_path: string;
    link?: string;
    last_modified_by?: string;
    last_modified_by_avatar?: string;
    merger?: string;
    merger_avatar?: string;
    is_premium_indicator: boolean;
    san_regex: string[] | null;
}

/**
 * Calcula a severidade baseada no basescore
 */
function calculateSeverity(basescore: number): string {
    if (basescore >= 9.0) return "critical";
    if (basescore >= 7.0) return "high";
    if (basescore >= 5.0) return "medium";
    return "low";
}

/**
 * Converte valor para array de strings
 */
function toStringArray(value: unknown): string[] {
    if (!value) return [];
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) {
        return value.map((v) => String(v)).filter((v) => v.length > 0);
    }
    return [];
}

/**
 * Filtra padrões regex válidos (remove URLs e strings vazias)
 */
function filterValidPatterns(patterns: string[], filePath: string): string[] {
    return patterns.filter((pattern) => {
        if (!pattern || pattern.trim().length === 0) return false;
        // URLs generally start with http:// or https://
        if (pattern.startsWith("http://") || pattern.startsWith("https://")) {
            console.log(`⚠️ [${filePath}] Regex pattern rejected (appears to be a URL): ${pattern}`);
            return false;
        }
        return true;
    });
}

/**
 * Faz o parse do conteúdo YAML e retorna um indicador formatado para o banco
 * Retorna um objeto com sucesso ou erro detalhado
 */
function parseYamlContent(
    content: string,
    filePath: string,
    link?: string,
    lastModifiedBy?: string,
    lastModifiedByAvatar?: string,
    merger?: string,
    mergerAvatar?: string
): { indicator: DatabaseIndicator | null; error?: string } {
    try {
        console.log(`🔄 Starting parse of: ${filePath}`);
        const yamlData = yaml.load(content) as YamlIndicator;

        if (!yamlData) {
            const error = `Empty or invalid YAML: ${filePath}`;
            console.log(`❌ ${error}`);
            return { indicator: null, error };
        }

        // Campos obrigatórios
        const name = yamlData.name?.trim();
        if (!name) {
            const error = `Mandatory 'name' field not found: ${filePath}`;
            console.log(`❌ ${error}`);
            return { indicator: null, error };
        }

        // Processar description
        const description = yamlData.description?.trim() || null;

        // Processar patterns (regex)
        let patterns = toStringArray(yamlData.regex);
        patterns = filterValidPatterns(patterns, filePath);

        if (patterns.length === 0) {
            console.log(
                `⚠️ No valid regex patterns in ${filePath}, using default pattern`
            );
            patterns = [".*"];
        }

        console.log(`🔍 Patterns extracted for ${name}: ${JSON.stringify(patterns)}`);

        // Processar basescore
        let basescore = 5.0;
        if (yamlData.basescore !== undefined) {
            const parsed =
                typeof yamlData.basescore === "string"
                    ? parseFloat(yamlData.basescore)
                    : yamlData.basescore;

            if (!isNaN(parsed)) {
                // Limit to valid range (DECIMAL 3,1 = max 99.9)
                const originalBaseScore = parsed;
                basescore = Math.max(0, Math.min(999.9, parsed));
                if (basescore !== originalBaseScore) {
                    console.log(`⚠️ [${filePath}] Basescore clamped from ${originalBaseScore} to ${basescore}`);
                }
            }
        }

        // Calcular severity
        const severity = calculateSeverity(basescore);

        // Processar tactics
        const tactics = toStringArray(yamlData.tactic);

        // Processar techniques
        const techniques = toStringArray(yamlData.technique);

        // Processar references
        const reference = toStringArray(yamlData.reference);

        // Processar max_match
        let maxMatch = 1; // Valor padrão (se não especificado)
        if (yamlData.max_match !== undefined) {
            const parsed =
                typeof yamlData.max_match === "string"
                    ? parseInt(yamlData.max_match, 10)
                    : yamlData.max_match;

            if (!isNaN(parsed) && parsed >= 1) {
                maxMatch = Math.floor(parsed);
            }
        }

        console.log(`🎯 Max_match configured for ${name}: ${maxMatch}`);

        // Processar san_regex - pode ser string ou array
        let sanRegex: string[] | null = null;
        if (yamlData.san_regex) {
            const sanRegexArray = toStringArray(yamlData.san_regex);
            sanRegex = sanRegexArray.length > 0 ? sanRegexArray : null;
        }
        if (sanRegex) {
            console.log(`🧼 Sanitize regex configured for ${name}: ${JSON.stringify(sanRegex)}`);
        }
        const indicator: DatabaseIndicator = {
            name,
            description,
            patterns,
            basescore: parseFloat(basescore.toFixed(1)),
            severity,
            tactics,
            techniques,
            reference: reference.length > 0 ? reference : null,
            max_match: maxMatch,
            is_active: true,
            file_path: filePath,
            is_premium_indicator: false,
            san_regex: sanRegex,
        };

        // Adicionar campos opcionais
        if (link) {
            indicator.link = link;
        }
        if (lastModifiedBy) {
            indicator.last_modified_by = lastModifiedBy;
        }
        if (lastModifiedByAvatar) {
            indicator.last_modified_by_avatar = lastModifiedByAvatar;
        }
        if (merger) {
            indicator.merger = merger;
        }
        if (mergerAvatar) {
            indicator.merger_avatar = mergerAvatar;
        }

        return { indicator };
    } catch (error: any) {
        let errorDetail = `Error parsing YAML ${filePath}: ${error.message}`;
        if (error && typeof error === 'object' && error.mark) {
            errorDetail += `\n   -> Line: ${error.mark.line + 1}, Column: ${error.mark.column + 1}`;
            if (error.mark.snippet) {
                errorDetail += `\n   -> Snippet:\n${error.mark.snippet}`;
            }
        }
        console.log(`❌ ${errorDetail}`);
        console.log(`📄 YAML content context: ${content.substring(0, 1000)}`);
        return { indicator: null, error: errorDetail };
    }
}

/**
 * Insere ou atualiza um indicador no banco de dados
 */
async function upsertIndicator(
    supabase: ReturnType<typeof createClient>,
    indicator: DatabaseIndicator
): Promise<{ success: boolean; error?: string; isNew?: boolean }> {
    try {
        // Verificar se já existe pelo file_path
        const { data: existing, error: selectError } = await supabase
            .from("powershell_signatures")
            .select("id, name")
            .eq("file_path", indicator.file_path)
            .single();

        if (selectError && selectError.code !== "PGRST116") {
            throw selectError;
        }

        if (existing) {
            // Atualizar indicador existente
            const { error: updateError } = await supabase
                .from("powershell_signatures")
                .update({
                    name: indicator.name,
                    description: indicator.description,
                    patterns: indicator.patterns,
                    basescore: indicator.basescore,
                    severity: indicator.severity,
                    tactics: indicator.tactics,
                    techniques: indicator.techniques,
                    reference: indicator.reference,
                    max_match: indicator.max_match,
                    san_regex: indicator.san_regex,
                    link: indicator.link,
                    last_modified_by: indicator.last_modified_by,
                    last_modified_by_avatar: indicator.last_modified_by_avatar,
                    merger: indicator.merger,
                    merger_avatar: indicator.merger_avatar,
                    updated_at: new Date().toISOString(),
                    
                })
                .eq("id", existing.id);

            if (updateError) throw updateError;

            const nameChanged = existing.name !== indicator.name;
            console.log(
                `✅ Updated: ${indicator.name} (${indicator.file_path})${nameChanged ? ` [name changed from "${existing.name}"]` : ""
                }`
            );

            return { success: true, isNew: false };
        } else {
            // Inserir novo indicador
            const { error: insertError } = await supabase
                .from("powershell_signatures")
                .insert({
                    ...indicator,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });

            if (insertError) throw insertError;

            console.log(`✅ Inserted: ${indicator.name} (${indicator.file_path})`);
            return { success: true, isNew: true };
        }
    } catch (error: any) {
        const errorMsg = `Error processing ${indicator.name} (${indicator.file_path}): ${error.message}`;
        console.log(`❌ ${errorMsg}`);
        if (error.details || error.hint || error.code) {
            console.log(`   -> DB Error Details: Code=${error.code}, Details=${error.details}, Hint=${error.hint}`);
            console.log(`   -> Full Payload: ${JSON.stringify(indicator, null, 2)}`);
        }
        return { success: false, error: errorMsg };
    }
}

/**
 * Remove um indicador do banco de dados pelo file_path
 */
async function deleteIndicator(
    supabase: ReturnType<typeof createClient>,
    filePath: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Verificar se existe
        const { data: existing, error: selectError } = await supabase
            .from("powershell_signatures")
            .select("id, name")
            .eq("file_path", filePath)
            .single();

        if (selectError) {
            if (selectError.code === "PGRST116") {
                console.log(`⚠️ Indicator not found for deletion: ${filePath}`);
                return { success: true }; // Não é um erro se já não existe
            }
            throw selectError;
        }

        // Deletar
        const { error: deleteError } = await supabase
            .from("powershell_signatures")
            .delete()
            .eq("id", existing.id);

        if (deleteError) throw deleteError;

        console.log(`🗑️ Deleted: ${existing.name} (${filePath})`);
        return { success: true };
    } catch (error) {
        const errorMsg = `Error deleting ${filePath}: ${error.message}`;
        console.log(`❌ ${errorMsg}`);
        return { success: false, error: errorMsg };
    }
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    try {
        console.log("🚀 Starting update of powershell_signatures table...");

        // Conectar ao Supabase
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error("Supabase configuration not found");
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        console.log("✅ Connected to Supabase");

        // Parse do request body
        const payload: RequestPayload = await req.json();

        if (!payload.indicators || !Array.isArray(payload.indicators)) {
            return new Response(
                JSON.stringify({
                    error: "'indicators' field not provided or invalid format",
                    success: false,
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        console.log(`📊 Processing ${payload.indicators.length} indicators...`);

        const errors: string[] = [];
        let processedCount = 0;
        let insertedCount = 0;
        let updatedCount = 0;
        let deletedCount = 0;

        for (const item of payload.indicators) {
            if (item.action === "delete") {
                // Processar deleção
                const result = await deleteIndicator(supabase, item.file_path);
                if (result.success) {
                    deletedCount++;
                } else if (result.error) {
                    errors.push(result.error);
                }
            } else if (item.action === "upsert" && item.content) {
                // Parse do YAML e upsert
                const parseResult = parseYamlContent(
                    item.content,
                    item.file_path,
                    item.link,
                    item.last_modified_by,
                    item.last_modified_by_avatar,
                    item.merger,
                    item.merger_avatar
                );

                if (parseResult.indicator) {
                    const result = await upsertIndicator(supabase, parseResult.indicator);
                    if (result.success) {
                        processedCount++;
                        if (result.isNew) {
                            insertedCount++;
                        } else {
                            updatedCount++;
                        }
                    } else if (result.error) {
                        errors.push(result.error);
                    }
                } else {
                    errors.push(parseResult.error || `Failed to parse YAML: ${item.file_path}`);
                }
            } else {
                console.log(`⚠️ Invalid action or missing content: ${item.file_path}`);
            }
        }

        const response = {
            success: true,
            message: `Database updated! ${processedCount} processed, ${deletedCount} deleted.`,
            indicators_processed: processedCount,
            indicators_inserted: insertedCount,
            indicators_updated: updatedCount,
            indicators_deleted: deletedCount,
            total_received: payload.indicators.length,
            errors: errors.length > 0 ? errors : undefined,
        };

        console.log(`✅ ${response.message}`);

        return new Response(JSON.stringify(response), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("❌ Error:", error.message);
        return new Response(
            JSON.stringify({
                error: error.message,
                success: false,
            }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});

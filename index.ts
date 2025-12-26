// Edge Function: update-public-indicators
//PUBLIC INDICATORS
// Synchronizes YAML indicators with the public_indicators table in Supabase

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
}

interface IndicatorPayload {
  file_path: string;
  content?: string;
  link?: string;
  last_modified_by?: string;
  last_modified_by_avatar?: string;
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
  is_premium_indicator: boolean;
}

/**
 * Calculates severity based on basescore
 */
function calculateSeverity(basescore: number): string {
  if (basescore >= 9.0) return "critical";
  if (basescore >= 7.0) return "high";
  if (basescore >= 5.0) return "medium";
  return "low";
}

/**
 * Converts value to string array
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
 * Filters valid regex patterns (removes URLs and empty strings)
 */
function filterValidPatterns(patterns: string[]): string[] {
  return patterns.filter((pattern) => {
    if (!pattern || pattern.trim().length === 0) return false;
    // URLs usually start with http:// or https://
    if (pattern.startsWith("http://") || pattern.startsWith("https://"))
      return false;
    return true;
  });
}

/**
 * Parses YAML content and returns a formatted indicator for the database
 * Returns an object with success or detailed error
 */
function parseYamlContent(
  content: string,
  filePath: string,
  link?: string,
  lastModifiedBy?: string,
  lastModifiedByAvatar?: string
): { indicator: DatabaseIndicator | null; error?: string } {
  try {
    console.log(`🔄 Starting parse of: ${filePath}`);
    const yamlData = yaml.load(content) as YamlIndicator;

    if (!yamlData) {
      const error = `Empty or invalid YAML: ${filePath}`;
      console.log(`❌ ${error}`);
      return { indicator: null, error };
    }

    // Mandatory fields
    const name = yamlData.name?.trim();
    if (!name) {
      const error = `Mandatory field 'name' not found: ${filePath}`;
      console.log(`❌ ${error}`);
      return { indicator: null, error };
    }

    // Process description
    const description = yamlData.description?.trim() || null;

    // Process patterns (regex)
    let patterns = toStringArray(yamlData.regex);
    patterns = filterValidPatterns(patterns);

    if (patterns.length === 0) {
      console.log(
        `⚠️ No valid regex pattern in ${filePath}, using default pattern`
      );
      patterns = [".*"];
    }

    console.log(`🔍 Patterns extracted for ${name}: ${JSON.stringify(patterns)}`);

    // Process basescore
    let basescore = 5.0;
    if (yamlData.basescore !== undefined) {
      const parsed =
        typeof yamlData.basescore === "string"
          ? parseFloat(yamlData.basescore)
          : yamlData.basescore;

      if (!isNaN(parsed)) {
        // Limit to valid range (DECIMAL 3,1 = max 99.9)
        basescore = Math.max(0, Math.min(99.9, parsed));
      }
    }

    // Calculate severity
    const severity = calculateSeverity(basescore);

    // Process tactics
    const tactics = toStringArray(yamlData.tactic);

    // Process techniques
    const techniques = toStringArray(yamlData.technique);

    // Process references
    const reference = toStringArray(yamlData.reference);

    // Process max_match
    let maxMatch = 3; // Default table value
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
    };

    // Add optional fields
    if (link) {
      indicator.link = link;
    }
    if (lastModifiedBy) {
      indicator.last_modified_by = lastModifiedBy;
    }
    if (lastModifiedByAvatar) {
      indicator.last_modified_by_avatar = lastModifiedByAvatar;
    }

    return { indicator };
  } catch (error) {
    const errorDetail = `Error parsing YAML ${filePath}: ${error.message}`;
    console.log(`❌ ${errorDetail}`);
    console.log(`📄 YAML content (first 500 chars): ${content.substring(0, 500)}`);
    return { indicator: null, error: errorDetail };
  }
}

/**
 * Inserts or updates an indicator in the database
 */
async function upsertIndicator(
  supabase: ReturnType<typeof createClient>,
  indicator: DatabaseIndicator
): Promise<{ success: boolean; error?: string; isNew?: boolean }> {
  try {
    // Check if exists by file_path
    const { data: existing, error: selectError } = await supabase
      .from("public_indicators")
      .select("id, name")
      .eq("file_path", indicator.file_path)
      .single();

    if (selectError && selectError.code !== "PGRST116") {
      throw selectError;
    }

    if (existing) {
      // Update existing indicator
      const { error: updateError } = await supabase
        .from("public_indicators")
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
          link: indicator.link,
          last_modified_by: indicator.last_modified_by,
          last_modified_by_avatar: indicator.last_modified_by_avatar,
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
      // Insert new indicator
      const { error: insertError } = await supabase
        .from("public_indicators")
        .insert({
          ...indicator,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      console.log(`✅ Inserted: ${indicator.name} (${indicator.file_path})`);
      return { success: true, isNew: true };
    }
  } catch (error) {
    const errorMsg = `Error processing ${indicator.name} (${indicator.file_path}): ${error.message}`;
    console.log(`❌ ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

/**
 * Removes an indicator from the database by file_path
 */
async function deleteIndicator(
  supabase: ReturnType<typeof createClient>,
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if exists
    const { data: existing, error: selectError } = await supabase
      .from("public_indicators")
      .select("id, name")
      .eq("file_path", filePath)
      .single();

    if (selectError) {
      if (selectError.code === "PGRST116") {
        console.log(`⚠️ Indicator not found for deletion: ${filePath}`);
        return { success: true }; // Not an error if it doesn't exist
      }
      throw selectError;
    }

    // Delete
    const { error: deleteError } = await supabase
      .from("public_indicators")
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
    console.log("🚀 Starting public_indicators table update...");

    // Connect to Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration not found");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log("✅ Connected to Supabase");

    // Parse request body
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
        // Process deletion
        const result = await deleteIndicator(supabase, item.file_path);
        if (result.success) {
          deletedCount++;
        } else if (result.error) {
          errors.push(result.error);
        }
      } else if (item.action === "upsert" && item.content) {
        // Parse YAML and upsert
        const parseResult = parseYamlContent(
          item.content,
          item.file_path,
          item.link,
          item.last_modified_by,
          item.last_modified_by_avatar
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

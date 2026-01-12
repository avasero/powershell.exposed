// Supabase Edge Function: check-indicator-duplicates
// Deploy: supabase functions deploy check-indicator-duplicates

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { names, file_paths } = await req.json();

        if (!names || !Array.isArray(names) || names.length === 0) {
            return new Response(
                JSON.stringify({ duplicates: [], message: "No names provided" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Create Supabase client
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!supabaseUrl || !supabaseKey) {
            throw new Error("Missing Supabase credentials");
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Query for existing indicators with matching names (case-insensitive)
        const lowerNames = names.map((n: string) => n.toLowerCase());

        const { data: existingIndicators, error } = await supabase
            .from("powershell_signatures")
            .select("name, file_path")
            .filter("name", "ilike", `%(${lowerNames.join("|")})%`);

        if (error) {
            console.error("Database error:", error);
            throw error;
        }

        // Find duplicates - indicators that exist with a DIFFERENT file path
        const filePathSet = new Set(file_paths || []);
        const duplicates: Array<{ name: string; file_path: string }> = [];

        for (const existing of existingIndicators || []) {
            const existingNameLower = existing.name?.toLowerCase();

            // Check if the name matches any of the input names
            if (lowerNames.includes(existingNameLower)) {
                // Only flag as duplicate if the file path is different
                if (!filePathSet.has(existing.file_path)) {
                    duplicates.push({
                        name: existing.name,
                        file_path: existing.file_path,
                    });
                }
            }
        }

        return new Response(
            JSON.stringify({
                duplicates,
                checked: names.length,
                found: duplicates.length
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Error:", error);
        return new Response(
            JSON.stringify({ error: error.message || "Internal server error" }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
        );
    }
});

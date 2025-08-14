import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseAuth.auth.getUser(token)

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar análises do usuário - ordenadas por risk_score (maior primeiro) e depois por data
    const { data: analyses, error: analysesError } = await supabaseClient
      .from('powershell_analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('risk_score', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (analysesError) {
      throw analysesError
    }

    // Buscar estatísticas do usuário
    const { data: stats } = await supabaseClient
      .from('user_analysis_stats')
      .select('*')
      .eq('user_id', user.id)
      .single()

    return new Response(
      JSON.stringify({ 
        analyses: analyses || [],
        stats: stats || {
          total_analyses: 0,
          critical_count: 0,
          high_count: 0,
          medium_count: 0,
          low_count: 0,
          very_low_count: 0,
          avg_risk_score: 0
        },
        pagination: {
          page,
          limit,
          has_more: analyses && analyses.length === limit
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Get analyses error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface YamlIndicator {
  name: string
  description: string
  regex: string | string[]
  basescore: number | string
  tactic: string | string[]
  technique: string | string[]
  reference: string | string[]
}

interface DatabaseIndicator {
  name: string
  description: string
  patterns: string[]
  basescore: number
  severity: string
  tactics: string[]
  techniques: string[]
  reference: string[]
  is_active: boolean
}

function parseYamlIndicator(yamlData: any): DatabaseIndicator | null {
  try {
    const name = yamlData.name || ''
    const description = yamlData.description || ''
    
    // Processar regex/patterns
    let patterns: string[] = []
    if (typeof yamlData.regex === 'string') {
      patterns = [yamlData.regex]
    } else if (Array.isArray(yamlData.regex)) {
      patterns = yamlData.regex
    }
    
    // Processar basescore
    let basescore = 5.0
    if (typeof yamlData.basescore === 'string') {
      try {
        basescore = parseFloat(yamlData.basescore)
      } catch {
        basescore = 5.0
      }
    } else if (typeof yamlData.basescore === 'number') {
      basescore = yamlData.basescore
    }
    
    // Validar limites do basescore (DECIMAL(4,1) = máximo 999.9)
    if (basescore > 999.9) {
      console.log(`⚠️  Basescore ${basescore} excede o limite da tabela (999.9). Ajustando para 999.9.`)
      basescore = 999.9
    } else if (basescore < 0) {
      console.log(`⚠️  Basescore ${basescore} é negativo. Ajustando para 0.`)
      basescore = 0.0
    }
    
    // Determinar severity baseado no basescore
    let severity = 'medium'
    if (basescore >= 9.0) {
      severity = 'critical'
    } else if (basescore >= 7.0) {
      severity = 'high'
    } else if (basescore >= 5.0) {
      severity = 'medium'
    } else {
      severity = 'low'
    }
    
    // Processar tactics
    let tactics: string[] = []
    if (typeof yamlData.tactic === 'string') {
      tactics = [yamlData.tactic]
    } else if (Array.isArray(yamlData.tactic)) {
      tactics = yamlData.tactic
    }
    
    // Processar techniques
    let techniques: string[] = []
    if (typeof yamlData.technique === 'string') {
      techniques = [yamlData.technique]
    } else if (Array.isArray(yamlData.technique)) {
      techniques = yamlData.technique
    }
    
    // Processar references
    let reference: string[] = []
    if (typeof yamlData.reference === 'string') {
      reference = [yamlData.reference]
    } else if (Array.isArray(yamlData.reference)) {
      reference = yamlData.reference
    }
    
    return {
      name,
      description,
      patterns,
      basescore: parseFloat(basescore.toString()),
      severity,
      tactics,
      techniques,
      reference,
      is_active: true
    }
  } catch (e) {
    console.log(`❌ Erro ao processar indicador: ${e.message}`)
    return null
  }
}

async function updateSupabaseDatabase(supabase: any, indicators: DatabaseIndicator[]): Promise<{ success: number, errors: string[] }> {
  const errors: string[] = []
  let successCount = 0
  
  for (const indicator of indicators) {
    try {
      // Verificar se o indicador já existe pelo nome
      const { data: existing, error: selectError } = await supabase
        .from('powershell_signatures')
        .select('id')
        .eq('name', indicator.name)
        .single()
      
      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows found
        throw selectError
      }
      
      if (existing) {
        // Atualizar indicador existente
        const { error: updateError } = await supabase
          .from('powershell_signatures')
          .update({
            description: indicator.description,
            patterns: indicator.patterns,
            basescore: indicator.basescore,
            severity: indicator.severity,
            tactics: indicator.tactics,
            techniques: indicator.techniques,
            reference: indicator.reference,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
        
        if (updateError) throw updateError
        
        console.log(`✅ Atualizado indicador: ${indicator.name}`)
        successCount++
      } else {
        // Inserir novo indicador
        const { error: insertError } = await supabase
          .from('powershell_signatures')
          .insert({
            name: indicator.name,
            description: indicator.description,
            patterns: indicator.patterns,
            basescore: indicator.basescore,
            severity: indicator.severity,
            tactics: indicator.tactics,
            techniques: indicator.techniques,
            reference: indicator.reference,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_active: true
          })
        
        if (insertError) throw insertError
        
        console.log(`✅ Inserido novo indicador: ${indicator.name}`)
        successCount++
      }
    } catch (e) {
      const errorMsg = `Erro ao processar ${indicator.name}: ${e.message}`
      errors.push(errorMsg)
      console.log(`❌ ${errorMsg}`)
    }
  }
  
  return { success: successCount, errors }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    console.log('🚀 Iniciando atualização do banco de dados...')
    
    // Conectar ao Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuração do Supabase não encontrada')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    console.log('✅ Conectado ao Supabase')
    
    // Obter dados dos indicadores do request body
    const { changed_files, indicators } = await req.json()
    
    if (!indicators || !Array.isArray(indicators)) {
      return new Response(
        JSON.stringify({ error: 'Indicadores não fornecidos ou formato inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📁 Processando alterações em arquivos: ${changed_files?.join(', ') || 'N/A'}`)
    
    const validIndicators: DatabaseIndicator[] = []
    
    for (const yamlData of indicators) {
      const indicator = parseYamlIndicator(yamlData)
      if (indicator) {
        validIndicators.push(indicator)
      }
    }
    
    if (validIndicators.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'Nenhum indicador válido encontrado',
          success: true,
          indicators_processed: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`📊 Processando ${validIndicators.length} indicadores...`)
    
    // Atualizar banco de dados
    const { success: successCount, errors } = await updateSupabaseDatabase(supabase, validIndicators)
    
    const response = {
      success: true,
      message: `Banco de dados atualizado! ${successCount} indicadores processados.`,
      indicators_processed: successCount,
      total_indicators: validIndicators.length,
      errors: errors.length > 0 ? errors : undefined
    }
    
    console.log(`✅ ${response.message}`)
    
    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erro:', error.message)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

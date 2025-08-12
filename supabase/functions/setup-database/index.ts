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

const TABLE_SCHEMA = `
CREATE TABLE IF NOT EXISTS powershell_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    patterns JSONB,
    basescore DECIMAL(4,1),
    severity TEXT,
    tactics JSONB,
    techniques JSONB,
    reference JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);
`

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
    console.log('🚀 Configurando banco de dados Supabase para PSExposed...')
    
    // Configurar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuração do Supabase não encontrada')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    console.log('✅ Conectado ao Supabase')

    // Criar tabela
    console.log('📋 Criando tabela powershell_signatures...')
    try {
      const { error: schemaError } = await supabase.rpc('exec_sql', { sql: TABLE_SCHEMA })
      if (schemaError) throw schemaError
      console.log('✅ Tabela criada/verificada com sucesso')
    } catch (e) {
      console.log(`⚠️  Erro ao criar tabela (pode já existir): ${e.message}`)
      console.log('ℹ️  Continuando com a inserção de dados...')
    }

    // Obter dados dos indicadores do request body
    const { indicators } = await req.json()
    
    if (!indicators || !Array.isArray(indicators)) {
      return new Response(
        JSON.stringify({ error: 'Indicadores não fornecidos ou formato inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📁 Processando ${indicators.length} indicadores`)

    const processedIndicators: DatabaseIndicator[] = []

    // Processar cada indicador
    for (const yamlData of indicators) {
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
        
        // Determinar severity
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
        
        const indicator: DatabaseIndicator = {
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
        
        processedIndicators.push(indicator)
        console.log(`✅ Processado: ${name}`)
        
      } catch (e) {
        console.log(`❌ Erro ao processar indicador: ${e.message}`)
      }
    }

    if (processedIndicators.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhum indicador válido encontrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Inserir indicadores no banco
    console.log(`📊 Inserindo ${processedIndicators.length} indicadores no banco...`)
    
    try {
      const { data, error } = await supabase
        .from('powershell_signatures')
        .insert(processedIndicators)
      
      if (error) throw error
      
      console.log(`✅ ${processedIndicators.length} indicadores inseridos com sucesso!`)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Banco de dados configurado com sucesso! ${processedIndicators.length} indicadores inseridos.`,
          indicators_inserted: processedIndicators.length
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
      
    } catch (e) {
      console.log(`❌ Erro ao inserir indicadores: ${e.message}`)
      console.log('🔄 Tentando inserir um por um...')
      
      let successCount = 0
      const errors: string[] = []
      
      for (const indicator of processedIndicators) {
        try {
          const { error } = await supabase
            .from('powershell_signatures')
            .insert(indicator)
          
          if (error) {
            errors.push(`Erro ao inserir ${indicator.name}: ${error.message}`)
          } else {
            successCount++
            console.log(`✅ Inserido: ${indicator.name}`)
          }
        } catch (e) {
          errors.push(`Erro ao inserir ${indicator.name}: ${e.message}`)
        }
      }
      
      console.log(`📊 Resumo: ${successCount}/${processedIndicators.length} indicadores inseridos`)
      
      return new Response(
        JSON.stringify({ 
          success: successCount > 0,
          message: `Inseridos ${successCount}/${processedIndicators.length} indicadores`,
          indicators_inserted: successCount,
          errors: errors
        }),
        { 
          status: successCount > 0 ? 200 : 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

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

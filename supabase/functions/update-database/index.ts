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
  max_match?: number | string
  link?: string
  file_path?: string  // ✅ NOVO: Campo file_path adicionado como identificador único
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
  max_match: number
  is_active: boolean
  link?: string
  file_path: string  // ✅ NOVO: Campo file_path obrigatório como identificador único
}

function parseYamlIndicator(yamlData: any): DatabaseIndicator | null {
  try {
    const name = yamlData.name || ''
    const description = yamlData.description || ''
    const file_path = yamlData.file_path || ''
    
    // ✅ VALIDAÇÃO: file_path é obrigatório
    if (!file_path) {
      console.log(`❌ file_path é obrigatório para o indicador: ${name}`)
      return null
    }
    
    // Processar regex/patterns - CORRIGIDO para pegar apenas os padrões regex
    let patterns: string[] = []
    if (typeof yamlData.regex === 'string') {
      patterns = [yamlData.regex]
    } else if (Array.isArray(yamlData.regex)) {
      // Filtrar apenas strings que parecem ser padrões regex (não URLs)
      patterns = yamlData.regex.filter((pattern: string) => {
        // URLs geralmente começam com http:// ou https://
        const isUrl = pattern.startsWith('http://') || pattern.startsWith('https://')
        // Padrões regex geralmente contêm caracteres especiais como ?, *, +, etc.
        const hasRegexChars = /[?*+^$|()[\]{}]/.test(pattern)
        return !isUrl && (hasRegexChars || pattern.length > 0)
      })
    }
    
    // Se não encontrou padrões válidos, usar um padrão padrão
    if (patterns.length === 0) {
      console.log(`⚠️  Nenhum padrão regex válido encontrado para ${name}, usando padrão padrão`)
      patterns = ['.*'] // Padrão que captura tudo
    }
    
    console.log(`🔍 Padrões extraídos para ${name} (${file_path}):`, patterns)
    
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
    
    // Processar max_match
    let maxMatch = 1 // Valor padrão
    if (yamlData.max_match !== undefined) {
      if (typeof yamlData.max_match === 'string') {
        try {
          maxMatch = parseInt(yamlData.max_match, 10)
          if (isNaN(maxMatch) || maxMatch < 1) {
            console.log(`⚠️  Max_match inválido (${yamlData.max_match}). Usando valor padrão: 1`)
            maxMatch = 1
          }
        } catch {
          console.log(`⚠️  Erro ao processar max_match (${yamlData.max_match}). Usando valor padrão: 1`)
          maxMatch = 1
        }
      } else if (typeof yamlData.max_match === 'number') {
        maxMatch = yamlData.max_match < 1 ? 1 : Math.floor(yamlData.max_match)
      }
    }
    
    console.log(`🎯 Max_match configurado para ${name}: ${maxMatch}`)
    
    // Processar link
    let link: string | undefined = undefined
    if (yamlData.link && typeof yamlData.link === 'string') {
      link = yamlData.link
      console.log(`🔗 Link configurado para ${name}: ${link}`)
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
      max_match: maxMatch,
      is_active: true,
      file_path  // ✅ NOVO: file_path como identificador único
    }
    
    // Adicionar link apenas se estiver presente
    if (link) {
      indicator.link = link
    }
    
    return indicator
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
      // ✅ ALTERADO: Verificar se o indicador já existe pelo file_path em vez do nome
      const { data: existing, error: selectError } = await supabase
        .from('powershell_signatures')
        .select('id, name')
        .eq('file_path', indicator.file_path)
        .single()
      
      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows found
        throw selectError
      }
      
      if (existing) {
        // ✅ ATUALIZADO: Atualizar indicador existente (incluindo nome que pode ter mudado)
        const updateData: any = {
          name: indicator.name,  // ✅ NOVO: Permitir atualização do nome
          description: indicator.description,
          patterns: indicator.patterns,
          basescore: indicator.basescore,
          severity: indicator.severity,
          tactics: indicator.tactics,
          techniques: indicator.techniques,
          reference: indicator.reference,
          max_match: indicator.max_match,
          updated_at: new Date().toISOString()
        }
        
        // Adicionar link apenas se estiver presente
        if (indicator.link) {
          updateData.link = indicator.link
        }
        
        const { error: updateError } = await supabase
          .from('powershell_signatures')
          .update(updateData)
          .eq('id', existing.id)
        
        if (updateError) throw updateError
        
        // ✅ MELHOR LOG: Mostrar se o nome mudou
        const nameChanged = existing.name !== indicator.name
        console.log(`✅ Atualizado indicador: ${indicator.name} (${indicator.file_path})${nameChanged ? ` [nome alterado de "${existing.name}"]` : ''}`)
        successCount++
      } else {
        // ✅ ATUALIZADO: Inserir novo indicador com file_path
        const insertData: any = {
          name: indicator.name,
          description: indicator.description,
          patterns: indicator.patterns,
          basescore: indicator.basescore,
          severity: indicator.severity,
          tactics: indicator.tactics,
          techniques: indicator.techniques,
          reference: indicator.reference,
          max_match: indicator.max_match,
          file_path: indicator.file_path,  // ✅ NOVO: Incluir file_path na inserção
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: true
        }
        
        // Adicionar link apenas se estiver presente
        if (indicator.link) {
          insertData.link = indicator.link
        }
        
        const { error: insertError } = await supabase
          .from('powershell_signatures')
          .insert(insertData)
        
        if (insertError) throw insertError
        
        console.log(`✅ Inserido novo indicador: ${indicator.name} (${indicator.file_path})`)
        successCount++
      }
    } catch (e) {
      const errorMsg = `Erro ao processar ${indicator.name} (${indicator.file_path}): ${e.message}`
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
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Função simples para fazer parse de YAML básico (sem dependências externas)
function parseSimpleYaml(yamlContent: string): any {
  const result: any = {}
  const lines = yamlContent.split('\n')
  let currentKey: string | null = null
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine === '' || trimmedLine.startsWith('#')) continue
    
    // Parse de campos simples: key: value (mas não linhas que começam com -)
    if (trimmedLine.match(/^[^:]+:\s*[^[\]]+$/) && !trimmedLine.startsWith('-')) {
      const [key, ...valueParts] = trimmedLine.split(':')
      const value = valueParts.join(':').trim().replace(/^["']|["']$/g, '')
      currentKey = key.trim()
      result[currentKey] = value
    }
    // Parse de arrays simples: key: [item1, item2]
    else if (trimmedLine.match(/^[^:]+:\s*\[.*\]$/)) {
      const [key, valuePart] = trimmedLine.split(':', 2)
      const arrayContent = valuePart.trim().replace(/^\[|\]$/g, '')
      currentKey = key.trim()
      result[currentKey] = arrayContent.split(',').map(item => 
        item.trim().replace(/^["']|["']$/g, '')
      ).filter(item => item !== '')
    }
    // Parse de arrays multi-linha: key: seguido de linhas com -
    else if (trimmedLine.startsWith('-')) {
      if (currentKey) {
        const value = trimmedLine.substring(1).trim().replace(/^["']|["']$/g, '')
        if (value) {
          // Inicializar como array se ainda não for
          if (!Array.isArray(result[currentKey])) {
            result[currentKey] = []
          }
          result[currentKey].push(value)
        }
      }
    }
    // Parse de campo sem valor (para arrays multi-linha): key:
    else if (trimmedLine.match(/^[^:]+:\s*$/)) {
      const key = trimmedLine.replace(':', '').trim()
      currentKey = key
      result[currentKey] = []
    }
  }
  
  return result
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
    const { yaml_content, file_path } = await req.json()
    
    if (!yaml_content) {
      return new Response(
        JSON.stringify({ error: 'Conteúdo YAML não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📁 Processando arquivo: ${file_path || 'conteúdo fornecido'}`)

    try {
      // Parse do YAML
      const data = parseSimpleYaml(yaml_content) as YamlIndicator
      
      // Extrair informações do YAML
      const name = data.name || ''
      const description = data.description || ''
      
      // Processar regex/patterns
      let patterns: string[] = []
      if (typeof data.regex === 'string') {
        patterns = [data.regex]
      } else if (Array.isArray(data.regex)) {
        // Filtrar apenas strings que parecem ser padrões regex (não URLs)
        patterns = data.regex.filter((pattern: string) => {
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
      
      console.log(`🔍 Padrões extraídos para ${name}:`, patterns)
      
      // Processar basescore
      let basescore = 5.0
      if (typeof data.basescore === 'string') {
        try {
          basescore = parseFloat(data.basescore)
        } catch {
          basescore = 5.0
        }
      } else if (typeof data.basescore === 'number') {
        basescore = data.basescore
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
      if (typeof data.tactic === 'string') {
        tactics = [data.tactic]
      } else if (Array.isArray(data.tactic)) {
        tactics = data.tactic
      }
      
      // Processar techniques
      let techniques: string[] = []
      if (typeof data.technique === 'string') {
        techniques = [data.technique]
      } else if (Array.isArray(data.technique)) {
        techniques = data.technique
      }
      
      // Processar references
      let reference: string[] = []
      if (typeof data.reference === 'string') {
        reference = [data.reference]
      } else if (Array.isArray(data.reference)) {
        reference = data.reference
      }
      
      // Processar max_match
      let maxMatch = 1 // Valor padrão
      if (data.max_match !== undefined) {
        if (typeof data.max_match === 'string') {
          try {
            maxMatch = parseInt(data.max_match, 10)
            if (isNaN(maxMatch) || maxMatch < 1) {
              console.log(`⚠️  Max_match inválido (${data.max_match}). Usando valor padrão: 1`)
              maxMatch = 1
            }
          } catch {
            console.log(`⚠️  Erro ao processar max_match (${data.max_match}). Usando valor padrão: 1`)
            maxMatch = 1
          }
        } else if (typeof data.max_match === 'number') {
          maxMatch = data.max_match < 1 ? 1 : Math.floor(data.max_match)
        }
      }
      
      console.log(`🎯 Max_match configurado para ${name}: ${maxMatch}`)
      
      const processedIndicator = {
        name,
        description,
        patterns,
        basescore: parseFloat(basescore.toString()),
        severity,
        tactics,
        techniques,
        reference,
        max_match: maxMatch,
        is_active: true
      }
      
      console.log(`✅ Processado: ${name}`)
      
      return new Response(
        JSON.stringify({ 
          success: true,
          indicator: processedIndicator,
          message: `Indicador ${name} processado com sucesso`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
      
    } catch (yamlError) {
      console.log(`❌ Erro ao fazer parse do YAML: ${yamlError.message}`)
      return new Response(
        JSON.stringify({ 
          error: `Erro ao fazer parse do YAML: ${yamlError.message}`,
          success: false
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Cache simples para signatures (renovado a cada 10 minutos)
let signaturesCache: any[] | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutos

interface AnalysisResult {
  command: string
  is_malicious: boolean
  risk_score: number
  severity: string
  signatures_detected: any[]
  cmdlets_detected?: any[] // Novo campo para cmdlets
  tactics: string[]
  techniques: string[]
  decoded_command?: string
  analysis_details: {
    indicators: string[]
    patterns_found: string[]
    recommendations: string[]
    cmdlet_score?: number // Novo campo para score dos cmdlets
    signature_score?: number // Novo campo para score das signatures
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Configurar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verificar usuário
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request
    const { command } = await req.json()
    
    console.log('Received command for analysis:', command)
    
    if (!command || typeof command !== 'string') {
      console.error('Invalid command received:', command)
      return new Response(
        JSON.stringify({ error: 'Command is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Carregar assinaturas e analisar
    console.log('Loading signatures...')
    const signatures = await loadSignatures()
    console.log('Signatures loaded:', signatures.length)
    
    console.log('Starting analysis...')
    const analysis = await analyzeCommand(command, signatures, supabase) // Passar supabase para a função
    console.log('Analysis completed:', analysis)

    // Salvar no banco - incluir cmdlets no analysis_result como fallback
    const analysisData: any = {
      user_id: user.id,
      command: analysis.command,
      is_malicious: analysis.is_malicious,
      risk_score: analysis.risk_score,
      severity: analysis.severity,
      signatures_detected: analysis.signatures_detected,
      tactics: analysis.tactics,
      techniques: analysis.techniques,
      decoded_command: analysis.decoded_command,
      analysis_result: analysis, // Incluir toda a análise aqui como backup
      cmdlets_detected: analysis.cmdlets_detected || [] // Tentar incluir na coluna dedicada
    }

    const { data: savedAnalysis, error: dbError } = await supabase
      .from('powershell_analyses')
      .insert(analysisData)
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return new Response(
        JSON.stringify({ error: 'Failed to save analysis', details: dbError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis: {
          ...savedAnalysis,
          analysis_result: analysis  // Incluir o resultado da análise também
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Analysis error:', error)
    
    // Log detalhado do erro para debug
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        debug: `Error in analysis: ${error.name}` 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function loadSignatures() {
  try {
    // Verificar cache primeiro
    const now = Date.now()
    if (signaturesCache && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('Using cached signatures')
      return signaturesCache
    }

    console.log('Loading signatures from database...')
    // Carregar signatures diretamente do banco de dados
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: signatures, error } = await supabase
      .from('powershell_signatures')
      .select('*')
      .eq('is_active', true)
      .order('basescore', { ascending: false })

    if (error) {
      console.error('Error loading signatures from database:', error)
      return getFallbackSignatures()
    }

    if (!signatures || signatures.length === 0) {
      console.warn('No signatures found in database, using fallback')
      return getFallbackSignatures()
    }

    // Converter formato do banco para formato esperado
    const convertedSignatures = signatures.map(sig => ({
      name: sig.name,
      patterns: Array.isArray(sig.patterns) ? sig.patterns : [],
      severity: sig.severity,
      tactics: Array.isArray(sig.tactics) ? sig.tactics : [],
      techniques: Array.isArray(sig.techniques) ? sig.techniques : [],
      score: sig.basescore,
      description: sig.description,
      reference: Array.isArray(sig.reference) ? sig.reference : (sig.reference ? [sig.reference] : [])
    }))

    // Armazenar no cache
    signaturesCache = convertedSignatures
    cacheTimestamp = now

    console.log(`Loaded and cached ${convertedSignatures.length} signatures from database`)
    return convertedSignatures

  } catch (error) {
    console.error('Failed to load signatures from database:', error)
    return getFallbackSignatures()
  }
}

function getFallbackSignatures() {
  // Fallback signatures com regex patterns corretos dos YAMLs
  console.log('Using fallback signatures with correct YAML regex patterns')
  return [
    {
      name: "Invoke-Expression Cmdlet",
      patterns: ["Invoke-Expression", "\\biex\\b"],
      severity: "medium",
      tactics: ["Execution"],
      techniques: ["T1059.001"],
      score: 5.0,
      description: "Spots potential use of Invoke-Expression cmdlet and its alias."
    },
    {
      name: "Long base64 string",
      patterns: ["(?i)[a-z0-9+/=]{100,}"],
      severity: "medium",
      tactics: ["Defense Evasion", "Execution"],
      techniques: ["T1027.001", "T1059.001"],
      score: 6.0,
      description: "Because attackers stuff all kinds of badness into base64 blobs even when they're not using -EncodedCommand."
    },
    {
      name: "Potential tampering with MS Defender",
      patterns: [
        "Disable(RealtimeMonitoring|BehaviorMonitoring|IOAVProtection|ScriptScanning|IntrusionPreventionSystem|AntiSpyware)",
        "EnableControlledFolderAccess\\s+disabled",
        "MAPSReporting\\s+0",
        "SubmitSamplesConsent\\s+2"
      ],
      severity: "critical",
      tactics: ["Defense Evasion"],
      techniques: ["T1562.001", "T1059.001"],
      score: 9.7,
      description: "Spots potential attempts to tamper with MS Defender."
    },
    {
      name: "Scheduled Task modification",
      patterns: [
        "\\bRegister-ScheduledTask",
        "New-(ScheduledTaskTrigger|ScheduledTaskAction)",
        "Win32_ScheduledJob.+create",
        "schtasks.+\\s\\/create",
        "Schedule\\.Service.+\\.create"
      ],
      severity: "critical",
      tactics: ["Persistence", "Privilege Escalation"],
      techniques: ["T1053.005", "T1059.001"],
      score: 9.7,
      description: "Spots potential Windows Task creation/modification via the most common forms/cmdlets."
    },
    {
      name: "Service Creation",
      patterns: ["\\bnew-service\\s", "\\bsc(.exe)*\\s+create\\s"],
      severity: "high",
      tactics: ["Persistence", "Privilege Escalation"],
      techniques: ["T1543.003", "T1059.001"],
      score: 7.6,
      description: "Spots potential service creation via New-Service PS cmdlet and sc.exe."
    },
    {
      name: "Web Client traces",
      patterns: [
        "RestMethod",
        "[\\.-]webclient",
        "WebRequest",
        "Net.Sockets.TcpClient",
        "InternetExplorer\\.Application",
        "(win|Xml)Http",
        "\\b(curl|wget|iwr|irm)\\s+"
      ],
      severity: "high",
      tactics: ["Execution"],
      techniques: ["T1105", "T1059.001"],
      score: 7.5,
      description: "Spots potential attempts to use PS as a web client to access network resources."
    }
  ]
}

async function analyzeCommand(command: string, signatures: any[], supabase: any): Promise<AnalysisResult> {
  const detectedSignatures: any[] = []
  const tactics = new Set<string>()
  const techniques = new Set<string>()
  const indicators: string[] = []
  const patterns_found: string[] = []
  let totalScore = 0
  let cmdletScore = 0
  const detectedCmdlets: any[] = []

  // Primeiro, verificar cmdlets comuns (score 0.1 cada) - TRATANDO COMO SIGNATURES
  try {
    console.log('=== CMDLET DETECTION START ===')
    console.log('Checking cmdlets for command:', command)
    
    // Usar o mesmo cliente supabase que já foi criado no início da função
    console.log('Querying powershell_cmdlets table...')
    const { data: cmdlets, error: cmdletError } = await supabase
      .from('powershell_cmdlets')
      .select('alias, cmdlet_name, basescore, description, patterns, severity, tactics, techniques, reference')
      .eq('is_active', true)
      .limit(200) // Limitar para debug
    
    console.log('Cmdlets query result:')
    console.log('- Total cmdlets found:', cmdlets?.length || 0)
    console.log('- Error:', cmdletError)
    
    if (cmdletError) {
      console.error('❌ Error querying cmdlets:', cmdletError)
      console.error('Error details:', JSON.stringify(cmdletError, null, 2))
    } else if (cmdlets && cmdlets.length > 0) {
      console.log('✅ Found cmdlets in database:', cmdlets.length)
      console.log('First 3 cmdlets:', cmdlets.slice(0, 3))
      
      for (const cmdlet of cmdlets) {
        let detected = false
        let matchedPattern = ''
        
        // Testar contra patterns (se existirem) - igual às signatures
        if (cmdlet.patterns && Array.isArray(cmdlet.patterns)) {
          for (const pattern of cmdlet.patterns) {
            try {
              const regex = new RegExp(pattern, 'i')
              if (regex.test(command)) {
                detected = true
                matchedPattern = pattern
                console.log(`✅ PATTERN MATCH: ${pattern} matched in ${cmdlet.alias} for command: ${command}`)
                break // Parar no primeiro match para evitar duplicatas
              }
            } catch (regexError) {
              console.warn(`Invalid regex pattern "${pattern}":`, regexError)
            }
          }
        } else {
          // Fallback: testar alias e cmdlet_name diretamente com word boundaries mais específicos
          const aliasPattern = new RegExp(`(^|\\s)${cmdlet.alias}(\\s|$)`, 'i')
          const cmdletPattern = new RegExp(`\\b${cmdlet.cmdlet_name.replace('-', '\\-?')}\\b`, 'i')
          
          if (aliasPattern.test(command)) {
            detected = true
            matchedPattern = cmdlet.alias
            console.log(`✅ ALIAS MATCH: ${cmdlet.alias}`)
          } else if (cmdletPattern.test(command)) {
            detected = true
            matchedPattern = cmdlet.cmdlet_name
            console.log(`✅ CMDLET MATCH: ${cmdlet.cmdlet_name}`)
          }
        }
        
        if (detected) {
          // Verificar se já detectamos este cmdlet para evitar duplicatas
          const alreadyDetected = detectedCmdlets.some(existing => 
            existing.alias === cmdlet.alias || existing.cmdlet_name === cmdlet.cmdlet_name
          )
          
          if (!alreadyDetected) {
            console.log(`✅ NEW CMDLET DETECTED: ${cmdlet.alias} -> ${cmdlet.cmdlet_name}`)
            
            // Adicionar aos detectedCmdlets (formato antigo para compatibilidade)
            detectedCmdlets.push({
              alias: cmdlet.alias,
              cmdlet_name: cmdlet.cmdlet_name,
              score: cmdlet.basescore,
              description: cmdlet.description
            })
            
            // IMPORTANTE: Também adicionar às signatures detectadas (NOVO - para aparecer na mesma seção)
            detectedSignatures.push({
              name: `${cmdlet.alias} (${cmdlet.cmdlet_name})`,
              pattern: matchedPattern,
              matched_text: matchedPattern,
              matched_command: command,
              severity: cmdlet.severity || 'very_low',
              score: cmdlet.basescore,
              description: cmdlet.description,
              tactics: cmdlet.tactics || ['Execution'],
              techniques: cmdlet.techniques || ['T1059.001'],
              reference: cmdlet.reference || []
            })
            
            cmdletScore += cmdlet.basescore
            totalScore += cmdlet.basescore // Adicionar ao score total também
            
            // Adicionar táticas e técnicas
            if (cmdlet.tactics && Array.isArray(cmdlet.tactics)) {
              cmdlet.tactics.forEach((tactic: string) => tactics.add(tactic))
            } else {
              tactics.add('Execution')
            }
            
            if (cmdlet.techniques && Array.isArray(cmdlet.techniques)) {
              cmdlet.techniques.forEach((technique: string) => techniques.add(technique))
            } else {
              techniques.add('T1059.001')
            }
            
            indicators.push(`PowerShell cmdlet: ${cmdlet.alias} (${cmdlet.cmdlet_name})`)
            patterns_found.push(cmdlet.alias)
            
            console.log(`✅ Added cmdlet: ${cmdlet.alias} -> ${cmdlet.cmdlet_name} (score: ${cmdlet.basescore})`)
          } else {
            console.log(`⚠️ DUPLICATE: ${cmdlet.alias} already detected, skipping`)
          }
        }
      }
      
      console.log('Final detected cmdlets count:', detectedCmdlets.length)
      console.log('Final detected cmdlets:', detectedCmdlets)
      console.log('Total cmdlet score:', cmdletScore)
    } else {
      console.log('❌ No cmdlets found - empty result set')
    }
    console.log('=== CMDLET DETECTION END ===')
  } catch (cmdletError) {
    console.error('❌ Exception in cmdlet detection:', cmdletError)
    console.error('Error stack:', cmdletError.stack)
  }

  // Análise usando patterns das signatures (busca simples primeiro)
  for (const signature of signatures) {
    for (const pattern of signature.patterns) {
      try {
        // Usar apenas regex matching com os patterns completos dos YAMLs
        const regex = new RegExp(pattern, 'i')
        const match = command.match(regex)
        if (match) {
          detectedSignatures.push({
            name: signature.name,
            pattern: pattern,
            matched_text: match[0], // O texto específico que fez match
            matched_command: command, // Comando completo para highlight
            severity: signature.severity,
            score: signature.score,
            description: signature.description,
            tactics: signature.tactics,
            techniques: signature.techniques,
            reference: signature.reference
          })
          
          signature.tactics.forEach((tactic: string) => tactics.add(tactic))
          signature.techniques.forEach((technique: string) => techniques.add(technique))
          
          indicators.push(`${signature.name}: ${match[0]}`)
          patterns_found.push(match[0])
          totalScore += signature.score
          console.log(`Regex matched: "${match[0]}" from pattern "${pattern}" in signature: ${signature.name}`)
          break // Uma detecção por assinatura para performance
        }
      } catch (regexError) {
        console.warn(`Error with pattern "${pattern}":`, regexError)
      }
    }
  }

  // Decodificação Base64 melhorada
  let decodedCommand: string | undefined = undefined
  if (command.includes('FromBase64String') || command.includes('-EncodedCommand')) {
    try {
      const base64Match = command.match(/[A-Za-z0-9+/]{20,}={0,2}/)
      if (base64Match) {
        decodedCommand = atob(base64Match[0])
      }
    } catch (error) {
      // Ignore decode errors
    }
  }

  // Score final - SOMA dos scores das signatures detectadas + cmdlets comuns
  const finalScore = totalScore + cmdletScore

  const severity = getSeverityLevel(finalScore)
  const is_malicious = totalScore >= 5.0 // Só malicioso se tiver signatures suspeitas

  // Recomendações baseadas na análise
  const recommendations: string[] = []
  
  // Informar sobre cmdlets detectados
  if (detectedCmdlets.length > 0) {
    recommendations.push(`📋 ${detectedCmdlets.length} common PowerShell cmdlet(s) detected`)
  }
  
  if (is_malicious) {
    recommendations.push("⚠️ Potentially malicious command detected")
    recommendations.push("🔒 Review and isolate if necessary")
    if (decodedCommand) {
      recommendations.push("🔍 Base64 decoded content found - analyze carefully")
    }
  } else if (detectedCmdlets.length > 0) {
    recommendations.push("✅ Contains legitimate PowerShell cmdlets")
  } else {
    recommendations.push("✅ Command appears safe")
  }

  // Ordenar signatures detectadas por score (maior primeiro)
  const sortedSignatures = detectedSignatures.sort((a, b) => b.score - a.score)

  return {
    command,
    is_malicious,
    risk_score: Math.round(finalScore * 10) / 10,
    severity,
    signatures_detected: sortedSignatures,
    cmdlets_detected: detectedCmdlets, // Adicionar cmdlets detectados
    tactics: Array.from(tactics),
    techniques: Array.from(techniques),
    decoded_command: decodedCommand,
    analysis_details: {
      indicators,
      patterns_found,
      recommendations,
      cmdlet_score: cmdletScore, // Score dos cmdlets
      signature_score: totalScore // Score das signatures
    }
  }
}

function getSeverityLevel(score: number): string {
  if (score >= 8.1) return 'critical'
  if (score >= 6.1) return 'high'
  if (score >= 4.1) return 'medium'
  if (score >= 2.1) return 'low'
  return 'very_low'
}

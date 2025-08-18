import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cache simples para análises (limpa a cada 5 minutos)
const analysisCache = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

// Função para limpar cache expirado
function cleanExpiredCache() {
  const now = Date.now()
  for (const [key, value] of analysisCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      analysisCache.delete(key)
    }
  }
}

// Gerar chave de cache baseada no comando
function getCacheKey(command) {
  return command.toLowerCase().trim()
}

// Função para limpar todo o cache manualmente
export function clearAnalysisCache() {
  analysisCache.clear()
  console.log('Analysis cache cleared')
}

// Função para verificar tamanho do cache
export function getCacheStats() {
  cleanExpiredCache()
  return {
    size: analysisCache.size,
    keys: Array.from(analysisCache.keys())
  }
}

// Função para analisar comando PowerShell
export async function analyzeCommand(command, ipAddress = null, ipLocation = null) {
  // Limpar cache expirado
  cleanExpiredCache()
  
  // Verificar cache primeiro
  const cacheKey = getCacheKey(command)
  const cached = analysisCache.get(cacheKey)
  
  if (cached) {
    console.log('Cache hit for command:', command)
    return cached.result
  }

  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error('User not authenticated')
  }

  console.log('Cache miss - fetching from backend for command:', command)
  console.log('User IP address:', ipAddress)
  console.log('User IP location:', ipLocation)
  
  // Log detalhado dos dados sendo enviados
  const requestBody = { 
    command,
    ip_address: ipAddress,
    country: ipLocation?.country || null,
    city: ipLocation?.city || null,
    region: ipLocation?.region || null,
    timezone: ipLocation?.timezone || null
  };
  
  console.log('📤 Request body being sent to backend:');
  console.log(JSON.stringify(requestBody, null, 2));
  console.log('📍 Location data breakdown:');
  console.log('  - Country:', requestBody.country);
  console.log('  - City:', requestBody.city);
  console.log('  - Region:', requestBody.region);
  console.log('  - Timezone:', requestBody.timezone);

  const response = await fetch(`${supabaseUrl}/functions/v1/analyze-command`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  })

  console.log('Response status:', response.status)
  console.log('Response ok:', response.ok)

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Error response:', errorText)
    
    try {
      const error = JSON.parse(errorText)
      throw new Error(error.error || error.details || 'Analysis failed')
    } catch (parseError) {
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }
  }

  const result = await response.json()
  console.log('Analysis result:', result)
  
  // Armazenar no cache
  analysisCache.set(cacheKey, {
    result: result,
    timestamp: Date.now()
  })
  
  return result
}

// Função para buscar análises do usuário
export async function getUserAnalyses(page = 1, limit = 10) {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error('User not authenticated')
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/get-user-analyses?page=${page}&limit=${limit}`, {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch analyses')
  }

  return await response.json()
}

// Função para buscar uma análise específica
export async function getAnalysisById(id) {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('powershell_analyses')
    .select('*')
    .eq('id', id)
    .eq('user_id', session.user.id)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

// Função para buscar estatísticas do dashboard
export async function getDashboardStats() {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('user_analysis_stats')
    .select('*')
    .eq('user_id', session.user.id)
    .single()

  if (error && error.code !== 'PGRST116') { // Not found error
    throw new Error(error.message)
  }

  return data || {
    total_analyses: 0,
    critical_count: 0,
    high_count: 0,
    medium_count: 0,
    low_count: 0,
    very_low_count: 0,
    avg_risk_score: 0,
    persistence_count: 0,
    defense_evasion_count: 0,
    execution_count: 0,
    privilege_escalation_count: 0
  }
}

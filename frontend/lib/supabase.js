import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Função para analisar comando PowerShell
export async function analyzeCommand(command) {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error('User not authenticated')
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/analyze-command`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ command })
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

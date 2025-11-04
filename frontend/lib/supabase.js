import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}
  
export const supabase = createClient(supabaseUrl, supabaseAnonKey)


const analysisCache = new Map()
const CACHE_DURATION = 5 * 60 * 1000 


function cleanExpiredCache() {
  const now = Date.now()
  for (const [key, value] of analysisCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      analysisCache.delete(key)
    }
  }
}


function getCacheKey(command) {
  return command.toLowerCase().trim()
}


export function clearAnalysisCache() {
  analysisCache.clear()
  
}

export function getCacheStats() {
  cleanExpiredCache()
  return {
    size: analysisCache.size,
    keys: Array.from(analysisCache.keys())
  }
}


export async function analyzeCommand(command, ipAddress = null, ipCountry = null) {

  cleanExpiredCache()
  

  const cacheKey = getCacheKey(command)
  const cached = analysisCache.get(cacheKey)
  
  if (cached) {
    
    return cached.result
  }

  const { data: { session } } = await supabase.auth.getSession()
  
 

  

  const requestBody = { 
    command,
    ip_address: ipAddress,
    country: ipCountry || null
  };
  


 
  const headers = {
    'Content-Type': 'application/json',
  }
  

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  const response = await fetch(`/api/analyze`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(requestBody)
  })


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

  

  analysisCache.set(cacheKey, {
    result: result,
    timestamp: Date.now()
  })
  
  return result
}


export async function getAnalysisById(id) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/analysis/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Analysis not found');
      }
      throw new Error(`Failed to fetch analysis: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch analysis');
    }
    
    return data.analysis;
  } catch (error) {
    console.error('Error fetching analysis:', error);
    throw error;
  }
}


export async function getAnalysisByIdAuthenticated(id) {
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

  if (error && error.code !== 'PGRST116') {
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

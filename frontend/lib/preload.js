// Cache e pré-carregamento para melhor performance
let preloadedData = null

export async function preloadSignatures() {
  if (preloadedData) return preloadedData
  
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null

    // Fazer uma chamada pequena para "aquecer" a Edge Function
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze-command`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command: 'Get-Process' }) // Comando simples para pré-carregar
    })

    if (response.ok) {
      const result = await response.json()
      preloadedData = result
      console.log('Indicators preloaded successfully')
      return result
    }
  } catch (error) {
    console.log('Preload failed, but that\'s ok:', error)
  }
  return null
}

// Limpar cache quando usuário faz logout
export function clearPreloadCache() {
  preloadedData = null
}

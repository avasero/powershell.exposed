// Cache e pré-carregamento para melhor performance
let preloadedData = null

export async function preloadSignatures() {
  if (preloadedData) return preloadedData
  
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null

    // Fazer uma chamada pequena para "aquecer" a API Python
    const response = await fetch(`/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command: 'Get-Process' }) // Comando simples para pré-carregar
    })

    if (response.ok) {
      const result = await response.json()
      preloadedData = result
      
      return result
    }
  } catch (error) {
    
  }
  return null
}

// Limpar cache quando usuário faz logout
export function clearPreloadCache() {
  preloadedData = null
}

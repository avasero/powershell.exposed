
let preloadedData = null

export async function preloadSignatures() {
  if (preloadedData) return preloadedData
  
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null

    const response = await fetch(`/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command: 'Get-Process' }) 
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


export function clearPreloadCache() {
  preloadedData = null
}

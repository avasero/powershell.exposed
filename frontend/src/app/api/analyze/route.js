export async function POST(request) {
  try {
    const { 
      command, 
      user_id, 
      ip_address, 
      country, 
      city, 
      region, 
      timezone, 
      user_agent 
    } = await request.json();
    
    if (!command) {
      return Response.json({ error: 'Command is required' }, { status: 400 });
    }
    
    // Fazer proxy para a API Python
    const response = await fetch('https://powershell-fastapi.vercel.app/analyze-pcre2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        command,
        user_id,
        ip_address,
        country,
        city,
        region,
        timezone,
        user_agent
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return Response.json(data);
    
  } catch (error) {
    console.error('Proxy error:', error);
    return Response.json({ 
      error: 'Failed to analyze command',
      details: error.message 
    }, { status: 500 });
  }
}

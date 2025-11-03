export async function POST(request) {
  try {
    const { 
      command, 
      user_id, 
      ip_address, 
      country,
      user_agent,
      session_id
    } = await request.json();
    
    if (!command) {
      return Response.json({ error: 'Command is required' }, { status: 400 });
    }
    
   
    const requestBody = { 
      command,
      user_id,
      ip_address,
      country,
      user_agent,
      search_type: "WEB",  
      session_id
    };

    const response = await fetch('https://powershell-fastapi.vercel.app/evaluate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
  
    if (!response.ok) {
      return Response.json(data, { status: response.status });
    }
    
    return Response.json(data);
    
  } catch (error) {
    console.error('Proxy error:', error);
    return Response.json({ 
      error: 'Failed to analyze command',
      details: error.message 
    }, { status: 500 });
  }
}

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
      user_agent,
      captcha_token,
      captcha_answer,
      session_id
    } = await request.json();
    
    if (!command) {
      return Response.json({ error: 'Command is required' }, { status: 400 });
    }
    
    // Fazer proxy para a API Python
    const requestBody = { 
      command,
      user_id,
      ip_address,
      country,
      city,
      region,
      timezone,
      user_agent,
      search_type: "WEB",  // Frontend sempre é WEB
      session_id
    };

    // Incluir dados do captcha se fornecidos
    if (captcha_token && captcha_answer) {
      requestBody.captcha_token = captcha_token;
      requestBody.captcha_answer = captcha_answer;
    }

    const response = await fetch('https://powershell-fastapi.vercel.app/analyze-pcre2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    // Retornar resposta com o status correto (incluindo rate limiting)
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

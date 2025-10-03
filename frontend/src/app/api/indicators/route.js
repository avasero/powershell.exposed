import { supabase } from '../../../lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const severity = searchParams.get('severity')
    const search = searchParams.get('search')
    
    const offset = (page - 1) * limit
    
    // Construir query base
    let query = supabase
      .from('powershell_signatures')
      .select(`
        id,
        name,
        description,
        basescore,
        severity,
        tactics,
        techniques,
        reference,
        created_at,
        updated_at,
        is_active,
        max_match,
        link
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    
    // Aplicar filtros
    if (severity) {
      query = query.eq('severity', severity)
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }
    
    // Aplicar paginação
    query = query.range(offset, offset + limit - 1)
    
    const { data: indicators, error, count } = await query
    
    if (error) {
      console.error('Erro ao buscar indicadores:', error)
      return Response.json({ 
        error: 'Falha ao buscar indicadores',
        details: error.message 
      }, { status: 500 })
    }
    
    // Buscar contagem total para paginação
    const { count: totalCount, error: countError } = await supabase
      .from('powershell_signatures')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
    
    if (countError) {
      console.error('Erro ao contar indicadores:', countError)
    }
    
    return Response.json({
      indicators: indicators || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    })
    
  } catch (error) {
    console.error('Erro interno:', error)
    return Response.json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    }, { status: 500 })
  }
}

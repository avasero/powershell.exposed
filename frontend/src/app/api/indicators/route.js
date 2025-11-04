import { supabase } from '../../../lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const severity = searchParams.get('severity')
    const search = searchParams.get('search')
    
    const offset = (page - 1) * limit
    
    // Get user authentication status
    const { data: { session } } = await supabase.auth.getSession()
    let isPremiumUser = false
    
    if (session?.user?.id) {
      // Check if user is premium
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium_user')
        .eq('id', session.user.id)
        .single()
      
      isPremiumUser = profile?.is_premium_user || false
    }
    
    // Build query base
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
        link,
        last_modified_by,
        last_modified_by_avatar,
        is_premium_indicator
      `)
      .eq('is_active', true)
    
    // Filter premium indicators based on user status
    if (!isPremiumUser) {
      query = query.eq('is_premium_indicator', false)
    }
    
    // Apply other filters
    if (severity) {
      query = query.eq('severity', severity)
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1)
    
    const { data: indicators, error, count } = await query.order('created_at', { ascending: false })
    
    if (error) {
      console.error('Erro ao buscar indicadores:', error)
      return Response.json({ 
        error: 'Falha ao buscar indicadores',
        details: error.message 
      }, { status: 500 })
    }
    
    // Get total count for pagination
    let countQuery = supabase
      .from('powershell_signatures')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
    
    if (!isPremiumUser) {
      countQuery = countQuery.eq('is_premium_indicator', false)
    }
    
    if (severity) {
      countQuery = countQuery.eq('severity', severity)
    }
    
    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }
    
    const { count: totalCount, error: countError } = await countQuery
    
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
      },
      user: {
        isAuthenticated: !!session,
        isPremium: isPremiumUser
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

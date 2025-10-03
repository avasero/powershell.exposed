import { supabase } from '../../../../lib/supabase'

export async function GET(request, { params }) {
  try {
    const { id } = params
    
    if (!id) {
      return Response.json({ 
        error: 'Indicator ID is required' 
      }, { status: 400 })
    }
    
    // Buscar indicador específico
    const { data: indicator, error } = await supabase
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
      .eq('id', id)
      .eq('is_active', true)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return Response.json({ 
          error: 'Indicator not found' 
        }, { status: 404 })
      }
      
      console.error('Error fetching indicator:', error)
      return Response.json({ 
        error: 'Failed to fetch indicator',
        details: error.message 
      }, { status: 500 })
    }
    
    return Response.json({
      indicator: indicator || null
    })
    
  } catch (error) {
    console.error('Internal error:', error)
    return Response.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

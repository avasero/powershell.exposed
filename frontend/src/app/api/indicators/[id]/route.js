import { supabase } from '../../../../lib/supabase'

export async function GET(request, { params }) {
  try {
    const { id } = params
    
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
        link,
        last_modified_by,
        last_modified_by_avatar
      `)
      .eq('id', id)
      .single()
    
    if (error) {
      console.error('Erro ao buscar indicador:', error)
      return Response.json({ 
        error: 'Indicator not found',
        details: error.message 
      }, { status: 404 })
    }
    
    return Response.json({
      success: true,
      indicator
    })
    
  } catch (error) {
    console.error('Erro interno:', error)
    return Response.json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    }, { status: 500 })
  }
}

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
      .from('public_indicators')
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
        file_path,
        last_modified_by,
        last_modified_by_avatar,
        merger,
        merger_avatar,
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
      // Build a search string for OR conditions
      let searchFields = [
        `name.ilike.%${search}%`,
        `description.ilike.%${search}%`,
        `severity.ilike.%${search}%`,
        `last_modified_by.ilike.%${search}%`
      ];

      // If search is a number, also check basescore
      if (!isNaN(parseFloat(search)) && isFinite(search)) {
        searchFields.push(`basescore.eq.${search}`);
      }

      query = query.or(searchFields.join(','));
    }

    // Apply sorting
    const sortBy = searchParams.get('sortBy');
    const order = searchParams.get('order');

    // Map frontend field names to database columns
    // Note: 'severity_order' is a generated column for proper ordering (CRITICAL=1, HIGH=2, MEDIUM=3, LOW=4, INFORMATIONAL=5)
    const sortMapping = {
      'name': 'name',
      'severity': 'severity_order',
      'basescore': 'basescore',
      'description': 'description',
      'last_modified_by': 'last_modified_by',
      'merger': 'merger',
      'last_modification': 'updated_at'
    };

    if (sortBy && order) {
      
      const sortFields = sortBy.split(',');
      const sortOrders = order.split(',');

      sortFields.forEach((field, index) => {
        const trimmedField = field.trim();
        const fieldOrder = (sortOrders[index] || sortOrders[0] || 'asc').trim();
        const dbField = sortMapping[trimmedField] || trimmedField;

        // Invert order for severity_order since CRITICAL=1, INFORMATIONAL=5
        
        const isAscending = trimmedField === 'severity'
          ? fieldOrder === 'desc'  
          : fieldOrder === 'asc';

        query = query.order(dbField, { ascending: isAscending });
      });
    } else {
      query = query.order('severity_order', { ascending: true });
      query = query.order('updated_at', { ascending: false });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: indicators, error, count } = await query

    if (error) {
      console.error('Erro ao buscar indicadores:', error)
      return Response.json({
        error: 'Falha ao buscar indicadores',
        details: error.message
      }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('public_indicators')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    if (!isPremiumUser) {
      countQuery = countQuery.eq('is_premium_indicator', false)
    }

    if (severity) {
      countQuery = countQuery.eq('severity', severity)
    }

    if (search) {
      // Build a search string for OR conditions (same as in data query)
      let searchFields = [
        `name.ilike.%${search}%`,
        `description.ilike.%${search}%`,
        `severity.ilike.%${search}%`,
        `last_modified_by.ilike.%${search}%`
      ];

      if (!isNaN(parseFloat(search)) && isFinite(search)) {
        searchFields.push(`basescore.eq.${search}`);
      }

      countQuery = countQuery.or(searchFields.join(','));
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

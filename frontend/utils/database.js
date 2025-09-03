import { supabase } from '../lib/supabase';

// Função para salvar análise de PowerShell
export const savePowerShellAnalysis = async (analysisData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase
      .from('powershell_analyses')
      .insert([
        {
          user_id: user.id,
          command: analysisData.command,
          analysis_result: analysisData.analysis_result,
          risk_score: analysisData.risk_score,
          signatures_detected: analysisData.signatures_detected || [],
          decoded_command: analysisData.decoded_command || null,
          signature_file: analysisData.signature_file || 'yaml_signatures',
          tactics: analysisData.tactics || [],
          techniques: analysisData.techniques || [],
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Erro ao salvar análise:', error);
    throw error;
  }
};

// Função para buscar análises do usuário
export const getUserAnalyses = async (limit = 20, offset = 0) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase
      .from('powershell_analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar análises:', error);
    throw error;
  }
};

// Função para buscar TODAS as análises do usuário (para o dashboard)
export const getAllUserAnalyses = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase
      .from('powershell_analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar todas as análises:', error);
    throw error;
  }
};

// Função para buscar as últimas 5 análises do usuário (para o chat lateral)
export const getRecentUserAnalysesForChat = async (limit = 5) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    console.log('🔍 Fetching recent analyses for user:', user.id);

    const { data, error } = await supabase
      .from('powershell_analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }
    
    console.log('📊 Raw data from Supabase:', data);
    console.log('📊 Sample record structure:', data?.[0]);
    
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar análises recentes para chat:', error);
    throw error;
  }
};

// Função para deletar as últimas 5 análises do usuário (mantida para compatibilidade, mas não será usada no chat)
export const deleteRecentAnalyses = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Buscar as 5 análises mais recentes
    const { data: recentAnalyses, error: fetchError } = await supabase
      .from('powershell_analyses')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (fetchError) throw fetchError;

    if (!recentAnalyses || recentAnalyses.length === 0) {
      return { success: true, message: 'No analyses to delete' };
    }

    // Extrair IDs das análises
    const idsToDelete = recentAnalyses.map(analysis => analysis.id);

    // Deletar as análises
    const { error: deleteError } = await supabase
      .from('powershell_analyses')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) throw deleteError;

    return { success: true, deletedCount: recentAnalyses.length };
  } catch (error) {
    console.error('Erro ao deletar análises:', error);
    throw error;
  }
};

// Função para buscar análise por ID
export const getAnalysisById = async (analysisId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Se não logado, tentar usar a API backend para análises públicas
      try {
        const { getAnalysisById: getPublicAnalysis } = await import('../lib/supabase');
        return await getPublicAnalysis(analysisId);
      } catch (backendError) {
        throw new Error('Usuário não autenticado e não foi possível acessar análise pública');
      }
    }

    // Se logado, buscar no banco com filtro de usuário
    const { data, error } = await supabase
      .from('powershell_analyses')
      .select('*')
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      // Se não encontrou com filtro de usuário, pode ser que a análise seja pública
      // Tentar buscar sem filtro de usuário
      const { data: publicData, error: publicError } = await supabase
        .from('powershell_analyses')
        .select('*')
        .eq('id', analysisId)
        .single();
      
      if (publicError) {
        throw error; // Usar o erro original
      }
      
      return publicData;
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao buscar análise:', error);
    throw error;
  }
};

// Função para deletar análise
export const deleteAnalysis = async (analysisId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const { error } = await supabase
      .from('powershell_analyses')
      .delete()
      .eq('id', analysisId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao deletar análise:', error);
    throw error;
  }
};

// Função para atualizar perfil do usuário
export const updateUserProfile = async (profileData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert([
        {
          id: user.id,
          username: profileData.username,
          full_name: profileData.full_name,
          avatar_url: profileData.avatar_url,
          updated_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    throw error;
  }
};

// Função para buscar perfil do usuário
export const getUserProfile = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    throw error;
  }
};

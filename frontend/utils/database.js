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
          severity: analysisData.severity,
          signatures_detected: analysisData.signatures_detected || [],
          decoded_command: analysisData.decoded_command || null,
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
    return data;
  } catch (error) {
    console.error('Erro ao buscar análises:', error);
    throw error;
  }
};

// Função para buscar análise por ID
export const getAnalysisById = async (analysisId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase
      .from('powershell_analyses')
      .select('*')
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
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

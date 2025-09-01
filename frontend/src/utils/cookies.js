// Utilitário para gerenciar cookies de análises anônimas

const COOKIE_NAME = 'anonymous_analyses';
const MAX_ANALYSES = 10; // Máximo de análises anônimas armazenadas

// Função para obter análises anônimas dos cookies
export const getAnonymousAnalyses = () => {
  try {
    if (typeof document === 'undefined') {

      return [];
    }
    
   
    
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith(COOKIE_NAME + '='));
    
    if (!cookie) {
    
      return [];
    }
    
   
    
    const value = cookie.split('=')[1];
   
    
    const decodedValue = decodeURIComponent(value);
    
    
    const parsedData = JSON.parse(decodedValue);
   
    
    return parsedData;
  } catch (error) {
    console.error('❌ Erro ao ler análises anônimas dos cookies:', error);
    console.error('❌ Stack trace:', error.stack);
    return [];
  }
};

// Função para salvar uma nova análise anônima
export const saveAnonymousAnalysis = (analysis) => {
  try {
   
    
    if (typeof document === 'undefined') return;
    
    const analyses = getAnonymousAnalyses();
   
    
    // Criar objeto de análise anônima (versão compacta para economizar espaço)
    const anonymousAnalysis = {
      id: analysis.analysis_id || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Usar analysis_id se disponível
      command: analysis.command,
      score: analysis.score || 0,
      severity: analysis.severity || 'unknown',
      // Manter apenas informações essenciais das signatures para economizar espaço
      signatures: (analysis.signatures || []).map(sig => ({
        name: sig.name || 'Unknown',
        score: sig.score || sig.total_score || 0,
        severity: sig.severity || 'unknown'
      })),
      // Manter apenas informações essenciais dos cmdlets
      cmdlets_detected: (analysis.cmdlets_detected || []).map(cmdlet => ({
        alias: cmdlet.alias || 'Unknown',
        cmdlet_name: cmdlet.cmdlet_name || 'Unknown'
      })),
      created_at: new Date().toISOString(),
      is_anonymous: true,
      analysis_id: analysis.analysis_id // Armazenar o ID da análise para links compartilháveis
    };
    
   
    
    // Adicionar nova análise no início da lista
    analyses.unshift(anonymousAnalysis);
    
    // Manter apenas as últimas MAX_ANALYSES análises
    if (analyses.length > MAX_ANALYSES) {
      analyses.splice(MAX_ANALYSES);
    }
    
    
    // Verificar se o cookie não ficará muito grande (limite de 4KB)
    const cookieData = JSON.stringify(analyses);
    const cookieSize = cookieData.length;
    
   
    
    if (cookieSize > 4000) {
      console.warn('⚠️ Cookie muito grande, removendo análises mais antigas');
      // Remover análises mais antigas até o cookie ficar menor que 4KB
      while (analyses.length > 1 && cookieSize > 4000) {
        analyses.pop(); // Remove a análise mais antiga
        const newCookieData = JSON.stringify(analyses);
        cookieSize = newCookieData.length;
      }
     
    }
    
    // Salvar no cookie (expira em 30 dias)
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    
    const finalCookieData = JSON.stringify(analyses);
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(finalCookieData)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
    
   
    
    // Verificar se foi salvo corretamente
    const savedAnalyses = getAnonymousAnalyses();
   
    
    // Verificar se a análise foi realmente salva
    const savedAnalysis = savedAnalyses.find(a => a.id === anonymousAnalysis.id);
    if (savedAnalysis) {

    } else {
      console.warn('⚠️ Análise não foi encontrada após salvamento');
    }
    
    return anonymousAnalysis;
  } catch (error) {
    console.error('❌ Erro ao salvar análise anônima:', error);
    console.error('❌ Stack trace:', error.stack);
    return null;
  }
};

// Função para deletar uma análise anônima específica
export const deleteAnonymousAnalysis = (analysisId) => {
  try {
    if (typeof document === 'undefined') return false;
    
    const analyses = getAnonymousAnalyses();
    const filteredAnalyses = analyses.filter(analysis => analysis.id !== analysisId);
    
    if (filteredAnalyses.length === analyses.length) {
      return false; // Análise não encontrada
    }
    
    // Atualizar cookie
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(filteredAnalyses))}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
    
    return true;
  } catch (error) {
    console.error('Erro ao deletar análise anônima:', error);
    return false;
  }
};

// Função para limpar todas as análises anônimas
export const clearAnonymousAnalyses = () => {
  try {
    if (typeof document === 'undefined') return;
    
    // Definir cookie com data de expiração no passado
    document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  } catch (error) {
    console.error('Erro ao limpar análises anônimas:', error);
  }
};

// Função para obter estatísticas das análises anônimas
export const getAnonymousAnalysesStats = () => {
  try {
    const analyses = getAnonymousAnalyses();
    
    if (analyses.length === 0) {
      return {
        total: 0,
        averageScore: 0,
        severityBreakdown: {},
        recentActivity: false
      };
    }
    
    const total = analyses.length;
    const totalScore = analyses.reduce((sum, analysis) => sum + (analysis.score || 0), 0);
    const averageScore = totalScore / total;
    
    const severityBreakdown = analyses.reduce((acc, analysis) => {
      const severity = analysis.severity || 'unknown';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {});
    
    // Verificar se há atividade recente (últimas 24 horas)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivity = analyses.some(analysis => 
      new Date(analysis.created_at) > oneDayAgo
    );
    
    return {
      total,
      averageScore: Math.round(averageScore * 10) / 10,
      severityBreakdown,
      recentActivity
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas das análises anônimas:', error);
    return {
      total: 0,
      averageScore: 0,
      severityBreakdown: {},
      recentActivity: false
    };
  }
};

// Função de debug para verificar o estado dos cookies
export const debugCookies = () => {
  try {
    if (typeof document === 'undefined') {
     
      return;
    }
    
    
    
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith(COOKIE_NAME + '='));
    
    if (!cookie) {

      return;
    }
    
    const value = cookie.split('=')[1];
    const decodedValue = decodeURIComponent(value);
    const parsedData = JSON.parse(decodedValue);
    
   
    
    
    if (parsedData.length > 0) {
     
    }
    
    
  } catch (error) {
    console.error('❌ Erro no debug dos cookies:', error);
  }
};

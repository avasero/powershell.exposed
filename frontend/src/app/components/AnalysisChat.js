"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { useAnalysisDrawer } from "../contexts/AnalysisDrawerContext";
import { getUserAnalyses, deleteRecentAnalyses, getAllUserAnalyses, getRecentUserAnalysesForChat } from "../../../utils/database";
import { getAnonymousAnalyses, clearAnonymousAnalyses, deleteAnonymousAnalysis, debugCookies } from "../../utils/cookies";
import SeverityBadge from "./SeverityBadge";

export default function AnalysisChat() {
  const { isAuthenticated, user } = useAuth();
  const { isAnalysisDrawerOpen, closeAnalysisDrawer } = useAnalysisDrawer();
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const router = useRouter();

  useEffect(() => {
    
    
    if (isAuthenticated()) {
     
      setIsAnonymous(false);
      loadRecentAnalyses();
    } else {
      
      setIsAnonymous(true);
      loadAnonymousAnalyses();
    }
  }, [isAuthenticated, user]);

 
  useEffect(() => {
    
    
    if (isAuthenticated() && user) {
      
      setIsAnonymous(false);
      // Aguardar um pouco para dar tempo da migração acontecer
      setTimeout(() => {
        loadRecentAnalyses();
      }, 1000);
    }
  }, [user?.id, isAuthenticated, user]); // Observar mudanças no ID do usuário

  // Atualizar timestamps a cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Atualizar a cada 60 segundos

    return () => clearInterval(interval);
  }, []);

  const loadRecentAnalyses = async () => {
    try {
      setLoading(true);
      
      
      // Carregar apenas as últimas 5 análises do usuário para o chat
      const data = await getRecentUserAnalysesForChat(5);
     
      
      setAnalyses(data || []);
     
    } catch (err) {
      
      setAnalyses([]);
    } finally {
      setLoading(false);
     
    }
  };

  const loadAnonymousAnalyses = () => {
    try {
      
      setLoading(true);
      
      const data = getAnonymousAnalyses();
      
      
      // Limitar a apenas as últimas 5 análises para o chat
      const limitedData = data.slice(0, 5);

      
      setAnalyses(limitedData);
      
    } catch (err) {
      console.error('❌ Error loading anonymous analyses:', err);
      console.error('❌ Stack trace:', err.stack);
      setAnalyses([]);
    } finally {
      setLoading(false);
      
    }
  };

  const handleAnalysisClick = (command, analysisId = null) => {
    closeAnalysisDrawer();
    
    // Se temos um ID da análise, usar a página específica da análise
    if (analysisId && analysisId !== 'anon_' && !analysisId.startsWith('anon_')) {
      router.push(`/analysis/${analysisId}`);
    } else {
      // Fallback para o método antigo se não temos ID válido
      const encodedCommand = encodeURIComponent(command);
      router.push(`/analysis?cmd=${encodedCommand}`);
    }
  };

  const handleDeleteRecentAnalyses = async () => {
    if (isAnonymous) {
      // Para usuários anônimos: limpar cookies
      if (!confirm('Are you sure you want to clear all anonymous analyses from cookies? This will remove all stored analyses (not just the 5 shown here) and cannot be undone.')) {
        return;
      }
      
      try {
        setDeleting(true);
        clearAnonymousAnalyses();
        setAnalyses([]);
      } catch (err) {
        console.error('Error clearing anonymous analyses:', err);
        alert('Error clearing analyses. Please try again.');
      } finally {
        setDeleting(false);
      }
    } else {
      // Para usuários logados: apenas limpar o estado local (não deletar do banco)
      if (!confirm('Are you sure you want to clear all analyses from this chat view? All your analyses will remain safely saved in your account and will reappear when you refresh the page.')) {
        return;
      }
      
      try {
        setDeleting(true);
        // Apenas limpar o estado local - não deletar do banco
        setAnalyses([]);
        
      } catch (err) {
        console.error('Error clearing chat:', err);
        alert('Error clearing chat. Please try again.');
      } finally {
        setDeleting(false);
      }
    }
  };

  const truncateCommand = (command, maxLength = 40) => {
    if (command.length <= maxLength) return command;
    return command.substring(0, maxLength) + '...';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    
    try {
      // Tentar diferentes formatos de data
      let date;
      
      // Se já é um objeto Date
      if (dateString instanceof Date) {
        date = dateString;
      }
      // Se é string ISO ou timestamp
      else if (typeof dateString === 'string' || typeof dateString === 'number') {
        date = new Date(dateString);
      }
      else {
        return 'Invalid date';
      }
      
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return 'Invalid date';
      }
      
      const now = currentTime;
      const diffInMs = now - date;
      
      // Se a diferença for negativa (data no futuro), pode ser problema de timezone
      if (diffInMs < 0) {
        // Se for diferença pequena (menos de 5 minutos), considerar como "Just now"
        if (Math.abs(diffInMs) < 5 * 60 * 1000) {
          return 'Just now';
        }
        console.warn('Date in future detected:', dateString, 'diff:', diffInMs);
        return 'Just now';
      }
      
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInHours < 24) return `${diffInHours}h ago`;
      if (diffInDays === 1) return 'Yesterday';
      if (diffInDays < 7) return `${diffInDays} days ago`;
      
      // Para datas mais antigas, mostrar formato completo
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Error';
    }
  };

  // Sempre mostrar o chat, mesmo para usuários anônimos

  // Componente de conteúdo reutilizável
  const AnalysisChatContent = () => (
    <>
      <div className="p-4 border-b flex-shrink-0" style={{borderColor: 'var(--border-color)'}}>
        <div className="flex items-center justify-between">
          <div>
                                     <h2 className="font-mono font-semibold text-lg" style={{color: 'var(--accent)'}}>
              {isAnonymous ? 'Recent Evaluations' : 'Recent Evaluations'}
            </h2>
            <p className="font-mono text-xs mt-1" style={{color: 'var(--muted-foreground)'}}>
              {isAnonymous ? 'Last 5 evaluations (stored in cookies)' : 'Last 5 evaluations from your account'}
            </p>
             {isAnonymous && (
               <div className="flex items-center gap-2">
                 
                                
               </div>
             )}
          </div>
          {analyses.length > 0 && (
            <button
              onClick={handleDeleteRecentAnalyses}
              disabled={deleting}
              className="p-2 rounded-md transition-colors font-mono text-xs"
              style={{
                color: deleting ? 'var(--muted-foreground)' : '#EF4444',
                backgroundColor: deleting ? 'var(--muted)' : 'transparent'
              }}
              onMouseEnter={(e) => !deleting && (e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)')}
              onMouseLeave={(e) => !deleting && (e.target.style.backgroundColor = 'transparent')}
                             title={isAnonymous ? "Clear all anonymous analyses from cookies" : "Clear recent analyses from chat view (keeps safely saved in account)"}
             >
               {deleting ? (isAnonymous ? 'Clearing...' : 'Clearing...') : (isAnonymous ? 'Clear' : 'Clear')}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden analysis-chat-scroll">
        <div className="min-h-[740px]">
          {loading ? (
            <div className="p-4 min-h-full">
              <div className="animate-pulse space-y-3 min-h-full flex flex-col">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-16 rounded flex-shrink-0" style={{backgroundColor: 'var(--muted)'}}></div>
                ))}
              </div>
            </div>
          ) : analyses.length === 0 ? (
            <div className="p-4 min-h-full flex flex-col justify-center">
              <div className="text-center">
                <p className="font-mono text-sm mb-4" style={{color: 'var(--muted-foreground)'}}>
                  {isAnonymous ? 'No anonymous analyses yet' : 'No analyses to show'}
                </p>
                <p className="font-mono text-xs" style={{color: 'var(--muted-foreground)'}}>
                  {isAnonymous ? 'Run your first analysis to see it here' : 'Run an analysis or refresh to reload from your account'}
                </p>
                {isAnonymous && (
                  <p className="font-mono text-xs mt-2" style={{color: 'var(--accent)'}}>
                    Analyses are stored locally in cookies
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-2">
              {analyses.map((analysis) => (
              <div
                key={analysis.id}
                onClick={() => handleAnalysisClick(analysis.command, analysis.analysis_id || analysis.id)}
                className="p-3 mb-2 rounded-lg border cursor-pointer transition-all duration-200 hover:opacity-80"
                style={{
                  backgroundColor: 'var(--card-bg)', 
                  borderColor: 'var(--border-color)'
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <SeverityBadge score={(analysis.risk_score ?? analysis.score ?? analysis.analysis_result?.risk_score ?? 0)} size="sm" />
                    {isAnonymous && analysis.is_anonymous && (
                      <span className="px-2 py-1 rounded text-xs font-mono bg-blue-900/30 text-blue-400 border border-blue-800">
                        Anonymous
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs" style={{color: 'var(--muted-foreground)'}}>
                    {formatDate(analysis.created_at)}
                  </span>
                </div>
                
                <div className="mb-2">
                  <p className="font-mono text-sm font-medium leading-tight" style={{color: 'var(--foreground)'}}>
                    {truncateCommand(analysis.command)}
                  </p>
                </div>

                {/* Cmdlets detected */}
                {analysis.cmdlets_detected && Array.isArray(analysis.cmdlets_detected) && analysis.cmdlets_detected.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {analysis.cmdlets_detected.slice(0, 2).map((cmdlet, index) => {
                      const displayName = cmdlet.alias || 'Unknown';
                      const shortName = displayName.length > 12 ? displayName.substring(0, 12) + '...' : displayName;
                      
                      return (
                        <span
                          key={index}
                          className="px-2 py-1 rounded text-xs font-mono bg-blue-900/30 text-blue-400 border border-blue-800"
                          title={`${cmdlet.alias} → ${cmdlet.cmdlet_name}`}
                        >
                          {shortName}
                        </span>
                      );
                    })}
                    {analysis.cmdlets_detected.length > 2 && (
                      <span className="px-2 py-1 rounded text-xs font-mono" style={{backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)'}}>
                        +{analysis.cmdlets_detected.length - 2} cmdlets
                      </span>
                    )}
                  </div>
                )}

                {(analysis.signatures_detected || analysis.signatures) && Array.isArray(analysis.signatures_detected || analysis.signatures) && (analysis.signatures_detected || analysis.signatures).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {(analysis.signatures_detected || analysis.signatures).slice(0, 2).map((sig, index) => {
                      // Verificar se sig é um objeto ou string e extrair o nome
                      let sigName = '';
                      if (typeof sig === 'object' && sig !== null) {
                        sigName = sig.name || sig.keyword || 'Unknown';
                      } else if (typeof sig === 'string') {
                        sigName = sig;
                      } else {
                        sigName = 'Unknown';
                      }
                      
                      const displayName = sigName.length > 15 ? sigName.substring(0, 15) + '...' : sigName;
                      
                      return (
                        <span
                          key={index}
                          className="px-2 py-1 rounded text-xs font-mono bg-red-900/30 text-red-400 border border-red-800"
                        >
                          {displayName}
                        </span>
                      );
                    })}
                    {(analysis.signatures_detected || analysis.signatures).length > 2 && (
                      <span className="px-2 py-1 rounded text-xs font-mono" style={{backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)'}}>
                        +{(analysis.signatures_detected || analysis.signatures).length - 2} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop - Chat lateral fixo */}
      <div className="hidden md:flex md:w-80 h-full border-r flex-col flex-shrink-0" style={{borderColor: 'var(--border-color)', backgroundColor: 'var(--background)'}}>
        <AnalysisChatContent />
      </div>

      {/* Mobile - Drawer sobreposto */}
      {isAnalysisDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={closeAnalysisDrawer}
          />
          
          {/* Drawer */}
          <div className="absolute left-0 top-0 h-full w-3/4 border-r flex flex-col" style={{backgroundColor: 'var(--background)', borderColor: 'var(--border-color)'}}>
            {/* Header com botão de fechar */}
            <div className="p-4 border-b flex items-center justify-between" style={{borderColor: 'var(--border-color)'}}>
              <div>
                                                 <h2 className="font-mono font-semibold text-lg" style={{color: 'var(--accent)'}}>
                  {isAnonymous ? 'Recent Analyses' : 'All Your Analyses'}
                </h2>
               {analyses.length > 0 && (
                 <button
                   onClick={handleDeleteRecentAnalyses}
                   disabled={deleting}
                   className="font-mono text-xs mt-1 transition-colors"
                   style={{
                     color: deleting ? 'var(--muted-foreground)' : '#EF4444'
                   }}
                 >
                   {deleting ? (isAnonymous ? 'Clearing...' : 'Clearing...') : (isAnonymous ? 'Clear all' : 'Clear all')}
                 </button>
               )}
              </div>
              <button
                onClick={closeAnalysisDrawer}
                className="p-2 rounded-md transition-colors"
                style={{color: 'var(--accent)'}}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--muted)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto analysis-chat-scroll">
              <div className="p-2 min-h-full">
                <div className="min-h-full">
                  {loading ? (
                    <div className="p-4 min-h-full">
                      <div className="animate-pulse space-y-3 min-h-full flex flex-col">
                        {[...Array(8)].map((_, i) => (
                          <div key={i} className="h-16 rounded flex-shrink-0" style={{backgroundColor: 'var(--muted)'}}></div>
                        ))}
                      </div>
                    </div>
                  ) : analyses.length === 0 ? (
                    <div className="p-4 min-h-full flex flex-col justify-center">
                      <div className="text-center">
                        <p className="font-mono text-sm mb-4" style={{color: 'var(--muted-foreground)'}}>
                          {isAnonymous ? 'No anonymous analyses yet' : 'No analyses to show'}
                        </p>
                        <p className="font-mono text-xs" style={{color: 'var(--muted-foreground)'}}>
                          {isAnonymous ? 'Run your first analysis to see it here' : 'Run an analysis or refresh to reload from your account'}
                        </p>
                        {isAnonymous && (
                          <p className="font-mono text-xs mt-2" style={{color: 'var(--accent)'}}>
                            Analyses are stored locally in cookies
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    analyses.map((analysis) => (
                    <div
                      key={analysis.id}
                      onClick={() => handleAnalysisClick(analysis.command, analysis.analysis_id || analysis.id)}
                      className="p-3 mb-2 rounded-lg border cursor-pointer transition-all duration-200 hover:opacity-80"
                      style={{
                        backgroundColor: 'var(--card-bg)', 
                        borderColor: 'var(--border-color)'
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <SeverityBadge score={(analysis.risk_score ?? analysis.score ?? analysis.analysis_result?.risk_score ?? 0)} size="sm" />
                          {isAnonymous && analysis.is_anonymous && (
                            <span className="px-2 py-1 rounded text-xs font-mono bg-blue-900/30 text-blue-400 border border-blue-800">
                              Anonymous
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-xs" style={{color: 'var(--muted-foreground)'}}>
                          {formatDate(analysis.created_at)}
                        </span>
                      </div>
                      
                      <div className="mb-2">
                        <p className="font-mono text-sm font-medium leading-tight" style={{color: 'var(--foreground)'}}>
                          {truncateCommand(analysis.command)}
                        </p>
                      </div>

                      {/* Cmdlets detected */}
                      {analysis.cmdlets_detected && Array.isArray(analysis.cmdlets_detected) && analysis.cmdlets_detected.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {analysis.cmdlets_detected.slice(0, 2).map((cmdlet, index) => {
                            const displayName = cmdlet.alias || 'Unknown';
                            const shortName = displayName.length > 12 ? displayName.substring(0, 12) + '...' : displayName;
                            
                            return (
                              <span
                                key={index}
                                className="px-2 py-1 rounded text-xs font-mono bg-blue-900/30 text-blue-400 border border-blue-800"
                                title={`${cmdlet.alias} → ${cmdlet.cmdlet_name}`}
                              >
                                {shortName}
                              </span>
                            );
                          })}
                          {analysis.cmdlets_detected.length > 2 && (
                            <span className="px-2 py-1 rounded text-xs font-mono" style={{backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)'}}>
                              +{analysis.cmdlets_detected.length - 2} cmdlets
                            </span>
                          )}
                        </div>
                      )}

                      {(analysis.signatures_detected || analysis.signatures) && Array.isArray(analysis.signatures_detected || analysis.signatures) && (analysis.signatures_detected || analysis.signatures).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(analysis.signatures_detected || analysis.signatures).slice(0, 2).map((sig, index) => {
                            let sigName = '';
                            if (typeof sig === 'object' && sig !== null) {
                              sigName = sig.name || sig.keyword || 'Unknown';
                            } else if (typeof sig === 'string') {
                              sigName = sig;
                            } else {
                              sigName = 'Unknown';
                            }
                            
                            const displayName = sigName.length > 15 ? sigName.substring(0, 15) + '...' : sigName;
                            
                            return (
                              <span
                                key={index}
                                className="px-2 py-1 rounded text-xs font-mono bg-red-900/30 text-red-400 border border-red-800"
                              >
                                {displayName}
                              </span>
                            );
                          })}
                          {(analysis.signatures_detected || analysis.signatures).length > 2 && (
                            <span className="px-2 py-1 rounded text-xs font-mono" style={{backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)'}}>
                              +{(analysis.signatures_detected || analysis.signatures).length - 2} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

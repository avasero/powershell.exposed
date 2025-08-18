"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { useAnalysisDrawer } from "../contexts/AnalysisDrawerContext";
import { getUserAnalyses, deleteRecentAnalyses } from "../../../utils/database";
import SeverityBadge from "./SeverityBadge";

export default function AnalysisChat() {
  const { isAuthenticated } = useAuth();
  const { isAnalysisDrawerOpen, closeAnalysisDrawer } = useAnalysisDrawer();
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      loadRecentAnalyses();
    }
  }, [isAuthenticated]);

  const loadRecentAnalyses = async () => {
    try {
      setLoading(true);
      // Carregar apenas as últimas 5 análises
      const data = await getUserAnalyses(5, 0);
      setAnalyses(data);
    } catch (err) {
      console.error('Error loading analyses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalysisClick = (command) => {
    const encodedCommand = encodeURIComponent(command);
    closeAnalysisDrawer();
    router.push(`/analysis?cmd=${encodedCommand}`);
  };

  const handleDeleteRecentAnalyses = async () => {
    if (!confirm('Are you sure you want to delete the last 5 analyses? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      await deleteRecentAnalyses();
      // Recarregar as análises após deletar
      await loadRecentAnalyses();
    } catch (err) {
      console.error('Error deleting analyses:', err);
      alert('Error deleting analyses. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const truncateCommand = (command, maxLength = 40) => {
    if (command.length <= maxLength) return command;
    return command.substring(0, maxLength) + '...';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  if (!isAuthenticated()) {
    return null; // Não mostrar nada se não estiver autenticado
  }

  // Componente de conteúdo reutilizável
  const AnalysisChatContent = () => (
    <>
      <div className="p-4 border-b flex-shrink-0" style={{borderColor: 'var(--border-color)'}}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-mono font-semibold text-lg" style={{color: 'var(--accent)'}}>
              Recent Analyses
            </h2>
            <p className="font-mono text-xs mt-1" style={{color: 'var(--muted-foreground)'}}>
              Last 5 analyses
            </p>
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
              title="Delete last 5 analyses"
            >
              {deleting ? 'Deleting...' : 'Clear'}
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
                  No analyses yet
                </p>
                <p className="font-mono text-xs" style={{color: 'var(--muted-foreground)'}}>
                  Run your first analysis to see it here
                </p>
              </div>
            </div>
          ) : (
            <div className="p-2">
              {analyses.map((analysis) => (
              <div
                key={analysis.id}
                onClick={() => handleAnalysisClick(analysis.command)}
                className="p-3 mb-2 rounded-lg border cursor-pointer transition-all duration-200 hover:opacity-80"
                style={{
                  backgroundColor: 'var(--card-bg)', 
                  borderColor: 'var(--border-color)'
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <SeverityBadge score={(analysis.risk_score ?? analysis.analysis_result?.risk_score ?? 0)} size="sm" />
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

                {analysis.signatures_detected && Array.isArray(analysis.signatures_detected) && analysis.signatures_detected.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {analysis.signatures_detected.slice(0, 2).map((sig, index) => {
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
                    {analysis.signatures_detected.length > 2 && (
                      <span className="px-2 py-1 rounded text-xs font-mono" style={{backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)'}}>
                        +{analysis.signatures_detected.length - 2} more
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
      <div className="hidden md:flex md:w-80 h-full border-r flex-col" style={{borderColor: 'var(--border-color)', backgroundColor: 'var(--background)'}}>
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
                  Recent Analyses
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
                    {deleting ? 'Deleting...' : 'Clear all'}
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
                          No analyses yet
                        </p>
                        <p className="font-mono text-xs" style={{color: 'var(--muted-foreground)'}}>
                          Run your first analysis to see it here
                        </p>
                      </div>
                    </div>
                  ) : (
                    analyses.map((analysis) => (
                    <div
                      key={analysis.id}
                      onClick={() => handleAnalysisClick(analysis.command)}
                      className="p-3 mb-2 rounded-lg border cursor-pointer transition-all duration-200 hover:opacity-80"
                      style={{
                        backgroundColor: 'var(--card-bg)', 
                        borderColor: 'var(--border-color)'
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <SeverityBadge score={(analysis.risk_score ?? analysis.analysis_result?.risk_score ?? 0)} size="sm" />
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

                      {analysis.signatures_detected && Array.isArray(analysis.signatures_detected) && analysis.signatures_detected.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {analysis.signatures_detected.slice(0, 2).map((sig, index) => {
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
                          {analysis.signatures_detected.length > 2 && (
                            <span className="px-2 py-1 rounded text-xs font-mono" style={{backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)'}}>
                              +{analysis.signatures_detected.length - 2} more
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

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { useAnalysisDrawer } from "../contexts/AnalysisDrawerContext";
import { useAnalysisEvent } from "../contexts/AnalysisEventContext";
import { getUserAnalyses, deleteRecentAnalyses, getAllUserAnalyses, getRecentUserAnalysesForChat } from "../../../utils/database";
import { getAnonymousAnalyses, clearAnonymousAnalyses, deleteAnonymousAnalysis, debugCookies } from "../../utils/cookies";
import SeverityBadge from "./SeverityBadge";
import ThemedButton from "./ThemedButton";

export default function AnalysisChat() {
  const { isAuthenticated, user } = useAuth();
  const { isAnalysisDrawerOpen, closeAnalysisDrawer } = useAnalysisDrawer();
  const { analysisCount } = useAnalysisEvent();
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hiddenAnalyses, setHiddenAnalyses] = useState(new Set());
  const [chatHistory, setChatHistory] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const getHiddenAnalysesKey = () => {
    if (isAnonymous) {
      return 'powershell-exposed-hidden-anonymous-analyses';
    } else if (user?.id) {
      return `powershell-exposed-hidden-analyses-${user.id}`;
    }
    return 'powershell-exposed-hidden-analyses-default';
  };

  const loadHiddenAnalyses = () => {
    try {
      const key = getHiddenAnalysesKey();
      const hidden = localStorage.getItem(key);
      if (hidden) {
        const hiddenSet = new Set(JSON.parse(hidden));
        setHiddenAnalyses(hiddenSet);
        return hiddenSet;
      }
    } catch (error) {
      console.error('Error loading hidden analyses:', error);
    }
    const emptySet = new Set();
    setHiddenAnalyses(emptySet);
    return emptySet;
  };

  const saveHiddenAnalyses = (hiddenSet) => {
    try {
      const key = getHiddenAnalysesKey();
      localStorage.setItem(key, JSON.stringify([...hiddenSet]));
    } catch (error) {
      console.error('Error saving hidden analyses:', error);
    }
  };

  const hideAllCurrentAnalyses = () => {
    const newHiddenSet = new Set(hiddenAnalyses);
    analyses.forEach(analysis => {
      const analysisId = analysis.short_id || analysis.uuid || analysis.id;
      if (analysisId) {
        newHiddenSet.add(analysisId);
      }
    });
    setHiddenAnalyses(newHiddenSet);
    saveHiddenAnalyses(newHiddenSet);
    
    setTimeout(() => {
      loadHiddenAnalyses();
    }, 100);
  };

  useEffect(() => {
    const hiddenSet = loadHiddenAnalyses();
    
    if (isAuthenticated() && user) {
      setIsAnonymous(false);
      loadRecentAnalyses(hiddenSet);
    } else if (!isAuthenticated()) {
      setIsAnonymous(true);
      loadAnonymousAnalyses(hiddenSet);
    }
  }, [user?.id]);

  useEffect(() => {
    if (analysisCount > 0) {
      const currentHiddenSet = loadHiddenAnalyses();
      if (isAuthenticated() && !isAnonymous) {
        loadRecentAnalyses(currentHiddenSet);
      } else {
        loadAnonymousAnalyses(currentHiddenSet);
      }
    }
  }, [analysisCount]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  const loadRecentAnalyses = async (hiddenSet = hiddenAnalyses) => {
    
    try {
      setLoading(true);
      
      if (isAuthenticated() && user?.id) {
        const { makeAuthenticatedRequest } = await import('../../lib/api');
        const response = await makeAuthenticatedRequest(`/user-analyses?limit=20&user_id=${user.id}`, {
          method: 'GET'
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        let result;
        try {
          result = await response.json();
        } catch (jsonError) {
          throw new Error('Invalid JSON response');
        }
        const allAnalyses = result.analyses || result || [];
        
        const filteredAnalyses = allAnalyses
          .filter(analysis => {
            const analysisId = analysis.short_id || analysis.uuid || analysis.id;
            const isHidden = hiddenSet.has(analysisId);
            return !isHidden;
          })
          .slice(0, 5);
        
        setAnalyses(filteredAnalyses);
        return;
      }
      
      const { getCurrentSessionId } = await import('../../utils/session');
      const sessionId = getCurrentSessionId();
      
      if (!sessionId) {
        setAnalyses([]);
        return;
      }
      
      const { makeAuthenticatedRequest } = await import('../../lib/api');
      const response = await makeAuthenticatedRequest(`/user-analyses?limit=20`, {
        method: 'GET',
        headers: {
          'X-Session-ID': sessionId,
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      const allAnalyses = result.analyses || result || [];
      
      const filteredAnalyses = allAnalyses
        .filter(analysis => {
          const analysisId = analysis.short_id || analysis.uuid || analysis.id;
          const isHidden = hiddenSet.has(analysisId);
          return !isHidden;
        })
        .slice(0, 5);
      
      setAnalyses(filteredAnalyses);
     
    } catch (err) {
      setAnalyses([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAnonymousAnalyses = (hiddenSet = hiddenAnalyses) => {
    try {
      setLoading(true);
      
      const data = getAnonymousAnalyses();
      
      const filteredData = data
        .filter(analysis => {
          const analysisId = analysis.id;
          return !hiddenSet.has(analysisId);
        })
        .slice(0, 5);
      
      setAnalyses(filteredData);
      
    } catch (err) {
      console.error('❌ [ANALYSIS CHAT] Error loading anonymous analyses:', err);
      setAnalyses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalysisClick = (command, analysisId = null) => {
    closeAnalysisDrawer();
    
    if (analysisId && analysisId !== 'anon_' && !analysisId.startsWith('anon_')) {
      router.push(`/analysis/${analysisId}`);
    } else {
      const encodedCommand = encodeURIComponent(command);
      router.push(`/analysis?cmd=${encodedCommand}`);
    }
  };

  const handleDeleteRecentAnalyses = async () => {
    if (isAnonymous) {
      if (!confirm('Are you sure you want to clear all anonymous analyses from cookies? This will remove all stored analyses (not just the 5 shown here) and cannot be undone.')) {
        return;
      }
      
      try {
        setDeleting(true);
        clearAnonymousAnalyses();
        const key = getHiddenAnalysesKey();
        localStorage.removeItem(key);
        setHiddenAnalyses(new Set());
        setAnalyses([]);
      } catch (err) {
        console.error('Error clearing anonymous analyses:', err);
        alert('Error clearing analyses. Please try again.');
      } finally {
        setDeleting(false);
      }
    } else {
      if (!confirm('Are you sure you want to hide these analyses from the chat view? They will remain safely saved in your account and visible in the history page, but won\'t appear in this chat until you refresh or clear the hidden list.')) {
        return;
      }
      
      try {
        setDeleting(true);
        
        hideAllCurrentAnalyses();
        
        setAnalyses([]);
        
      } catch (err) {
        console.error('Error hiding analyses from chat:', err);
        alert('Error hiding analyses. Please try again.');
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
      let date;
      
      if (dateString instanceof Date) {
        date = dateString;
      }
      else if (typeof dateString === 'string' || typeof dateString === 'number') {
        date = new Date(dateString);
      }
      else {
        return 'Invalid date';
      }
      
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return 'Invalid date';
      }
      
      const now = currentTime;
      const diffInMs = now - date;
      
      if (diffInMs < 0) {
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

  const AnalysisChatContent = () => (
    <>
      <div className="p-4 border-b flex-shrink-0 border-green-500/30 bg-black/80">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-mono font-semibold text-lg" style={{color: 'var(--accent)'}}>
              {isAnonymous ? 'Recent Evaluations' : 'Recent Evaluations'}
            </h2>
            <p className="font-mono text-xs mt-1" style={{color: 'var(--muted-foreground)'}}>
              {isAnonymous ? 'Last 5 evaluations' : 'Last 5 evaluations from your account'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto overflow-x-hidden analysis-chat-scroll">
          <div className="p-2">
            {loading ? (
              <div className="p-4">
                <div className="animate-pulse space-y-3">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-16 rounded flex-shrink-0" style={{backgroundColor: 'var(--muted)'}}></div>
                  ))}
                </div>
              </div>
            ) : analyses.length === 0 ? (
              <div className="p-4 flex flex-col justify-center h-full">
                <div className="text-center rounded-lg border p-6 bg-black/80 border-green-500/30">
                  <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
                    No commands to show
                  </p>
                </div>
              </div>
            ) : (
              analyses.map((analysis) => (
                <div
                  key={analysis.id}
                  onClick={() => handleAnalysisClick(analysis.command, analysis.short_id || analysis.uuid || analysis.id)}
                  className="p-3 mb-2 rounded-lg border cursor-pointer transition-all duration-200 hover:opacity-80 bg-black/80 border-green-500/30"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <SeverityBadge score={(analysis.risk_score ?? analysis.score ?? analysis.analysis_result?.risk_score ?? 0)} size="sm" />
                      {isAnonymous && analysis.is_anonymous && (
                        <span className="px-2 py-1 rounded text-xs font-mono bg-green-900/30 text-green-400 border border-green-800">
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

                  {analysis.cmdlets_detected && Array.isArray(analysis.cmdlets_detected) && analysis.cmdlets_detected.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {analysis.cmdlets_detected.slice(0, 2).map((cmdlet, index) => {
                        const displayName = cmdlet.alias || 'Unknown';
                        const shortName = displayName.length > 12 ? displayName.substring(0, 12) + '...' : displayName;
                        
                        return (
                          <span
                            key={index}
                            className="px-2 py-1 rounded text-xs font-mono bg-green-900/30 text-green-400 border border-green-800"
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
        
        <div className="p-3 flex justify-end gap-3 border-t flex-shrink-0 border-green-500/30 bg-black/80">
          <ThemedButton
            onClick={() => router.push('/history')}
            size="sm"
            variant="ghost"
            title="View full analysis history"
          >
            View all
          </ThemedButton>
          
          <ThemedButton
            onClick={handleDeleteRecentAnalyses}
            disabled={deleting}
            size="sm"
            variant="destructive"
            loading={deleting}
            title={isAnonymous ? "Clear all anonymous analyses from cookies" : "Hide current analyses from chat view (they remain in your account and history page)"}
          >
            {deleting ? (isAnonymous ? 'Clearing...' : 'Hiding...') : (isAnonymous ? 'Clear' : 'Hide from chat')}
          </ThemedButton>
        </div>
      </div>
    </>
  );

  const performAnalysis = async (command) => {
    setIsAnalyzing(true);
    setError("");
    
    const startTime = performance.now();
    
    try {
      const { makeAuthenticatedRequest } = await import('../../lib/api');
      const response = await makeAuthenticatedRequest('/analyze', {
        method: 'POST',
        json: {
          command: command,
          session_id: isAnonymous ? undefined : user?.id,
          is_anonymous: isAnonymous
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      const responseTime = performance.now() - startTime;
      
      const isCacheHit = data.from_cache === true || data.analysis?.cache_info?.cache_hit === true;
      
      if (data.success) {
        const analysisData = data.analysis;
        
        const result = {
          cache_info: {
            is_cache_hit: isCacheHit,
            response_time: responseTime,
            phash: data.analysis?.cache_info?.phash
          }
        };
        
        const newChatEntry = {
          id: Date.now(),
          command: command,
          result: result,
          timestamp: new Date(),
          analysis_id: data.analysis_id,
          is_cache_hit: isCacheHit
        };
        
        setChatHistory(prev => [...prev, newChatEntry]);
        
        if (!isCacheHit) {
          loadRecentAnalyses();
        }
      } else {
        setError(data.message || "Unknown error");
      }
      
    } catch (err) {
      setError("Failed to perform analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <div className="hidden md:flex md:w-80 h-screen border-r flex-col flex-shrink-0 bg-black/80 border-green-500/30">
        <AnalysisChatContent />
      </div>

      {isAnalysisDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={closeAnalysisDrawer}
          />
          
          <div className="absolute left-0 top-0 h-full w-3/4 border-r flex flex-col bg-black/80 border-green-500/30">
            <div className="p-4 border-b flex items-center justify-between border-green-500/30">
              <div>
                <h2 className="font-mono font-semibold text-lg" style={{color: 'var(--accent)'}}>
                  {isAnonymous ? 'Recent Analyses' : 'All Your Analyses'}
                </h2>
                <p className="font-mono text-xs mt-1" style={{color: 'var(--muted-foreground)'}}>
                  {isAnonymous ? 'Last 5 evaluations' : 'Last 5 evaluations from your account'}
                </p>
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
            
            <div className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto analysis-chat-scroll">
                <div className="p-2">
                  <div>
                    {loading ? (
                      <div className="p-4">
                        <div className="animate-pulse space-y-3">
                          {[...Array(8)].map((_, i) => (
                            <div key={i} className="h-16 rounded flex-shrink-0" style={{backgroundColor: 'var(--muted)'}}></div>
                          ))}
                        </div>
                      </div>
                    ) : analyses.length === 0 ? (
                      <div className="p-4 flex flex-col justify-center h-full">
                        <div className="text-center rounded-lg border p-6 bg-black/80 border-green-500/30">
                          <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
                            No commands to show
                          </p>
                        </div>
                      </div>
                    ) : (
                      analyses.map((analysis) => (
                      <div
                        key={analysis.id}
                        onClick={() => handleAnalysisClick(analysis.command, analysis.short_id || analysis.uuid || analysis.id)}
                        className="p-3 mb-2 rounded-lg border cursor-pointer transition-all duration-200 hover:opacity-80 bg-black/80 border-green-500/30"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <SeverityBadge score={(analysis.risk_score ?? analysis.score ?? analysis.analysis_result?.risk_score ?? 0)} size="sm" />
                            {isAnonymous && analysis.is_anonymous && (
                              <span className="px-2 py-1 rounded text-xs font-mono bg-green-900/30 text-green-400 border border-green-800">
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

                        {analysis.cmdlets_detected && Array.isArray(analysis.cmdlets_detected) && analysis.cmdlets_detected.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {analysis.cmdlets_detected.slice(0, 2).map((cmdlet, index) => {
                              const displayName = cmdlet.alias || 'Unknown';
                              const shortName = displayName.length > 12 ? displayName.substring(0, 12) + '...' : displayName;
                              
                              return (
                                <span
                                  key={index}
                                  className="px-2 py-1 rounded text-xs font-mono bg-green-900/30 text-green-400 border border-green-800"
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
              
              <div className="p-4 flex justify-end gap-3 border-t border-green-500/30 bg-black/80">
                <button
                  onClick={() => {
                    closeAnalysisDrawer();
                    router.push('/history');
                  }}
                  className="font-mono text-xs transition-colors hover:opacity-70"
                  style={{color: 'var(--accent)'}}
                  title="View full analysis history"
                >
                  View all
                </button>
                
                {analyses.length > 0 && (
                  <button
                    onClick={handleDeleteRecentAnalyses}
                    disabled={deleting}
                    className="font-mono text-xs transition-colors hover:opacity-70"
                    style={{
                      color: deleting ? 'var(--muted-foreground)' : '#EF4444'
                    }}
                    title={isAnonymous ? "Clear all anonymous analyses from cookies" : "Hide current analyses from chat view (they remain in your account and history page)"}
                  >
                    {deleting ? (isAnonymous ? 'Clearing...' : 'Hiding...') : (isAnonymous ? 'Clear' : 'Hide from chat')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
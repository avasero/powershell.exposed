"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { useAnalysisDrawer } from "../contexts/AnalysisDrawerContext";
import { useAnalysisEvent } from "../contexts/AnalysisEventContext";
import { getAnonymousAnalyses, clearAnonymousAnalyses } from "../../utils/cookies";
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
  const [isRestricted, setIsRestricted] = useState(false);
  const [hiddenAnalyses, setHiddenAnalyses] = useState(new Set());
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
      loadRecentAnalyses(hiddenSet);
    }
  }, [user?.id, isAuthenticated]);

  useEffect(() => {
    if (analysisCount > 0) {
      const currentHiddenSet = loadHiddenAnalyses();
      loadRecentAnalyses(currentHiddenSet);
    }
  }, [analysisCount]);

  const loadRecentAnalyses = async (hiddenSet = hiddenAnalyses) => {
    try {
      setLoading(true);
      setIsRestricted(false);

      // ✅ USUÁRIOS AUTENTICADOS - usar backend
      if (isAuthenticated() && user?.id) {
        const { makeAuthenticatedRequest } = await import('../../lib/api');
        const response = await makeAuthenticatedRequest(`/user-analyses?limit=10`, {
          method: 'GET'
        });

        if (!response.ok) {
          if (response.status === 403) {
            setIsRestricted(true);
            setAnalyses([]);
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        const allAnalyses = result.analyses || [];

        const filteredAnalyses = allAnalyses.filter(analysis => {
          const analysisId = analysis.short_id || analysis.uuid || analysis.id;
          return !hiddenSet.has(analysisId);
        });

        setAnalyses(filteredAnalyses);
        return;
      }

      // 🍪 USUÁRIOS ANÔNIMOS - Restringir
      setIsRestricted(true);
      setAnalyses([]);

    } catch (err) {
      console.error('❌ [ANALYSIS CHAT] Error loading analyses:', err);
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
      if (!confirm('Are you sure you want to clear all anonymous analyses? This cannot be undone.')) {
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
      } finally {
        setDeleting(false);
      }
    } else {
      if (!confirm('Hide these analyses from the chat view? They will remain in your history.')) {
        return;
      }

      try {
        setDeleting(true);
        hideAllCurrentAnalyses();
        setAnalyses([]);
      } catch (err) {
        console.error('Error hiding analyses:', err);
      } finally {
        setDeleting(false);
      }
    }
  };

  const truncateCommand = (command, maxLength = 50) => {
    if (!command) return '';
    if (command.length <= maxLength) return command;
    return command.substring(0, maxLength) + '...';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';

      const now = new Date();
      const diffInMs = now - date;
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return 'Error';
    }
  };

  const AnalysisChatContent = () => (
    <>
      <div className="p-4 border-b flex-shrink-0 border-green-500/30 bg-black/90 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-mono font-bold text-lg flex items-center gap-2" style={{ color: 'var(--accent)' }}>
              {isAnonymous ? 'Recent Evaluations' : 'Your Evaluations'}
            </h2>
            <p className="font-mono text-xs mt-1 opacity-70" style={{ color: 'var(--muted-foreground)' }}>
              {isAnonymous ? '' : 'Synced with your account'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-black/50">
        <div className="flex-1 overflow-y-auto overflow-x-hidden analysis-chat-scroll p-3 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 rounded-lg animate-pulse bg-white/5 border border-white/10"></div>
              ))}
            </div>
          ) : isRestricted ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-80">
              <p className="font-mono text-sm text-white/90 font-bold">
                History Restricted
              </p>
              <p className="text-xs text-white/60 mt-2 mb-4">
                Upgrade your plan to view recent evaluations
              </p>
              <ThemedButton
                onClick={() => router.push('/settings')}
                size="sm"
                className="text-xs"
              >
                View Plans
              </ThemedButton>
            </div>
          ) : analyses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-60">
              <p className="font-mono text-sm text-white/70">
                No recent analyses found
              </p>
              <p className="text-xs text-white/40 mt-2">
                Run a command to see it here
              </p>
            </div>
          ) : (
            analyses.map((analysis) => (
              <div
                key={analysis.id}
                onClick={() => handleAnalysisClick(analysis.command, analysis.short_id || analysis.uuid || analysis.id)}
                className="group relative p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-green-500/50 transition-all duration-200 cursor-pointer overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <SeverityBadge score={(analysis.risk_score ?? analysis.score ?? analysis.analysis_result?.risk_score ?? 0)} size="xs" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
                      {formatDate(analysis.created_at)}
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="font-mono text-sm text-white/90 break-all line-clamp-2 group-hover:text-green-400 transition-colors">
                    {truncateCommand(analysis.command)}
                  </p>
                </div>

                {(analysis.signatures_detected || analysis.signatures || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(analysis.signatures_detected || analysis.signatures).slice(0, 2).map((sig, index) => {
                      const name = typeof sig === 'string' ? sig : (sig.name || sig.keyword || 'Unknown');
                      return (
                        <span
                          key={index}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-500/10 text-red-400 border border-red-500/20"
                        >
                          {name.length > 15 ? name.substring(0, 15) + '...' : name}
                        </span>
                      );
                    })}
                    {(analysis.signatures_detected || analysis.signatures).length > 2 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 text-white/40 border border-white/10">
                        +{(analysis.signatures_detected || analysis.signatures).length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-green-500/30 bg-black/90 backdrop-blur-sm flex justify-between items-center">
          <ThemedButton
            onClick={() => router.push('/history')}
            size="sm"
            variant="ghost"
            className="text-xs"
          >
            View History
          </ThemedButton>

          {analyses.length > 0 && (
            <ThemedButton
              onClick={handleDeleteRecentAnalyses}
              disabled={deleting}
              size="sm"
              variant="destructive"
              className="text-xs opacity-80 hover:opacity-100"
            >
              {deleting ? 'Clearing...' : 'Clear List'}
            </ThemedButton>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="hidden md:flex md:w-80 h-screen border-r flex-col flex-shrink-0 bg-black border-green-500/30">
        <AnalysisChatContent />
      </div>

      {isAnalysisDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={closeAnalysisDrawer}
          />

          <div className="absolute left-0 top-0 h-full w-4/5 max-w-sm border-r flex flex-col bg-black border-green-500/30 shadow-2xl transform transition-transform duration-300 ease-out">
            <AnalysisChatContent />
            <button
              onClick={closeAnalysisDrawer}
              className="absolute top-4 right-4 p-2 text-white/50 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
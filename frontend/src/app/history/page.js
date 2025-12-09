// eslint-disable-line react-hooks/exhaustive-deps
"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { getAllUserAnalyses } from "../../../utils/database";
import { getAnonymousAnalyses } from "../../utils/cookies";
import SeverityBadge from "../components/SeverityBadge";
import LoadingSpinner from "../components/LoadingSpinner";
import ThemedButton from "../components/ThemedButton";
import { FaSortAmountDown, FaSortAmountUp, FaFilter, FaCalendarAlt, FaExclamationTriangle, FaTerminal } from "react-icons/fa";

export default function HistoryPage() {
  const { isAuthenticated, user } = useAuth();
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRestricted, setIsRestricted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [filterTerm, setFilterTerm] = useState("");
  const [sortBy, setSortBy] = useState("date"); // date, score, command
  const [sortOrder, setSortOrder] = useState("desc"); // asc, desc
  const router = useRouter();

  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const LIMIT = 100;
  const hasFetchedRef = useRef(false);
  const lastUserIdRef = useRef(null);

  // Atualizar timestamps a cada 5 minutos (reduzir re-renders)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 300000); // Atualizar a cada 5 minutos

    return () => clearInterval(interval);
  }, []);

  // Carregar análises baseado no status de autenticação
  useEffect(() => {
    // Prevent duplicate fetches for the same user
    const currentUserId = user?.id || 'anonymous';
    if (hasFetchedRef.current && lastUserIdRef.current === currentUserId) {
      return;
    }
    
    // Reset state when auth changes
    setAnalyses([]);
    setOffset(0);
    setHasMore(true);

    hasFetchedRef.current = true;
    lastUserIdRef.current = currentUserId;

    if (isAuthenticated()) {
      loadUserAnalyses(0);
    } else {
      loadAnonymousAnalyses();
    }
  }, [user?.id]); // Only depend on user.id to avoid re-runs

  const loadUserAnalyses = async (currentOffset = 0) => {
    try {
      if (currentOffset === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError("");

      // ✅ FIX: Separar lógica para autenticados vs anônimos
      if (isAuthenticated() && user?.id) {
        // ✅ USUÁRIOS AUTENTICADOS: Buscar do backend
        const { makeAuthenticatedRequest } = await import('../../lib/api');

        const response = await makeAuthenticatedRequest(`/user-analyses?limit=${LIMIT}&offset=${currentOffset}`, {
          method: 'GET'
        });

        if (!response.ok) {
          if (response.status === 403) {
            const data = await response.json();
            if (data.error?.code === 'PlanRestrictionError') {
              setIsRestricted(true);
              setAnalyses([]);
              return;
            }
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        const newAnalyses = result.analyses || [];

        if (currentOffset === 0) {
          setAnalyses(newAnalyses);
        } else {
          setAnalyses(prev => [...prev, ...newAnalyses]);
        }

        setHasMore(result.has_more);
        setOffset(currentOffset + newAnalyses.length);

      } else {
        // 🍪 USUÁRIOS ANÔNIMOS: Usar APENAS cookies (não backend)
        const cookieAnalyses = getAnonymousAnalyses();
        setAnalyses(cookieAnalyses || []);
        setHasMore(false);
      }

    } catch (err) {
      console.error('❌ Error loading analyses:', err);
      setError("Error loading analysis history: " + err.message);
      if (currentOffset === 0) setAnalyses([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadAnonymousAnalyses = () => {
    // Guest/Anonymous users are restricted from history
    setIsRestricted(true);
    setAnalyses([]);
    setLoading(false);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadUserAnalyses(offset);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';

    try {
      let date;

      if (dateString instanceof Date) {
        date = dateString;
      } else if (typeof dateString === 'string' || typeof dateString === 'number') {
        date = new Date(dateString);
      } else {
        return 'Invalid date';
      }

      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }

      const now = currentTime;
      const diffInMs = now - date;

      if (diffInMs < 0) {
        if (Math.abs(diffInMs) < 5 * 60 * 1000) {
          return 'Just now';
        }
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
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Error';
    }
  };

  const truncateCommand = (command, maxLength = 60) => {
    if (command.length <= maxLength) return command;
    return command.substring(0, maxLength) + '...';
  };

  const handleAnalysisClick = (command, analysisId) => {
    // Para análises anônimas, usar query params se não há ID válido
    if (!analysisId || analysisId.startsWith('anon_')) {
      const encodedCommand = encodeURIComponent(command);
      router.push(`/analysis?cmd=${encodedCommand}`);
    } else {
      router.push(`/analysis/${analysisId}`);
    }
  };

  // Filtrar e ordenar análises
  const filteredAndSortedAnalyses = analyses
    .filter(analysis => {
      if (!filterTerm) return true;
      return analysis.command.toLowerCase().includes(filterTerm.toLowerCase());
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "date":
          const dateA = new Date(a.created_at);
          const dateB = new Date(b.created_at);
          comparison = dateB - dateA; // Default desc for dates
          break;
        case "score":
          const scoreA = a.risk_score || a.score || 0;
          const scoreB = b.risk_score || b.score || 0;
          comparison = scoreB - scoreA; // Default desc for scores
          break;
        case "command":
          comparison = a.command.localeCompare(b.command);
          break;
        default:
          return 0;
      }

      return sortOrder === "asc" ? -comparison : comparison;
    });

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
        <LoadingSpinner />
        <p className="font-mono text-sm mt-4" style={{ color: 'var(--muted-foreground)' }}>
          Loading analysis history...
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold mb-2" style={{ color: 'var(--accent)' }}>
          Analysis History
        </h1>
        <p className="font-mono text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {isRestricted
            ? "History is available for upgraded plans only"
            : isAuthenticated()
              ? `View all your saved analyses (${analyses.length} total)`
              : `Anonymous analyses stored locally (${analyses.length} of 10)`}
        </p>
      </div>


      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">

        <div className="flex-1 max-w-md relative">
          <div className="absolute inset-y-0  flex items-center pointer-events-none">
          </div>
          <input
            type="text"
            placeholder="Filter by command..."
            value={filterTerm}
            onChange={(e) => setFilterTerm(e.target.value)}
            className="w-full py-2 pl-10 rounded-lg border font-mono text-sm focus:ring-1 focus:ring-green-500 outline-none transition-all"
            style={{
              backgroundColor: 'var(--card-bg)',
              borderColor: 'var(--border-color)',
              color: 'var(--foreground)'
            }}
          />
        </div>

        <div className="flex gap-2 items-center">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-lg border font-mono text-sm"
            style={{
              backgroundColor: 'var(--card-bg)',
              borderColor: 'var(--border-color)',
              color: 'var(--foreground)'
            }}
          >
            <option value="date">Date</option>
            <option value="score">Risk Score</option>
            <option value="command">Command</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="px-3 py-2 rounded-lg border font-mono text-sm transition-colors flex items-center justify-center min-w-[40px] hover:bg-white/5"
            style={{
              backgroundColor: 'var(--card-bg)',
              borderColor: 'var(--border-color)',
              color: 'var(--foreground)'
            }}
            title={sortOrder === "asc" ? "Ascending" : "Descending"}
          >
            {sortOrder === "asc" ? <FaSortAmountUp /> : <FaSortAmountDown />}
          </button>
        </div>
      </div>


      {
        error && (
          <div className="mb-6 p-4 rounded-lg border border-red-500" style={{ backgroundColor: 'var(--card-bg)' }}>
            <p className="font-mono text-sm text-red-400">{error}</p>
          </div>
        )
      }

      {
        isRestricted ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 border rounded-lg border-dashed" style={{ borderColor: 'var(--border-color)' }}>
            <h2 className="font-mono text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
              History Restricted
            </h2>
            <p className="font-mono text-sm mb-6 text-center max-w-md" style={{ color: 'var(--muted-foreground)' }}>
              Guest users do not have access to evaluation history. <br />
              Please upgrade your plan to view your past analyses.
            </p>
            <ThemedButton onClick={() => router.push('/settings')}>
              Login to see history
            </ThemedButton>
          </div>
        ) : filteredAndSortedAnalyses.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4"></div>
              <h2 className="font-mono text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                {filterTerm ? 'No results found' : 'No analyses found'}
              </h2>
              <p className="font-mono text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>
                {filterTerm
                  ? `No analyses match the filter "${filterTerm}"`
                  : isAuthenticated()
                    ? 'Start by analyzing a PowerShell command'
                    : 'Your anonymous analyses will appear here'}
              </p>
              <ThemedButton onClick={() => router.push('/')}>
                Analyze First Command
              </ThemedButton>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSortedAnalyses.map((analysis) => (
              <div
                key={analysis.id}
                onClick={() => handleAnalysisClick(analysis.command, analysis.short_id || analysis.uuid || analysis.id)}
                className="group relative p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-green-500/50 transition-all duration-200 cursor-pointer overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <SeverityBadge
                      score={analysis.risk_score ?? analysis.score ?? 0}
                      size="xs"
                    />
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

                {!isAuthenticated() && analysis.is_anonymous && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-green-500/10 text-green-400 border border-green-500/20">
                      Anonymous
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      }


      {
        filteredAndSortedAnalyses.length > 0 && (
          <div className="mt-8 flex flex-col items-center gap-4">
            {hasMore && !filterTerm && (
              <ThemedButton
                onClick={handleLoadMore}
                variant="outline"
                disabled={loadingMore}
              >
                {loadingMore ? <LoadingSpinner size="sm" /> : 'Load More'}
              </ThemedButton>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <ThemedButton onClick={() => router.push('/')}>
                New Analysis
              </ThemedButton>
              {!isAuthenticated() && (
                <ThemedButton variant="outline" onClick={() => router.push('/register')}>
                  Create Account to Save History
                </ThemedButton>
              )}
            </div>
          </div>
        )
      }
    </div >
  );
}


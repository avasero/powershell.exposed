"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { getAllUserAnalyses } from "../../../utils/database";
import { getAnonymousAnalyses } from "../../utils/cookies";
import SeverityBadge from "../components/SeverityBadge";
import LoadingSpinner from "../components/LoadingSpinner";
import ThemedButton from "../components/ThemedButton";

export default function HistoryPage() {
  const { isAuthenticated, user } = useAuth();
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [filterTerm, setFilterTerm] = useState("");
  const [sortBy, setSortBy] = useState("date"); // date, score, command
  const [sortOrder, setSortOrder] = useState("desc"); // asc, desc
  const router = useRouter();

  // Atualizar timestamps a cada 5 minutos (reduzir re-renders)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 300000); // Atualizar a cada 5 minutos

    return () => clearInterval(interval);
  }, []);

  // Carregar análises baseado no status de autenticação
  useEffect(() => {
    if (isAuthenticated()) {
      loadUserAnalyses();
    } else {
      loadAnonymousAnalyses();
    }
  }, [isAuthenticated, user]);

  const loadUserAnalyses = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Para usuários logados, usar user_id diretamente
      if (isAuthenticated() && user?.id) {
        console.log('👤 [HISTORY PAGE] Usuário logado - usando user_id:', user.id);
        
        // Carregar análises diretamente do backend Python
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/user-analyses?user_id=${user.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Incluir cookies para autenticação
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('📊 [HISTORY PAGE] Loaded user analyses from backend:', result);
        
        // Processar dados do backend
        const analyses = result.analyses || result || [];
        setAnalyses(analyses);
        return;
      }
      
      // Para usuários anônimos, usar session_id do localStorage
      console.log('👤 [HISTORY PAGE] Usuário anônimo - usando session_id');
      
      // Obter session_id do localStorage
      const { getCurrentSessionId } = await import('../../utils/session');
      const sessionId = getCurrentSessionId();
      
      if (!sessionId) {
        console.log('⚠️ [HISTORY PAGE] Nenhum session_id encontrado, não é possível carregar análises');
        setAnalyses([]);
        return;
      }
      
      console.log('🔍 [HISTORY PAGE] Carregando análises com session_id:', sessionId);
      
      // Carregar análises diretamente do backend Python
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/user-analyses`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId, // Enviar session_id no header
        },
        credentials: 'include', // Incluir cookies para autenticação
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📊 [HISTORY PAGE] Loaded user analyses from backend:', result);
      
      // Processar dados do backend
      const analyses = result.analyses || result || [];
      setAnalyses(analyses);
    } catch (err) {
      setError("Error loading analysis history: " + err.message);
      setAnalyses([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAnonymousAnalyses = () => {
    try {
      setLoading(true);
      setError("");
      const data = getAnonymousAnalyses();
      setAnalyses(data || []);
    } catch (err) {
      setError("Error loading anonymous analyses: " + err.message);
      setAnalyses([]);
    } finally {
      setLoading(false);
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
      
      return sortOrder === "asc" ? comparison : -comparison;
    });

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
        <LoadingSpinner />
        <p className="font-mono text-sm mt-4" style={{color: 'var(--muted-foreground)'}}>
          Loading analysis history...
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold mb-2" style={{color: 'var(--accent)'}}>
          Analysis History
        </h1>
        <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
          {isAuthenticated() 
            ? `View all your saved analyses (${analyses.length} total)`
            : `Anonymous analyses stored locally (${analyses.length} of 10)`}
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search Filter */}
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Filter by command..."
            value={filterTerm}
            onChange={(e) => setFilterTerm(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border font-mono text-sm"
            style={{
              backgroundColor: 'var(--card-bg)',
              borderColor: 'var(--border-color)',
              color: 'var(--foreground)'
            }}
          />
        </div>

        {/* Sort Controls */}
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
            className="px-3 py-2 rounded-lg border font-mono text-sm transition-colors"
            style={{
              backgroundColor: 'var(--card-bg)',
              borderColor: 'var(--border-color)',
              color: 'var(--foreground)'
            }}
          >
            {sortOrder === "asc" ? "↑" : "↓"}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 rounded-lg border border-red-500" style={{backgroundColor: 'var(--card-bg)'}}>
          <p className="font-mono text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Analyses Grid */}
      {filteredAndSortedAnalyses.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="font-mono text-xl font-bold mb-2" style={{color: 'var(--foreground)'}}>
              {filterTerm ? 'No results found' : 'No analyses found'}
            </h2>
            <p className="font-mono text-sm mb-6" style={{color: 'var(--muted-foreground)'}}>
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
              onClick={() => handleAnalysisClick(analysis.command, analysis.uuid || analysis.id)}
              className="p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:opacity-80 hover:scale-[1.02]"
              style={{
                backgroundColor: 'var(--card-bg)', 
                borderColor: 'var(--border-color)'
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <SeverityBadge 
                  score={analysis.risk_score ?? analysis.score ?? 0} 
                  size="sm" 
                />
                <span className="font-mono text-xs" style={{color: 'var(--muted-foreground)'}}>
                  {formatDate(analysis.created_at)}
                </span>
              </div>
              
              {/* Command */}
              <div className="mb-3">
                <p className="font-mono text-sm font-medium leading-tight" style={{color: 'var(--foreground)'}}>
                  {truncateCommand(analysis.command)}
                </p>
              </div>

              {/* Cmdlets detected */}
              {analysis.cmdlets_detected && Array.isArray(analysis.cmdlets_detected) && analysis.cmdlets_detected.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {analysis.cmdlets_detected.slice(0, 2).map((cmdlet, index) => {
                    const displayName = cmdlet.alias || 'Unknown';
                    const shortName = displayName.length > 10 ? displayName.substring(0, 10) + '...' : displayName;
                    
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
                      +{analysis.cmdlets_detected.length - 2}
                    </span>
                  )}
                </div>
              )}

              {/* Signatures detected */}
              {(analysis.signatures_detected || analysis.signatures) && Array.isArray(analysis.signatures_detected || analysis.signatures) && (analysis.signatures_detected || analysis.signatures).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(analysis.signatures_detected || analysis.signatures).slice(0, 1).map((sig, index) => {
                    let sigName = '';
                    if (typeof sig === 'object' && sig !== null) {
                      sigName = sig.name || sig.keyword || 'Unknown';
                    } else if (typeof sig === 'string') {
                      sigName = sig;
                    } else {
                      sigName = 'Unknown';
                    }
                    
                    const displayName = sigName.length > 12 ? sigName.substring(0, 12) + '...' : sigName;
                    
                    return (
                      <span
                        key={index}
                        className="px-2 py-1 rounded text-xs font-mono bg-red-900/30 text-red-400 border border-red-800"
                      >
                        {displayName}
                      </span>
                    );
                  })}
                  {(analysis.signatures_detected || analysis.signatures).length > 1 && (
                    <span className="px-2 py-1 rounded text-xs font-mono" style={{backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)'}}>
                      +{(analysis.signatures_detected || analysis.signatures).length - 1} more
                    </span>
                  )}
                </div>
              )}

              {/* Anonymous badge */}
              {!isAuthenticated() && analysis.is_anonymous && (
                <div className="mt-2 pt-2 border-t" style={{borderColor: 'var(--border-color)'}}>
                  <span className="px-2 py-1 rounded text-xs font-mono bg-blue-900/30 text-blue-400 border border-blue-800">
                    Anonymous Analysis
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer Actions */}
      {filteredAndSortedAnalyses.length > 0 && (
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <ThemedButton onClick={() => router.push('/')}>
            New Analysis
          </ThemedButton>
          {!isAuthenticated() && (
            <ThemedButton variant="outline" onClick={() => router.push('/register')}>
              Create Account to Save History
            </ThemedButton>
          )}
        </div>
      )}
    </div>
  );
}

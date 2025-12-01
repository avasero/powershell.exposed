// eslint-disable-line react-hooks/exhaustive-deps
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { getUserAnalyses, getDashboardStats } from "../../../utils/database";
import LoadingSpinner from "../components/LoadingSpinner";
import SeverityBadge from "../components/SeverityBadge";
import ThemedButton from "../components/ThemedButton";
import { ErrorMessage, InfoMessage } from "../components/Messages";

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const [analyses, setAnalyses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => { // eslint-disable-line react-hooks/exhaustive-deps
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    loadDashboardData();
  }, [isAuthenticated, router]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Para usuários logados, usar user_id diretamente
      if (isAuthenticated() && user?.id) {
        const { makeAuthenticatedRequest } = await import('../../lib/api');
        
        // Usar endpoint com limite de 10 para o dashboard
        const response = await makeAuthenticatedRequest(`/user/command-evaluations?limit=10&offset=0`, {
          method: 'GET'
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        // Processar dados do backend
        const analyses = result.analyses || [];
        setAnalyses(analyses);
        
        // Calcular stats localmente se não vierem do backend
        const stats = result.stats || {
          total_analyses: analyses.length,
          critical_count: analyses.filter(a => (a.risk_score || 0) >= 10).length,
          high_count: analyses.filter(a => (a.risk_score || 0) >= 8 && (a.risk_score || 0) < 10).length,
          medium_count: analyses.filter(a => (a.risk_score || 0) >= 5 && (a.risk_score || 0) < 8).length,
          avg_risk_score: analyses.length > 0 ? analyses.reduce((sum, a) => sum + (a.risk_score || 0), 0) / analyses.length : 0
        };
        setStats(stats);
        return;
      }
      
      // Para usuários anônimos, usar session_id do localStorage
      const { getCurrentSessionId } = await import('../../utils/session');
      const sessionId = getCurrentSessionId();
      
      if (!sessionId) {
        setAnalyses([]);
        return;
      }
      
      // Carregar apenas 10 análises mais recentes para o dashboard
      const { makeAuthenticatedRequest } = await import('../../lib/api');
      const response = await makeAuthenticatedRequest(`/user-analyses?limit=10`, {
        method: 'GET',
        headers: {
          'X-Session-ID': sessionId, // Enviar session_id no header
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Processar dados do backend
      const analyses = result.analyses || result || [];
      setAnalyses(analyses);
      
      // Calcular stats localmente se não vierem do backend
      const stats = result.stats || {
        total_analyses: analyses.length,
        critical_count: analyses.filter(a => (a.risk_score || 0) >= 10).length,
        high_count: analyses.filter(a => (a.risk_score || 0) >= 8 && (a.risk_score || 0) < 10).length,
        medium_count: analyses.filter(a => (a.risk_score || 0) >= 5 && (a.risk_score || 0) < 8).length,
        avg_risk_score: analyses.length > 0 ? analyses.reduce((sum, a) => sum + (a.risk_score || 0), 0) / analyses.length : 0
      };
      setStats(stats);
      
    } catch (err) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleViewAnalysis = (analysisId) => {
    router.push(`/analysis/${analysisId}`);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold mb-2" style={{color: 'var(--accent)'}}>
            Dashboard
          </h1>
          <p className="font-mono text-sm mb-4" style={{color: 'var(--muted-foreground)'}}>
            Your saved PowerShell analyses
          </p>
          
        
          <div className="flex gap-4">
            <ThemedButton 
              onClick={() => router.push('/')}
              className="px-6 py-2"
            >
              New Analysis
            </ThemedButton>
            
            <ThemedButton 
              variant="outline"
              onClick={() => router.push('/')}
              className="px-6 py-2"
              style={{
                borderColor: 'var(--accent)',
                color: 'var(--accent)'
              }}
            >
              Go to Home
            </ThemedButton>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}
        {message && <InfoMessage message={message} />}

     
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div 
              className="p-4 rounded-lg border text-center"
              style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}
            >
              <div className="text-2xl font-mono font-bold mb-1" style={{color: 'var(--accent)'}}>
                {stats.total_analyses || 0}
              </div>
              <div className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
                Total Analyses
              </div>
            </div>
            
            <div 
              className="p-4 rounded-lg border text-center"
              style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}
            >
              <div className="text-2xl font-mono font-bold mb-1 text-red-500">
                {stats.critical_count || 0}
              </div>
              <div className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
                Critical
              </div>
            </div>
            
            <div 
              className="p-4 rounded-lg border text-center"
              style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}
            >
              <div className="text-2xl font-mono font-bold mb-1 text-orange-500">
                {(stats.high_count || 0) + (stats.medium_count || 0)}
              </div>
              <div className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
                High/Medium
              </div>
            </div>
            
            <div 
              className="p-4 rounded-lg border text-center"
              style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}
            >
              <div className="text-2xl font-mono font-bold mb-1" style={{color: 'var(--accent)'}}>
                {(stats.avg_risk_score || 0).toFixed(1)}
              </div>
                          <div className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
              Avg Base Score
            </div>
            </div>
          </div>
        )}

        {analyses.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-mono text-lg mb-4" style={{color: 'var(--muted-foreground)'}}>
              No analysis found
            </p>
            <ThemedButton onClick={() => router.push('/')}>
              Run first analysis
            </ThemedButton>
          </div>
        ) : (
          <div className="grid gap-4">
            {analyses.map((analysis) => (
              <div 
                key={analysis.id}
                className="p-6 rounded-lg border" 
                style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-mono font-bold text-lg mb-2 break-all" style={{color: 'var(--foreground)'}}>
                      <code>{analysis.command.length > 100 ? analysis.command.substring(0, 100) + '...' : analysis.command}</code>
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      <SeverityBadge score={analysis.risk_score || 0} />
                      <span className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
                        Base Score: {analysis.risk_score || 0}/10
                      </span>
                    </div>
                    <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
                      {new Date(analysis.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <ThemedButton
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewAnalysis(analysis.id)}
                    >
                      View Analysis
                    </ThemedButton>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <h3 className="font-mono text-sm font-semibold mb-1" style={{color: 'var(--foreground)'}}>
                      Comando:
                    </h3>
                    <code 
                      className="block p-3 rounded text-xs break-all font-mono"
                      style={{backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)'}}
                    >
                      {analysis.command}
                    </code>
                  </div>
                  
                  {analysis.decoded_command && (
                    <div>
                      <h3 className="font-mono text-sm font-semibold mb-1" style={{color: 'var(--foreground)'}}>
                        Comando Decodificado:
                      </h3>
                      <code 
                        className="block p-3 rounded text-xs break-all font-mono"
                        style={{backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)'}}
                      >
                        {analysis.decoded_command}
                      </code>
                    </div>
                  )}
                  
                  {analysis.cmdlets_detected && analysis.cmdlets_detected.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-mono text-sm font-semibold mb-2" style={{color: 'var(--foreground)'}}>
                        Cmdlets PowerShell:
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {analysis.cmdlets_detected.slice(0, 3).map((cmdlet, index) => (
                          <span 
                            key={index}
                            className="px-2 py-1 rounded text-xs font-mono bg-green-900/30 text-green-400 border border-green-800"
                            title={`${cmdlet.alias} → ${cmdlet.cmdlet_name}`}
                          >
                            {cmdlet.alias}
                          </span>
                        ))}
                        {analysis.cmdlets_detected.length > 3 && (
                          <span 
                            className="px-2 py-1 rounded text-xs font-mono"
                            style={{color: 'var(--muted-foreground)'}}
                          >
                            +{analysis.cmdlets_detected.length - 3} mais
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                
                  {analysis.ip_address && (
                    <div className="mb-4">
                      <h3 className="font-mono text-sm font-semibold mb-2" style={{color: 'var(--foreground)'}}>
                        IP Address & Location:
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <span 
                          className="px-2 py-1 rounded text-xs font-mono bg-gray-900/30 text-gray-400 border border-gray-800"
                          title={`Analysis performed from IP: ${analysis.ip_address}`}
                        >
                          🌐 {analysis.ip_address}
                        </span>
                        
                       
                        {analysis.ip_country && (
                          <span 
                            className="px-2 py-1 rounded text-xs font-mono bg-green-900/30 text-green-400 border border-green-800"
                            title={`Country: ${analysis.ip_country}`}
                          >
                            🏳️ {analysis.ip_country}
                          </span>
                        )}
                        
                        {analysis.ip_city && (
                          <span 
                            className="px-2 py-1 rounded text-xs font-mono bg-green-900/30 text-green-400 border border-green-800"
                            title={`City: ${analysis.ip_city}`}
                          >
                            🏙️ {analysis.ip_city}
                          </span>
                        )}
                        
                        {analysis.ip_region && (
                          <span 
                            className="px-2 py-1 rounded text-xs font-mono bg-purple-900/30 text-purple-400 border border-purple-800"
                            title={`Region: ${analysis.ip_region}`}
                          >
                            🗺️ {analysis.ip_region}
                          </span>
                        )}
                        
                        {analysis.ip_timezone && (
                          <span 
                            className="px-2 py-1 rounded text-xs font-mono bg-orange-900/30 text-orange-400 border border-orange-800"
                            title={`Timezone: ${analysis.ip_timezone}`}
                          >
                            🕐 {analysis.ip_timezone}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
               
                  {analysis.search_type && (
                    <div className="mb-4">
                      <h3 className="font-mono text-sm font-semibold mb-2" style={{color: 'var(--foreground)'}}>
                        Search Type:
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <span 
                          className="px-2 py-1 rounded text-xs font-mono bg-indigo-900/30 text-indigo-400 border border-indigo-800"
                          title={`Search performed via: ${analysis.search_type}`}
                        >
                          🔍 {analysis.search_type}
                        </span>
                      </div>
                    </div>
                  )}
                  
                
                  {analysis.user_agent && (
                    <div className="mb-4">
                      <h3 className="font-mono text-sm font-semibold mb-2" style={{color: 'var(--foreground)'}}>
                        Browser Information:
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <span 
                          className="px-2 py-1 rounded text-xs font-mono bg-pink-900/30 text-pink-400 border border-pink-800"
                          title={`Browser: ${analysis.user_agent}`}
                        >
                          🌐 {analysis.user_agent.length > 50 ? analysis.user_agent.substring(0, 50) + '...' : analysis.user_agent}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {analysis.signatures_detected && analysis.signatures_detected.length > 0 && (
                    <div>
                      <h3 className="font-mono text-sm font-semibold mb-2" style={{color: 'var(--foreground)'}}>
                        Detected Indicators:
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {analysis.signatures_detected.slice(0, 5).map((sig, index) => (
                          <span 
                            key={index}
                            className="px-2 py-1 rounded text-xs font-mono"
                            style={{
                              backgroundColor: 'var(--accent)',
                              color: 'var(--accent-foreground)'
                            }}
                          >
                            {sig.name || sig}
                          </span>
                        ))}
                        {analysis.signatures_detected.length > 5 && (
                          <span 
                            className="px-2 py-1 rounded text-xs font-mono"
                            style={{color: 'var(--muted-foreground)'}}
                          >
                            +{analysis.signatures_detected.length - 5} mais
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
